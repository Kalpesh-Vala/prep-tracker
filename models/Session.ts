import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const SessionSchema = new Schema(
  {
    // HMAC-SHA-256 (keyed with AUTH_SECRET) of the opaque session token.
    // The raw token lives only in the cookie and is never stored.
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

// TTL index: MongoDB removes the document once `expiresAt` passes.
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type SessionDoc = InferSchemaType<typeof SessionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Session: Model<SessionDoc> =
  (mongoose.models.Session as Model<SessionDoc>) ??
  mongoose.model<SessionDoc>('Session', SessionSchema);
