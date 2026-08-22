export interface FeeRecord {
  id: string;
  registerNumber: string;
  tuitionFee: number;
  hostelFee: number;
  totalFee: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  status: "paid" | "partial" | "pending";
  academicYear: string;
}

export interface FeeFormData {
  tuitionFee: number;
  hostelFee: number;
  paidAmount: number;
  dueDate: string;
  academicYear: string;
}
