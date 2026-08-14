import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IWhatsAppAuthState extends Document {
  sessionId: string;
  authKey: string;
  ciphertext: string;
  iv: string;
  authTag: string;
  createdAt: Date;
  updatedAt: Date;
}

const whatsAppAuthStateSchema = new Schema<IWhatsAppAuthState>(
  {
    sessionId: { type: String, required: true, trim: true },
    authKey: { type: String, required: true, trim: true },
    ciphertext: { type: String, required: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
  },
  { timestamps: true },
);

whatsAppAuthStateSchema.index({ sessionId: 1, authKey: 1 }, { unique: true });

export const WhatsAppAuthState: Model<IWhatsAppAuthState> =
  mongoose.models.WhatsAppAuthState ??
  mongoose.model<IWhatsAppAuthState>('WhatsAppAuthState', whatsAppAuthStateSchema);
