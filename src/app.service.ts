/* eslint-disable prettier/prettier */
import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { htmlTemplate } from './email.template';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserData, UserDataDocument } from './schema/user-data.schema';
import {
  CreateUserDataInputDto,
  UpdateUserDataInputDto,
} from './dto/user-data.input';
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

  // Create Record
  async createRecord(
    userData: CreateUserDataInputDto,
    paymentImage: Express.Multer.File,
  ) {
    // Check whether the userdata already exists with the user email
    const isUserExist = await this.userDataModel.findOne({
      email: userData.email,
    });

    if (isUserExist) {
      Logger.log(`User already exist : ${userData.email}`);
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: `User already exist : ${userData.email}`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

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

    let paymentVerificationResourceUrl;

    if (paymentImage) {
      Logger.log(
        `Found user uploaded file : Starting the upload of the payment verification for : ${userData.email}`,
      );

      // Set timestamp for unique filename
      const timestamp = new Date().toISOString().replace(/\.[0-9]{3}Z/, '');
      const fullNameWithNoSpace = userData.name.replace(' ', '_');
      const fileNamePrefix = fullNameWithNoSpace + ' - ' + timestamp;

      Logger.log(
        `Generated filename prefix : ${fileNamePrefix} to the user : ${userData.email}`,
      );

      paymentVerificationResourceUrl = await this.uploadFile(
        paymentImage,
        fileNamePrefix,
      ).catch((err) => {
        throw new HttpException(
          {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: `${err.message}`,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      });
    }

    if (!paymentVerificationResourceUrl) {
      Logger.warn(
        `Unable to generate the public url for the uploaded image starts with : : ${userData.email}`,
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
        throw new HttpException(
          {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: `${err.message}`,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
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

    if (paymentVerificationResourceUrl && isMailSent) {
      return {
        status: HttpStatus.CREATED,
        message: `User created successfully! For : ${savedDocument.email}`,
      };
    } else {
      if (!paymentVerificationResourceUrl) {
        return {
          status: HttpStatus.OK,
          message: `User created, but Payment Verification failed ! For : ${savedDocument.email}`,
        };
      }
      if (!isMailSent) {
        return {
          status: HttpStatus.OK,
          messamessagesge: `User created, but isMailSent : ${isMailSent} ! For : ${savedDocument.email}`,
        };
      }
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

  async updateRecord(
    userEmail,
    updatedUserData: UpdateUserDataInputDto,
    paymentImage: Express.Multer.File,
  ) {
    let paymentVerificationResourceUrl;
    let latestRecord;

    Logger.log(`Start updating user data for user : ${userEmail}`);

    // Find existing Record by email
    const existingRecord = await this.userDataModel
      .findOne({
        email: userEmail,
      })
      .catch((err) => {
        Logger.error(
          `Unable to find a user with ${userEmail}. Reason : ${err.message}`,
        );
        throw new InternalServerErrorException();
      });

    // Construct updated object
    if (existingRecord) {
      Logger.log(
        `Found the record for : ${userEmail} that need to be updated!`,
      );

      if (paymentImage) {
        Logger.log(
          `Found the payment image upload change for the : ${userEmail}. Processing file upload...`,
        );

        // Set timestamp for unique filename
        const timestamp = new Date().toISOString().replace(/\.[0-9]{3}Z/, '');
        const userName = updatedUserData.name
          ? updatedUserData.name
          : existingRecord.name;
        const fullNameWithNoSpace = userName.replace(' ', '_');
        const fileNamePrefix = fullNameWithNoSpace + ' - ' + timestamp;

        paymentVerificationResourceUrl = await this.uploadFile(
          paymentImage,
          fileNamePrefix,
        );
      }

      if (paymentImage && paymentVerificationResourceUrl) {
        Logger.log(`Payment Image upload Successful for the : ${userEmail}.`);

        latestRecord = {
          ...updatedUserData,
          paymentVerificationUrl: paymentVerificationResourceUrl,
          updatedAt: new Date(),
        };
      } else {
        latestRecord = {
          ...updatedUserData,
          updatedAt: new Date(),
        };
      }
    }

    Logger.log(
      `The following userdata will be updated on user : ${userEmail}. Data =>  ${JSON.stringify(
        latestRecord,
      )}`,
    );

    // Save to database
    const updateResponse = await this.userDataModel.updateOne(latestRecord);

    if (updateResponse.modifiedCount) {
      Logger.log(`Updating the data is successfull for : ${userEmail}.`);

      return {
        status: HttpStatus.CREATED,
        message: `User data for user : ${userEmail} is updated Successfully!`,
      };
    }
  }

  async viewAllRecords(): Promise<UserData[]> {
    Logger.log(`Start getting all records...`);
    const response = await this.userDataModel.find().catch((err) => {
      Logger.log(`Failed to fetch`);
      throw new InternalServerErrorException(err);
    });

    if (response) {
      Logger.log(
        `Successfully fetched ${response.length} records from the database`,
      );
      return response;
    }
  }
}
