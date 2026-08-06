import mongoose, { Schema, type Document } from 'mongoose';

export type PublicContentCategory =
  | 'about_hits'
  | 'admissions'
  | 'departments'
  | 'courses'
  | 'placements'
  | 'hostel'
  | 'transportation'
  | 'scholarships'
  | 'campus_facilities'
  | 'library'
  | 'sports'
  | 'clubs'
  | 'events'
  | 'contact'
  | 'location'
  | 'achievements'
  | 'faq';

export const PUBLIC_CONTENT_CATEGORIES: readonly PublicContentCategory[] = [
  'about_hits',
  'admissions',
  'departments',
  'courses',
  'placements',
  'hostel',
  'transportation',
  'scholarships',
  'campus_facilities',
  'library',
  'sports',
  'clubs',
  'events',
  'contact',
  'location',
  'achievements',
  'faq',
] as const;

export interface IPublicContent extends Document {
  category: PublicContentCategory;
  title: string;
  content: string;
  keywords: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const publicContentSchema = new Schema<IPublicContent>(
  {
    category: {
      type: String,
      enum: [...PUBLIC_CONTENT_CATEGORIES],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    keywords: [{ type: String, trim: true, lowercase: true }],
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

publicContentSchema.index({ category: 1, isActive: 1 });
publicContentSchema.index({ keywords: 1 });

export const PublicContent = mongoose.model<IPublicContent>(
  'PublicContent',
  publicContentSchema,
);
