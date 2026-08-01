import mongoose, { Schema, type Document } from 'mongoose';

export type OutgoingMessageStatus = 'sent' | 'failed';

export interface IOutgoingMessage extends Document {
  jid: string;
  phone: string;
  message: string;
  messageId: string;
  status: OutgoingMessageStatus;
  error?: string;
  requestId: string;
  createdAt: Date;
  updatedAt: Date;
}

const outgoingMessageSchema = new Schema<IOutgoingMessage>(
  {
    jid: { type: String, required: true, index: true },
    phone: { type: String, required: true, index: true },
    message: { type: String, required: true },
    messageId: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['sent', 'failed'],
      required: true,
      default: 'sent',
      index: true,
    },
    error: { type: String, required: false },
    requestId: { type: String, required: true, index: true },
  },
  { timestamps: true },
);

outgoingMessageSchema.index({ jid: 1, createdAt: -1 });

export const OutgoingMessage = mongoose.model<IOutgoingMessage>(
  'OutgoingMessage',
  outgoingMessageSchema,
);
