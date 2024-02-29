/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { htmlTemplate } from './email.template';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserData, UserDataDocument } from './schema/user-data.schema';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodemailer = require('nodemailer');

@Injectable()
export class AppService {
  constructor(
    @InjectModel(UserData.name) private userDataModel: Model<UserDataDocument>,
  ) {}

  async createRecord() {
    const userData = {
      name: 'John Doe',
      email: 'akalankadewmith@gmail.com',
    };

    // Step 1 - Generate UserId
    // Sub Step 1 - Find the last created document
    const lastCreatedUserData = await this.userDataModel
      .findOne()
      .sort({ createdAt: -1 })
      .limit(1);

    const currentId = lastCreatedUserData ? lastCreatedUserData?.userId + 1 : 1;

    // Step 2 - Save the record in db
    const newUserData = {
      ...userData,
      userId: currentId,
    };
    const savedDocument = await this.userDataModel.create({
      ...newUserData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { email } = savedDocument;

    // Step 3 - If record saved, send the mail
    const isMailSent = await this.sendEmail(email, savedDocument);

    Logger.debug(
      `Email sent to ${userData.email} with ${currentId} is ${isMailSent}`,
    );

    if (isMailSent) {
      await this.userDataModel.findByIdAndUpdate(savedDocument._id, {
        isMailSent: true,
        updatedAt: new Date(),
      });
    } else {
      throw new Error(`Unable to send the email`);
    }

    // Step 4 - Check whether the email has been sent

    // Step 5 - If so update the isMailSent in db
  }

  // Send Email to the enterd User Email
  async sendEmail(email: string, userData: any) {
    const { userId } = userData;

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
