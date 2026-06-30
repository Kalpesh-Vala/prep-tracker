import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const LoginAttemptSchema = new Schema(
  {
    // Normalized (lowercased) submitted identifier the attempt was made against.
    key: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

// TTL index: attempts older than the 15-minute window are purged automatically.
LoginAttemptSchema.index({ createdAt: 1 }, { expireAfterSeconds: 900 });

export type LoginAttemptDoc = InferSchemaType<typeof LoginAttemptSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const LoginAttempt: Model<LoginAttemptDoc> =
  (mongoose.models.LoginAttempt as Model<LoginAttemptDoc>) ??
  mongoose.model<LoginAttemptDoc>('LoginAttempt', LoginAttemptSchema);
