import mongoose, { Schema, type Document } from 'mongoose';

export interface ICollege extends Document {
  name: string;
  code: string;
  whatsappEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const collegeSchema = new Schema<ICollege>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    whatsappEnabled: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const College = mongoose.model<ICollege>('College', collegeSchema);
