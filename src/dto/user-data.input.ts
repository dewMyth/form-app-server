/* eslint-disable prettier/prettier */
import { IsEmail, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateUserDataInputDto {
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsEmail()
  @IsNotEmpty()
  readonly email: string;

  @IsOptional()
  readonly paymentImage: any;
}

export class UpdateUserDataInputDto {
  @IsEmail()
  @IsNotEmpty()
  readonly email: string;

  @IsString()
  @IsOptional()
  readonly name: string;

  @IsOptional()
  readonly paymentImage: any;
}
