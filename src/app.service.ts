/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { Logger } from '@nestjs/common';
import { htmlTemplate } from './email.template';
const nodemailer = require('nodemailer');

@Injectable()
export class AppService {
  saveJsonToSheet = async (jsonData) => {
    // Initialize the Sheets API client
    const sheets = google.sheets({ version: 'v4' });

    const SHEET_NAME = 'Sheet1';

    // Authenticate using the service account key
    const auth = new google.auth.JWT({
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      keyFile: 'gsheet-credentials.json',
    });
    const response = await auth.authorize();
    console.log('Auth', response);

    // Convert JSON data to an array of rows
    const rows = [];
    for (const [key, value] of Object.entries(jsonData)) {
      rows.push([key, value]);
    }
    console.log(rows);

    // Append data to the sheet
    await sheets.spreadsheets.values
      .append({
        spreadsheetId: '1hnT44Vfah4CIqGi-cMhomALW1OhAjOu-L2AIoDcaLUM',
        range: `${SHEET_NAME}!A2:Z`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: rows,
          range: `${SHEET_NAME}!A2:Z`,
        },
        access_token: response.access_token,
      })
      .catch((err) => {
        throw err;
      });

    console.log('Data saved successfully!');
  };

  private tempDb = [];

  async createRecord() {
    const userData = {
      name: 'John Doe',
      email: 'akalankadewmith@gmail.com',
    };

    // Step 1 - Generate UserId
    const currentId = this.tempDb.length + 1;

    // Step 2 - Save the record in db
    this.tempDb.push({
      ...userData,
      userId: currentId,
    });

    console.log(this.tempDb);

    // Step 3 - If record saved, send the mail
    const isMailSent = await this.sendEmail(
      userData.email,
      this.tempDb[this.tempDb.length - 1],
    );

    Logger.debug(
      `Email sent to ${userData.email} with ${currentId} is ${isMailSent}`,
    );

    // Step 4 - Check whether the email has been sent

    // Step 5 - If so update the isMailSent in db

    // this.saveJsonToSheet(jsonData)
    //   .then(() => console.log('Done!'))
    //   .catch((error) => console.error(error));
  }

  // Send Email to the enterd User Email
  async sendEmail(email: string, userData: any) {
    const { userId } = userData;
    let response;

    Logger.log(`Start sending email to : ${email} with ticket id : ${userId}`);

    // Create the mail sending host
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_TRANSPORT_USER,
        pass: process.env.EMAIL_TRANSPORT_PASSWORD, // App Password created from Google Account -> Security -> App Passwords
      },
    });

    // Construct the email
    return new Promise((resolve, reject) => {
      transporter.sendMail(
        {
          to: `${email}`, // list of receivers
          subject: `Congratulations! Your ticket # is ${userId}`, // Subject line
          html: htmlTemplate(userId), // html body
        },
        (err, info) => {
          if (err) {
            Logger.error(
              `Email Sending failed to ${email} with ticket # ${userId} `,
              err,
            );
            reject(false);
          } else {
            Logger.verbose('Message sent: %s', info.messageId);
            resolve(true);
          }
        },
      );
    });
  }
}
