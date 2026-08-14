import mongoose, { Schema, type Document, type Types, type Model } from 'mongoose';

export type MessageDirection = 'incoming' | 'outgoing';
export type MessageType = 'text' | 'image' | 'video' | 'document' | 'audio' | 'other';
export type MessageStatus = 'received' | 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface IMessage {
  messageId: string;
  direction: MessageDirection;
  type: MessageType;
  content: string;
  status: MessageStatus;
  timestamp: Date;
  requestId: string | null;
  fromMe: boolean;
  pushName: string | null;
}

export interface IConversation extends Document {
  phone: string;
  jid: string;
  contactName: string | null;
  lastMessage: string;
  lastMessageAt: Date;
  lastMessageDirection: MessageDirection | null;
  unreadCount: number;
  isActive: boolean;
  studentId: string | null;
  userId: Types.ObjectId | null;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IConversationModel extends Model<IConversation> {
  findByPhone(phone: string): Promise<IConversation | null>;
  findByJid(jid: string): Promise<IConversation | null>;
  findByStudentId(studentId: string): Promise<IConversation | null>;
  addMessage(conversationId: string, message: IMessage): Promise<IConversation | null>;
  updateMessageStatus(
    conversationId: string,
    messageId: string,
    status: MessageStatus,
  ): Promise<IConversation>;
  getRecentMessages(conversationId: string, limit?: number): Promise<IMessage[]>;
  markAsRead(conversationId: string): Promise<IConversation>;
}

const messageSchema = new Schema<IMessage>(
  {
    messageId: { type: String, required: true },
    direction: {
      type: String,
      enum: ['incoming', 'outgoing'],
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'document', 'audio', 'other'],
      default: 'text',
    },
    content: { type: String, required: true },
    status: {
      type: String,
      enum: ['received', 'pending', 'sent', 'delivered', 'read', 'failed'],
      default: 'received',
    },
    timestamp: { type: Date, required: true },
    requestId: { type: String, default: null },
    fromMe: { type: Boolean, default: false },
    pushName: { type: String, default: null },
  },
  { _id: false },
);

const conversationSchema = new Schema<IConversation, IConversationModel>(
  {
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
    },
    jid: {
      type: String,
      required: [true, 'JID is required'],
    },
    contactName: {
      type: String,
      default: null,
      trim: true,
    },
    lastMessage: {
      type: String,
      default: '',
      trim: true,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    lastMessageDirection: {
      type: String,
      enum: ['incoming', 'outgoing'],
      default: null,
    },
    unreadCount: {
      type: Number,
      default: 0,
      min: [0, 'Unread count cannot be negative'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    studentId: {
      type: String,
      default: null,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    messages: [messageSchema],
  },
  { timestamps: true },
);

conversationSchema.index({ lastMessageAt: -1 });

conversationSchema.statics.findByPhone = function (phone: string) {
  return this.findOne({ phone }).exec();
};

conversationSchema.statics.findByJid = function (jid: string) {
  return this.findOne({ jid }).exec();
};

conversationSchema.statics.findByStudentId = function (studentId: string) {
  return this.findOne({ studentId, isActive: true }).exec();
};

conversationSchema.statics.addMessage = async function (conversationId: string, message: IMessage) {
  return this.findOneAndUpdate(
    { _id: conversationId, 'messages.messageId': { $ne: message.messageId } },
    {
      $push: {
        messages: {
          $each: [message],
          $slice: -10000,
        },
      },
      $set: {
        lastMessage: message.content.substring(0, 100),
        lastMessageAt: message.timestamp,
        lastMessageDirection: message.direction,
      },
      $inc: {
        unreadCount: message.direction === 'incoming' ? 1 : 0,
      },
    },
    { new: true },
  ).exec();
};

conversationSchema.statics.updateMessageStatus = async function (
  conversationId: string,
  messageId: string,
  status: MessageStatus,
) {
  return this.findOneAndUpdate(
    { _id: conversationId, 'messages.messageId': messageId },
    { $set: { 'messages.$.status': status } },
    { new: true },
  ).exec();
};

conversationSchema.statics.getRecentMessages = function (
  conversationId: string,
  limit: number = 50,
) {
  return this.findById(conversationId)
    .select('messages')
    .then((doc) => {
      if (!doc) return [];
      const msgs = doc.messages || [];
      return msgs.slice(-limit);
    });
};

conversationSchema.statics.markAsRead = async function (conversationId: string) {
  return this.findByIdAndUpdate(conversationId, { unreadCount: 0 }, { new: true }).exec();
};

export const Conversation = mongoose.model<IConversation, IConversationModel>(
  'Conversation',
  conversationSchema,
);
