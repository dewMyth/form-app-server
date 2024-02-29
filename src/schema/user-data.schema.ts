/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDataDocument = UserData & Document;

@Schema()
export class UserData {
  @Prop()
  name: string;

  @Prop()
  email: string;

  @Prop()
  userId: number;

  @Prop({ default: false })
  isMailSent: boolean;

  @Prop({ default: new Date() })
  createdAt: Date;

  @Prop({ default: new Date() })
  updatedAt: Date;
}

export const UserDataSchema = SchemaFactory.createForClass(UserData);
