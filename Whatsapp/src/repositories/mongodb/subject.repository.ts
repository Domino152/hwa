import { Subject } from '../../database/models/Subject.js';
import { Schedule } from '../../database/models/Schedule.js';
import { Result } from '../../database/models/Result.js';
import type { ISubjectRepository, SubjectWithSchedule, SubjectWithResults } from '../subject.repository.js';
import type { SubjectRecord } from '../types.js';

function toRecord(doc: { _id: unknown; code: string; name: string; department: string; semester: number; credits: number; type: 'theory' | 'lab' | 'elective'; faculty: string; prerequisites: string[]; isActive: boolean }): SubjectRecord {
  return {
    id: String(doc._id),
    code: doc.code,
    name: doc.name,
    department: doc.department,
    semester: doc.semester,
    credits: doc.credits,
    type: doc.type,
    faculty: doc.faculty,
    prerequisites: doc.prerequisites ?? [],
    isActive: doc.isActive,
  };
}

export class MongoSubjectRepository implements ISubjectRepository {
  async findById(id: string): Promise<SubjectRecord | null> {
    const doc = await Subject.findById(id);
    return doc ? toRecord(doc) : null;
  }

  async findByCode(code: string): Promise<SubjectRecord | null> {
    const doc = await Subject.findOne({ code: code.toUpperCase() });
    return doc ? toRecord(doc) : null;
  }

  async findByDepartment(department: string): Promise<SubjectRecord[]> {
    const docs = await Subject.find({ department, isActive: true }).sort({ semester: 1, code: 1 });
    return docs.map(toRecord);
  }

  async findByDepartmentAndSemester(department: string, semester: number): Promise<SubjectRecord[]> {
    const docs = await Subject.find({ department, semester, isActive: true }).sort({ code: 1 });
    return docs.map(toRecord);
  }

  async findByFaculty(faculty: string): Promise<SubjectRecord[]> {
    const docs = await Subject.find({ faculty, isActive: true }).sort({ department: 1, semester: 1 });
    return docs.map(toRecord);
  }

  async create(subject: Omit<SubjectRecord, 'id'>): Promise<SubjectRecord> {
    const doc = await Subject.create(subject);
    return toRecord(doc);
  }

  async update(id: string, data: Partial<Omit<SubjectRecord, 'id'>>): Promise<SubjectRecord | null> {
    const doc = await Subject.findByIdAndUpdate(id, { $set: data }, { new: true });
    return doc ? toRecord(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await Subject.findByIdAndDelete(id);
    return !!result;
  }

  async search(query: string): Promise<SubjectRecord[]> {
    const regex = new RegExp(query, 'i');
    const docs = await Subject.find({
      isActive: true,
      $or: [{ code: regex }, { name: regex }, { faculty: regex }],
    }).sort({ code: 1 });
    return docs.map(toRecord);
  }

  async findPrerequisites(subjectCode: string): Promise<SubjectRecord[]> {
    const subject = await Subject.findOne({ code: subjectCode.toUpperCase() });
    if (!subject || !subject.prerequisites?.length) return [];

    const docs = await Subject.find({ code: { $in: subject.prerequisites } });
    return docs.map(toRecord);
  }

  async getScheduleForSubject(subjectCode: string): Promise<SubjectWithSchedule['schedule']> {
    const docs = await Schedule.find({ subject: subjectCode.toUpperCase() }).sort({ dayOfWeek: 1, timeSlot: 1 });
    return docs.map((doc) => ({
      dayOfWeek: doc.dayOfWeek,
      timeSlot: doc.timeSlot,
      room: doc.room,
      type: doc.type,
      department: doc.department,
      year: doc.year,
      section: doc.section,
    }));
  }

  async getResultsForSubject(subjectCode: string, semester: number, academicYear: string): Promise<SubjectWithResults> {
    const subject = await Subject.findOne({ code: subjectCode.toUpperCase() });
    const subjectRecord = subject ? toRecord(subject) : null;

    const results = await Result.find({
      subject: subjectCode.toUpperCase(),
      semester,
      academicYear,
    });

    const mappedResults = results.map((r) => ({
      studentId: r.studentId,
      semester: r.semester,
      marksObtained: r.marksObtained,
      totalMarks: r.totalMarks,
      grade: r.grade,
      cgpa: r.cgpa,
      examType: r.examType,
      academicYear: r.academicYear,
    }));

    const totalStudents = results.length;
    const averageMarks = totalStudents > 0
      ? Math.round(results.reduce((sum, r) => sum + r.marksObtained, 0) / totalStudents)
      : 0;
    const averagePercentage = totalStudents > 0
      ? Math.round(results.reduce((sum, r) => sum + (r.marksObtained / r.totalMarks) * 100, 0) / totalStudents)
      : 0;
    const highestMarks = totalStudents > 0
      ? Math.max(...results.map((r) => r.marksObtained))
      : 0;
    const lowestMarks = totalStudents > 0
      ? Math.min(...results.map((r) => r.marksObtained))
      : 0;
    const passRate = totalStudents > 0
      ? Math.round((results.filter((r) => (r.marksObtained / r.totalMarks) * 100 >= 40).length / totalStudents) * 100)
      : 0;

    return {
      subject: subjectRecord!,
      results: mappedResults,
      stats: {
        totalStudents,
        averageMarks,
        averagePercentage,
        highestMarks,
        lowestMarks,
        passRate,
      },
    };
  }
}
