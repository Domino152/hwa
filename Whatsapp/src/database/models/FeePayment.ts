import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export type FeeStatus = 'pending' | 'partial' | 'paid' | 'overdue';
export type InstallmentStatus = 'upcoming' | 'due' | 'overdue' | 'paid' | 'partial';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentMethod = 'cash' | 'card' | 'upi' | 'netbanking' | 'cheque' | 'dd' | 'online';
export type FineStatus = 'pending' | 'paid' | 'partial' | 'waived';
export type ScholarshipStatus = 'active' | 'expired' | 'revoked';
export type ScholarshipType = 'merit' | 'need_based' | 'sports' | 'government' | 'institutional' | 'other';

export interface IInstallment {
  installmentNumber: number;
  amount: number;
  dueDate: Date;
  paidAmount: number;
  remainingAmount: number;
  status: InstallmentStatus;
  paidDate: Date | null;
  lateFine: number;
}

export interface IPaymentTransaction {
  receiptNumber: string;
  amount: number;
  method: PaymentMethod;
  transactionId: string | null;
  status: PaymentStatus;
  paidAt: Date;
  collectedBy: string | null;
  remarks: string | null;
}

export interface IFine {
  reason: string;
  description: string;
  amount: number;
  waivedAmount: number;
  netAmount: number;
  paidAmount: number;
  status: FineStatus;
  dueDate: Date;
  paidDate: Date | null;
  imposedBy: string | null;
  waivedBy: string | null;
  waiverReason: string | null;
}

export interface IScholarship {
  name: string;
  type: ScholarshipType;
  amount: number;
  percentage: number | null;
  provider: string;
  validFrom: Date;
  validUntil: Date;
  status: ScholarshipStatus;
  appliedAmount: number;
  approvedBy: string | null;
}

export interface IFeePayment extends Document {
  studentId: string;
  studentName: string;
  feeStructureId: Types.ObjectId;
  feeCode: string;
  feeName: string;
  category: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: FeeStatus;
  semester: number;
  academicYear: string;
  installments: IInstallment[];
  payments: IPaymentTransaction[];
  fines: IFine[];
  scholarships: IScholarship[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IFeePaymentModel extends Model<IFeePayment> {
  findByStudentAndSemester(studentId: string, semester: number, academicYear: string): Promise<IFeePayment[]>;
  findByStudentAndFee(studentId: string, feeStructureId: string): Promise<IFeePayment | null>;
  addInstallment(feePaymentId: string, installment: IInstallment): Promise<IFeePayment>;
  addPayment(feePaymentId: string, payment: IPaymentTransaction): Promise<IFeePayment>;
  addFine(feePaymentId: string, fine: IFine): Promise<IFeePayment>;
  addScholarship(feePaymentIdId: string, scholarship: IScholarship): Promise<IFeePayment>;
  getPaymentSummary(studentId: string, semester: number, academicYear: string): Promise<{ totalDue: number; totalPaid: number; totalPending: number }>;
}

const installmentSchema = new Schema<IInstallment>(
  {
    installmentNumber: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true },
    paidAmount: { type: Number, default: 0, min: 0 },
    remainingAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['upcoming', 'due', 'overdue', 'paid', 'partial'],
      default: 'upcoming',
    },
    paidDate: { type: Date, default: null },
    lateFine: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const paymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    receiptNumber: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    method: {
      type: String,
      enum: ['cash', 'card', 'upi', 'netbanking', 'cheque', 'dd', 'online'],
      required: true,
    },
    transactionId: { type: String, default: null },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'completed',
    },
    paidAt: { type: Date, required: true },
    collectedBy: { type: String, default: null },
    remarks: { type: String, default: null },
  },
  { _id: false },
);

const fineSchema = new Schema<IFine>(
  {
    reason: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    waivedAmount: { type: Number, default: 0, min: 0 },
    netAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'paid', 'partial', 'waived'],
      default: 'pending',
    },
    dueDate: { type: Date, required: true },
    paidDate: { type: Date, default: null },
    imposedBy: { type: String, default: null },
    waivedBy: { type: String, default: null },
    waiverReason: { type: String, default: null },
  },
  { _id: false },
);

