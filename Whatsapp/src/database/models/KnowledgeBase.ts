import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type KnowledgeCategory =
  | 'campus_info'
  | 'academic'
  | 'fees'
  | 'exam_results'
  | 'hostel'
  | 'library'
  | 'placements'
  | 'events'
  | 'rules'
  | 'guidelines'
  | 'procedures'
  | 'faqs'
  | 'courses'
  | 'faculty';

export interface IKnowledgeBase extends Document {
  category: KnowledgeCategory;
  title: string;
  content: string;
  intent: string | null;
  keywords: string[];
  synonyms: string[];
  examples: string[];
  responseTemplates: string[];
  embedding: number[];
  source: string | null;
  department: string | null;
  priority: number;
  isActive: boolean;
  lastUpdatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IKnowledgeBaseModel extends Model<IKnowledgeBase> {
  findByCategory(category: KnowledgeCategory): Promise<IKnowledgeBase[]>;
  findByIntent(intent: string): Promise<IKnowledgeBase | null>;
  searchByKeyword(keyword: string): Promise<IKnowledgeBase[]>;
  findActiveByDepartment(department: string): Promise<IKnowledgeBase[]>;
  findByPriority(limit?: number): Promise<IKnowledgeBase[]>;
}

const knowledgeBaseSchema = new Schema<IKnowledgeBase, IKnowledgeBaseModel>(
  {
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'campus_info',
        'academic',
        'fees',
        'exam_results',
        'hostel',
        'library',
        'placements',
        'events',
        'rules',
        'guidelines',
        'procedures',
        'faqs',
        'courses',
        'faculty',
      ],
      index: true,
    },
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
      maxlength: [10000, 'Content cannot exceed 10000 characters'],
    },
    intent: {
      type: String,
      default: null,
      trim: true,
    },
    keywords: {
      type: [String],
      default: [],
    },
    synonyms: {
      type: [String],
      default: [],
    },
    examples: {
      type: [String],
      default: [],
    },
    responseTemplates: {
      type: [String],
      default: [],
    },
    embedding: {
      type: [Number],
      default: [],
    },
    source: {
      type: String,
      default: null,
      trim: true,
    },
    department: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    priority: {
      type: Number,
      default: 0,
      min: [0, 'Priority cannot be negative'],
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastUpdatedBy: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { timestamps: true },
);

knowledgeBaseSchema.index({ category: 1, isActive: 1 });
knowledgeBaseSchema.index({ keywords: 1 });
knowledgeBaseSchema.index({ intent: 1 });
knowledgeBaseSchema.index({ priority: -1 });

knowledgeBaseSchema.statics.findByCategory = function (category: KnowledgeCategory) {
  return this.find({ category, isActive: true }).sort({ priority: -1 }).exec();
};

knowledgeBaseSchema.statics.findByIntent = function (intent: string) {
  return this.findOne({ intent, isActive: true }).exec();
};

knowledgeBaseSchema.statics.searchByKeyword = function (keyword: string) {
  return this.find({
    isActive: true,
    $or: [
      { keywords: { $in: [new RegExp(keyword, 'i')] } },
      { synonyms: { $in: [new RegExp(keyword, 'i')] } },
      { title: new RegExp(keyword, 'i') },
      { content: new RegExp(keyword, 'i') },
    ],
  })
    .sort({ priority: -1 })
    .exec();
};

knowledgeBaseSchema.statics.findActiveByDepartment = function (department: string) {
  return this.find({
    isActive: true,
    $or: [{ department }, { department: null }],
  })
    .sort({ priority: -1 })
    .exec();
};

knowledgeBaseSchema.statics.findByPriority = function (limit: number = 10) {
  return this.find({ isActive: true })
    .sort({ priority: -1 })
    .limit(limit)
    .exec();
};

export const KnowledgeBase = mongoose.model<IKnowledgeBase, IKnowledgeBaseModel>('KnowledgeBase', knowledgeBaseSchema);
