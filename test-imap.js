const imaps = require('imap-simple');
const MailComposer = require('nodemailer/lib/mail-composer');

async function test() {
  console.log('Testing MailComposer & IMAP require...');
  if (imaps && MailComposer) console.log('OK');
}

test();
