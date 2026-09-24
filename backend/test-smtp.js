import nodemailer from 'nodemailer';

async function createTestAccount() {
  const testAccount = await nodemailer.createTestAccount();
  console.log(JSON.stringify(testAccount));
}

createTestAccount();
