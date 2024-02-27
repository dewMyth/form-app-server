import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(testData): any {
    const output = testData;
    return output;
  }
}
