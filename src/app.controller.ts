/* eslint-disable prettier/prettier */
import { Body, Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('test-controller')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("test")
  getHello(@Body() testData: any): any {
    return this.appService.getHello(testData);
  }
}
