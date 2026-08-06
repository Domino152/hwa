import type { ResultRecord } from './types.js';

export interface IResultRepository {
  findStudentResults(studentId: string): Promise<ResultRecord[]>;
}
