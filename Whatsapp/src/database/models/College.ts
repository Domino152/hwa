import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface ICollege extends Document {
  name: string;
  code: string;
  whatsappEnabled: boolean;
  address: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  contact: {
    phone?: string;
    email?: string;
    website?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ICollegeModel extends Model<ICollege> {
  findByCode(code: string): Promise<ICollege | null>;
}

const collegeSchema = new Schema<ICollege, ICollegeModel>(
  {
    name: {
      type: String,
      required: [true, 'College name is required'],
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    code: {
      type: String,
      required: [true, 'College code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [20, 'Code cannot exceed 20 characters'],
    },
    whatsappEnabled: {
      type: Boolean,
      default: true,
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
    },
    contact: {
      phone: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      website: { type: String, trim: true },
    },
  },
  { timestamps: true },
);

collegeSchema.statics.findByCode = function (code: string) {
  return this.findOne({ code: code.toUpperCase() }).exec();
};

export const College = mongoose.model<ICollege, ICollegeModel>('College', collegeSchema);
