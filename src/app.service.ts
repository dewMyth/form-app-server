/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { htmlTemplate } from './email.template';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserData, UserDataDocument } from './schema/user-data.schema';
import { UserDataInputDto } from './dto/user-data.input';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodemailer = require('nodemailer');
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class AppService {
  constructor(
    @InjectModel(UserData.name) private userDataModel: Model<UserDataDocument>,
  ) {}

  // Create Supabase client
  supabase = createClient(
    process.env.SUPABASE_PROJECT_URL,
    process.env.SUPABASE_API_KEY,
  );

  async createRecord(
    userData: UserDataInputDto,
    paymentImage: Express.Multer.File,
  ) {
    Logger.log(`Start creating record for the ${userData.name}`);

    // Step 1 - Generate UserId
    // Sub Step  1 - Find the last created document
    const lastCreatedUserData = await this.userDataModel
      .findOne()
      .sort({ createdAt: -1 })
      .limit(1);

    const currentId = lastCreatedUserData ? lastCreatedUserData?.userId + 1 : 1;
    Logger.log(
      `Assigning ticket # ${currentId} to the user : ${userData.email}`,
    );

    // Step 2 - Save the image in cloud and generate url
    // Set timestamp for unique filename
    const timestamp = new Date().toISOString().replace(/\.[0-9]{3}Z/, '');
    const fullNameWithNoSpace = userData.name.replace(' ', '_');
    const fileNamePrefix = fullNameWithNoSpace + ' - ' + timestamp;

    Logger.log(
      `Generated filename prefix : ${fileNamePrefix} to the user : ${userData.email}`,
    );

    const paymentVerificationResourceUrl = await this.uploadFile(
      paymentImage,
      fileNamePrefix,
    );

    if (!paymentVerificationResourceUrl) {
      Logger.warn(
        `Unable to generate the public url for the uploaded image starts with : ${fileNamePrefix}`,
      );
    }
    // Step 3 - Save the record in db
    const newUserData = {
      ...userData,
      paymentVerificationUrl: paymentVerificationResourceUrl
        ? paymentVerificationResourceUrl
        : '',
      userId: currentId,
    };

    Logger.log(
      `Started to save the userdata in database for the the user : ${userData.email}`,
    );
    const savedDocument = await this.userDataModel
      .create({
        ...newUserData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .catch((err) => {
        Logger.error(
          `Unable to save the record in database. Reason : ${err.message}`,
        );
        throw err;
      });

    const { email } = savedDocument;

    // Step 4 - Check whether the email has been sent, If so update the isMailSent in db
    const isMailSent = await this.sendEmail(email, savedDocument);

    Logger.debug(
      `Email sent to ${userData.email} with ${currentId} is ${isMailSent}`,
    );

    if (isMailSent) {
      await this.userDataModel
        .findByIdAndUpdate(savedDocument._id, {
          isMailSent: true,
          updatedAt: new Date(),
        })
        .catch((err) => {
          Logger.error(
            `Unable to update the record with isMailSent : ${isMailSent} in database. Reason : ${err.message}`,
          );
          throw err;
        });
    } else {
      throw new Error(`Unable to send the email`);
    }
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

  // Upload image to Supabase
  async uploadFile(file: Express.Multer.File, fileNamePrefix) {
    Logger.log(`Start uploading the file starts with : ${fileNamePrefix}`);

    const { data, error } = await this.supabase.storage
      .from(process.env.SUPABASE_BUCKET_NAME)
      .upload(`${fileNamePrefix + ' - ' + file.originalname}`, file.buffer, {
        contentType: file.mimetype,
      });
    if (error) {
      Logger.error(`Unable to upload the image ${JSON.stringify(error)}`);
    } else {
      // Get the publicUrl for the uploaded image
      const publicUrl = await this.getPublicUrl(data);
      Logger.log(
        `File Uploaded successfully : ${
          fileNamePrefix + ' - ' + file.originalname
        }`,
      );

      return publicUrl;
    }
  }

  // Generate the public url for the uploaded file to Supabase
  async getPublicUrl(uploadedResponse) {
    Logger.log(
      `Start getting the public url for the uploaded file ${uploadedResponse.path}`,
    );

    return new Promise((resolve, reject) => {
      try {
        const response = this.supabase.storage
          .from(process.env.SUPABASE_BUCKET_NAME)
          .getPublicUrl(`${uploadedResponse.path}`);

        Logger.log(
          `Successfully generated the public url for the uploaded file ${uploadedResponse.path}`,
        );

        resolve(response.data.publicUrl);
      } catch (error) {
        reject(error);
      }
    });
  }
}