const scholarshipSchema = new Schema<IScholarship>(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['merit', 'need_based', 'sports', 'government', 'institutional', 'other'],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    percentage: { type: Number, default: null, min: 0, max: 100 },
    provider: { type: String, required: true, trim: true },
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    status: {
      type: String,
      enum: ['active', 'expired', 'revoked'],
      default: 'active',
    },
    appliedAmount: { type: Number, default: 0, min: 0 },
    approvedBy: { type: String, default: null },
  },
  { _id: false },
);

const feePaymentSchema = new Schema<IFeePayment, IFeePaymentModel>(
  {
    studentId: {
      type: String,
      required: [true, 'Student ID is required'],
    },
    studentName: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
    },
    feeStructureId: {
      type: Schema.Types.ObjectId,
      ref: 'FeeStructure',
      required: [true, 'Fee structure ID is required'],
    },
    feeCode: {
      type: String,
      required: [true, 'Fee code is required'],
      trim: true,
    },
    feeName: {
      type: String,
      required: [true, 'Fee name is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative'],
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, 'Paid amount cannot be negative'],
    },
    remainingAmount: {
      type: Number,
      required: [true, 'Remaining amount is required'],
      min: [0, 'Remaining amount cannot be negative'],
    },
    status: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'overdue'],
      default: 'pending',
      index: true,
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      min: [1, 'Semester must be at least 1'],
      max: [12, 'Semester cannot exceed 12'],
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      trim: true,
    },
    installments: [installmentSchema],
    payments: [paymentTransactionSchema],
    fines: [fineSchema],
    scholarships: [scholarshipSchema],
  },
  { timestamps: true },
);

feePaymentSchema.index({ studentId: 1, semester: 1, academicYear: 1 });
feePaymentSchema.index({ studentId: 1, feeStructureId: 1 });
feePaymentSchema.index({ status: 1, academicYear: 1 });
feePaymentSchema.index({ 'installments.status': 1, 'installments.dueDate': 1 });

feePaymentSchema.statics.findByStudentAndSemester = function (studentId: string, semester: number, academicYear: string) {
  return this.find({ studentId, semester, academicYear }).sort({ feeCode: 1 }).exec();
};

feePaymentSchema.statics.findByStudentAndFee = function (studentId: string, feeStructureId: string) {
  return this.findOne({ studentId, feeStructureId }).exec();
};

feePaymentSchema.statics.addInstallment = async function (feePaymentId: string, installment: IInstallment) {
  return this.findByIdAndUpdate(
    feePaymentId,
    { $push: { installments: installment } },
    { new: true },
  ).exec();
};

feePaymentSchema.statics.addPayment = async function (feePaymentId: string, payment: IPaymentTransaction) {
  return this.findByIdAndUpdate(
    feePaymentId,
    { $push: { payments: payment } },
    { new: true },
  ).exec();
};

feePaymentSchema.statics.addFine = async function (feePaymentId: string, fine: IFine) {
  return this.findByIdAndUpdate(
    feePaymentId,
    { $push: { fines: fine } },
    { new: true },
  ).exec();
};

feePaymentSchema.statics.addScholarship = async function (feePaymentId: string, scholarship: IScholarship) {
  return this.findByIdAndUpdate(
    feePaymentId,
    { $push: { scholarships: scholarship } },
    { new: true },
  ).exec();
};

feePaymentSchema.statics.getPaymentSummary = async function (
  studentId: string,
  semester: number,
  academicYear: string,
) {
  const result = await this.aggregate([
    { $match: { studentId, semester, academicYear } },
    {
      $group: {
        _id: null,
        totalDue: { $sum: '$totalAmount' },
        totalPaid: { $sum: '$paidAmount' },
        totalPending: { $sum: '$remainingAmount' },
      },
    },
    {
      $project: {
        _id: 0,
        totalDue: 1,
        totalPaid: 1,
        totalPending: 1,
      },
    },
  ]);

  return result[0] || { totalDue: 0, totalPaid: 0, totalPending: 0 };
};

export const FeePayment = mongoose.model<IFeePayment, IFeePaymentModel>('FeePayment', feePaymentSchema);
