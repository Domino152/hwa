import mongoose, { Schema, type Document, type Model } from 'mongoose';

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
  department: string | null;
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

export interface IAnnouncementModel extends Model<IAnnouncement> {
  findActiveForAudience(audience: string, department?: string): Promise<IAnnouncement[]>;
  findByDepartment(department: string): Promise<IAnnouncement[]>;
  findRecent(limit?: number): Promise<IAnnouncement[]>;
}

const announcementAttachmentSchema = new Schema<IAnnouncementAttachment>(
  {
    url: { type: String, required: [true, 'Attachment URL is required'] },
    name: { type: String, required: [true, 'Attachment name is required'], trim: true },
    type: { type: String, required: [true, 'Attachment type is required'], trim: true },
  },
  { _id: false },
);

const announcementSchema = new Schema<IAnnouncement, IAnnouncementModel>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      trim: true,
      maxlength: [5000, 'Content cannot exceed 5000 characters'],
    },
    category: {
      type: String,
      enum: ['college', 'department'],
      required: [true, 'Category is required'],
      default: 'college',
    },
    audience: {
      type: String,
      enum: ['all', 'students', 'parents', 'department'],
      required: [true, 'Audience is required'],
      default: 'all',
    },
    department: {
      type: String,
      default: null,
      trim: true,
    },
    semester: {
      type: Number,
      default: null,
      min: [1, 'Semester must be at least 1'],
      max: [12, 'Semester cannot exceed 12'],
    },
    academicYear: {
      type: String,
      default: null,
      trim: true,
    },
    targetSemesters: [
      {
        type: Number,
        min: [1, 'Semester must be at least 1'],
        max: [12, 'Semester cannot exceed 12'],
      },
    ],
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      required: [true, 'Priority is required'],
      default: 'normal',
    },
    attachments: {
      type: [announcementAttachmentSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: String,
      required: [true, 'Created by is required'],
      trim: true,
    },
  },
  { timestamps: true },
);

announcementSchema.index({ audience: 1, isActive: 1 });
announcementSchema.index({ department: 1, isActive: 1 });
announcementSchema.index({ publishedAt: -1 });
announcementSchema.index({ category: 1, isActive: 1 });
announcementSchema.index({ semester: 1, academicYear: 1 });
announcementSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $ne: null } } });

announcementSchema.statics.findActiveForAudience = function (audience: string, department?: string) {
  const query: Record<string, unknown> = {
    isActive: true,
    audience: { $in: [audience, 'all'] },
    $and: [
      {
        $or: [{ publishedAt: null }, { publishedAt: { $lte: new Date() } }],
      },
      {
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      },
    ],
  };

  if (department) {
    query.$or = [{ department: null }, { department }];
  }

  return this.find(query).sort({ priority: -1, publishedAt: -1 }).exec();
};

announcementSchema.statics.findByDepartment = function (department: string) {
  return this.find({ department, isActive: true }).sort({ publishedAt: -1 }).exec();
};

announcementSchema.statics.findRecent = function (limit: number = 20) {
  return this.find({ isActive: true })
    .sort({ publishedAt: -1, priority: -1 })
    .limit(limit)
    .exec();
};

export const Announcement =
  mongoose.model<IAnnouncement, IAnnouncementModel>('Announcement', announcementSchema);
