import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type MessageDirection = 'incoming' | 'outgoing';
export type MessageType = 'text' | 'image' | 'video' | 'document' | 'audio' | 'other';
export type MessageStatus = 'received' | 'sent' | 'delivered' | 'read' | 'failed';

export interface IMessage extends Document {
  conversationId: Types.ObjectId;
  phone: string;
  jid: string;
  messageId: string;
  direction: MessageDirection;
  type: MessageType;
  content: string;
  status: MessageStatus;
  timestamp: Date;
  requestId?: string;
  fromMe: boolean;
  pushName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    phone: { type: String, required: true },
    jid: { type: String, required: true },
    messageId: { type: String, required: true, unique: true },
    direction: {
      type: String,
      enum: ['incoming', 'outgoing'],
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'document', 'audio', 'other'],
      required: true,
      default: 'text',
    },
    content: { type: String, required: true, default: '' },
    status: {
      type: String,
      enum: ['received', 'sent', 'delivered', 'read', 'failed'],
      required: true,
      default: 'received',
      index: true,
    },
    timestamp: { type: Date, required: true, default: Date.now },
    requestId: { type: String, required: false, index: true },
    fromMe: { type: Boolean, required: true, default: false },
    pushName: { type: String, required: false },
  },
  { timestamps: true },
);

messageSchema.index({ conversationId: 1, timestamp: -1 });
messageSchema.index({ phone: 1, timestamp: -1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
