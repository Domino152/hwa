export interface ResultRecord {
  subject: string;
  marksObtained: number;
  totalMarks: number;
  grade: string;
  percentage: number;
  examType: "internal" | "external" | "assignment";
}

export interface ResultSummary {
  results: ResultRecord[];
  cgpa: number;
  totalSubjects: number;
  hasData: boolean;
}

export interface ResultFormData {
  results: Array<{ subject: string; marksObtained: number; totalMarks: number }>;
  semester: number;
  academicYear: string;
  examType: "internal" | "external" | "assignment";
}
