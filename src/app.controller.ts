/* eslint-disable prettier/prettier */
import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import { UserDataInputDto } from './dto/user-data.input';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('submit')
  @UseInterceptors(FileInterceptor('paymentImage'))
  createRecord(
    @Body() userData: UserDataInputDto,
    @UploadedFile() paymentImage: Express.Multer.File,
  ) {
    return this.appService.createRecord(userData, paymentImage);
  }
}
