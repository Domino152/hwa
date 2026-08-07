import mongoose, { Schema, type Document } from 'mongoose';

export type AnnouncementAudience = 'all' | 'students' | 'parents' | 'department';

export interface IAnnouncement extends Document {
  title: string;
  content: string;
  audience: AnnouncementAudience;
  department?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isActive: boolean;
  publishedAt: Date | null;
  expiresAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const announcementSchema = new Schema<IAnnouncement>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, trim: true, maxlength: 5000 },
    audience: {
      type: String,
      enum: ['all', 'students', 'parents', 'department'],
      required: true,
      default: 'all',
    },
    department: { type: String, trim: true },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      required: true,
      default: 'normal',
    },
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

export const Announcement = mongoose.model<IAnnouncement>('Announcement', announcementSchema);
