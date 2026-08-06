import type { FeeRecord } from './types.js';

export interface IFeeRepository {
  findLatestFeeByStudentId(studentId: string): Promise<FeeRecord | null>;
}
