import mongoose, { Schema, type Document } from 'mongoose';

export type AnnouncementAudience = 'all' | 'students' | 'parents' | 'department';
export type AnnouncementPriority = 'low' | 'normal' | 'high' | 'urgent';
export type AnnouncementCategory = 'college' | 'department';

export interface IAnnouncementAttachment {
  url: string;
  name: string;
  type: string;
}

export interface IAnnouncement extends Document {
  title: string;
  content: string;
  category: AnnouncementCategory;
  audience: AnnouncementAudience;
  department?: string;
  semester: number | null;
  academicYear: string | null;
  targetSemesters: number[];
  priority: AnnouncementPriority;
  attachments: IAnnouncementAttachment[];
  isActive: boolean;
  publishedAt: Date | null;
  expiresAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const announcementAttachmentSchema = new Schema<IAnnouncementAttachment>(
  {
    url: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
  },
  { _id: false },
);

const announcementSchema = new Schema<IAnnouncement>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, trim: true, maxlength: 5000 },
    category: {
      type: String,
      enum: ['college', 'department'],
      required: true,
      default: 'college',
    },
    audience: {
      type: String,
      enum: ['all', 'students', 'parents', 'department'],
      required: true,
      default: 'all',
    },
    department: { type: String, trim: true },
    semester: { type: Number, default: null, min: 1, max: 8 },
    academicYear: { type: String, default: null, trim: true },
    targetSemesters: [{ type: Number, min: 1, max: 8 }],
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      required: true,
      default: 'normal',
    },
    attachments: { type: [announcementAttachmentSchema], default: [] },
    isActive: { type: Boolean, default: true },
    publishedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
);

announcementSchema.index({ audience: 1, isActive: 1 });
announcementSchema.index({ department: 1, isActive: 1 });
announcementSchema.index({ publishedAt: -1 });
announcementSchema.index({ category: 1, isActive: 1 });
announcementSchema.index({ semester: 1, academicYear: 1 });
announcementSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $ne: null } } });

export const Announcement = mongoose.model<IAnnouncement>('Announcement', announcementSchema);
