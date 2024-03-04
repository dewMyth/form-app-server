/* eslint-disable prettier/prettier */
import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import {
  CreateUserDataInputDto,
  UpdateUserDataInputDto,
} from './dto/user-data.input';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateRecordResponse } from './types/CreateRecordResponse.type';
import { UserData } from './schema/user-data.schema';

@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('submit')
  @UseInterceptors(FileInterceptor('paymentImage'))
  createRecord(
    @Body() userData: CreateUserDataInputDto,
    @UploadedFile() paymentImage: Express.Multer.File,
  ): CreateRecordResponse | any {
    return this.appService.createRecord(userData, paymentImage);
  }

  @Post('update')
  @UseInterceptors(FileInterceptor('paymentImage'))
  updateRecord(
    @Body() userData: UpdateUserDataInputDto,
    @UploadedFile() paymentImage: Express.Multer.File,
  ): CreateRecordResponse | any {
    const { email } = userData;
    return this.appService.updateRecord(email, userData, paymentImage);
  }

  @Get('view-all')
  viewAllRecords(): UserData[] | any {
    return this.appService.viewAllRecords();
  }
}
