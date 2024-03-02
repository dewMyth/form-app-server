import { HttpStatus } from '@nestjs/common';

/* eslint-disable prettier/prettier */
export interface CreateRecordResponse {
  status: HttpStatus;
  message: string;
}
