import crypto from 'crypto';
import mongoose, { Schema, type Document, type Model } from 'mongoose';

const TOKEN_TTL_MINUTES = 10;
const TOKEN_RAW_BYTES = 32;

export interface ILoginToken extends Document {
  tokenHash: string;
  phone: string;
  lid: string | null;
  purpose: 'whatsapp_login';
  expiresAt: Date;
  used: boolean;
  usedAt: Date | null;
  createdAt: Date;
}

export interface ILoginTokenModel extends Model<ILoginToken> {
  createForPhone(phone: string, lid?: string): Promise<{ tokenId: string; rawToken: string }>;
  findValid(rawToken: string): Promise<ILoginToken | null>;
  markUsed(tokenId: string): Promise<void>;
}

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

const loginTokenSchema = new Schema<ILoginToken, ILoginTokenModel>(
  {
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      index: true,
    },
    lid: {
      type: String,
      default: null,
      index: true,
    },
    purpose: {
      type: String,
      enum: ['whatsapp_login'],
      default: 'whatsapp_login',
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    used: {
      type: Boolean,
      default: false,
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

loginTokenSchema.statics.createForPhone = async function (phone: string, lid?: string) {
  const rawToken = crypto.randomBytes(TOKEN_RAW_BYTES).toString('hex');
  const tokenHash = sha256(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

  const doc = await this.create({
    tokenHash,
    phone,
    lid: lid ?? null,
    purpose: 'whatsapp_login',
    expiresAt,
    used: false,
  });

  return { tokenId: String(doc._id), rawToken };
};

loginTokenSchema.statics.findValid = async function (rawToken: string) {
  const tokenHash = sha256(rawToken);
  return this.findOne({
    tokenHash,
    used: false,
    purpose: 'whatsapp_login',
    expiresAt: { $gt: new Date() },
  });
};

loginTokenSchema.statics.markUsed = async function (tokenId: string) {
  await this.findByIdAndUpdate(tokenId, { used: true, usedAt: new Date() });
};

export const LoginToken = mongoose.model<ILoginToken, ILoginTokenModel>(
  'LoginToken',
  loginTokenSchema,
);
