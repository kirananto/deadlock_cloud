const functions = require('firebase-functions')
const admin = require('firebase-admin')
admin.initializeApp(functions.config().firebase)
const Excel = require('exceljs')

const nodemailer = require('nodemailer')
const Datauri = require('datauri')
const CryptoJS = require("crypto-js")
const firestore = admin.firestore()
const gmailEmail = 'kirananto@gmail.com';
var bytes  = CryptoJS.AES.decrypt(ciphertext, 'password');
var gmailPassword = bytes.toString(CryptoJS.enc.Utf8);
const mailTransport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailEmail,
    pass: gmailPassword
  }
})
const mailOptions = {
  from: '"Techkshetra" <kirananto@gmail.com>',
  subject: 'Deadlock Database',
  to:  'kirananto@gmail.com,kirananto@hotmail.com'
}
exports.correctAnswer = functions.firestore
  .document('users/{userId}')
  .onUpdate(event => {

    var newValue = event.data.data()
    var newCurrentHash = newValue.currentHash
    var newPreviousHash = newValue.previousHash
    var previousValue = event.data.previous.data()
    var oldCurrentHash = previousValue.currentHash
    var oldPreviousHash = previousValue.previousHash

    if (newPreviousHash === oldCurrentHash) {
      var questionData = firestore.doc(`q/questions/${newCurrentHash}/${newPreviousHash}`).get()
      .then(doc => {
        return firestore.doc(`leaderboard/${event.data.id}`).set({
          college: newValue.college,
          currentLevel: doc.data().level,
          displayName: newValue.displayName,
          timestamp: Date.now()
        })
      }).catch(err => {
        console.log('Error getting document', err)
        return
       })
    } else {
      // He is a hacker.. delete and ban his account
      var hacker = firestore.doc(`hackers/${event.data.id}`).set(event.data.data()).then(doc => {
          var batch = firestore.batch()
          batch.delete(firestore.doc(`leaderboard/${event.data.id}`))
          batch.delete(firestore.doc(`users/${event.data.id}`))
          return batch.commit().then(success => {
            console.log('Hacker Found')
          })
      })
      //console.log('he is a hacker')
      return
    }
});

exports.export = functions.firestore.document('export/db').onWrite(event => {
  mailOptions.subject = 'DEADLOCK DB'
  mailOptions.html = '<h1> Complete DB</h1>'
  mailOptions.attachments = []
  var workbook = new Excel.Workbook()
  workbook.creator = 'Kiran Anto'
  workbook.created = new Date()
  workbook.modified = new Date()
  workbook.views = [
     {
       x: 0, y: 0, width: 100, height: 100,
       firstSheet: 0, activeTab: 1, visibility: 'visible'
     }
  ]
  var sheet = workbook.addWorksheet('DETAILS')
  sheet.addRow(['Name', 'Email', 'MobileNo', 'College', 'Photo', 'Level'])
  sheet.getRow(1).font = { bold: true}
  return firestore.collection('users').get().then(querySnapshot => {
    querySnapshot.forEach(doc => {
      sheet.addRow([doc.displayName,doc.email,doc.mobno,doc.college,doc.photoURL,doc.currentLevel])
    })
    console.log(sheet.rowCount)
    workbook.xlsx.writeBuffer({
      base64: true
    }).then(buffer => {
      datauri.format('.xlsx', buffer)
      mailOptions.attachments.push({
        path: datauri.content,
        filename: 'Deadlock Db'
      })
      mailTransport.sendMail(mailOptions)
        .then(() => console.log(`Db Details`))
        .catch(error => console.error('There was an error while sending the email:', error))
    }).catch(err => console.error('workbook creation error'))
  }).catch(err => console.log(err))
})
