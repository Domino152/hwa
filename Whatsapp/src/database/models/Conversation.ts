import mongoose, { Schema, type Document } from 'mongoose';

export type MessageDirection = 'incoming' | 'outgoing';

export interface IConversation extends Document {
  phone: string;
  jid: string;
  contactName?: string;
  lastMessage: string;
  lastMessageAt: Date;
  lastMessageDirection: MessageDirection;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    phone: { type: String, required: true, unique: true, index: true },
    jid: { type: String, required: true },
    contactName: { type: String, required: false },
    lastMessage: { type: String, required: true, default: '' },
    lastMessageAt: { type: Date, required: true, default: Date.now, index: true },
    lastMessageDirection: {
      type: String,
      enum: ['incoming', 'outgoing'],
      required: true,
      default: 'incoming',
    },
    unreadCount: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true },
);

conversationSchema.index({ lastMessageAt: -1 });

export const Conversation = mongoose.model<IConversation>(
  'Conversation',
  conversationSchema,
);
