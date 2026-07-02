import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import {
  DIFFICULTIES,
  ATTEMPT_TYPES,
  CONFIDENCE_MIN,
  CONFIDENCE_MAX,
  DSA_TITLE_MAX_LEN,
  DSA_TEXT_MAX_LEN,
  DSA_COMPLEXITY_MAX_LEN,
  DSA_TIME_TAKEN_MAX,
} from '@/lib/constants';

const DsaProblemSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: DSA_TITLE_MAX_LEN },
    topic: { type: String, required: true, trim: true, maxlength: DSA_TEXT_MAX_LEN },
    // Derived normalized key (trimmed + lowercased) for grouping/filtering.
    topicKey: { type: String, required: true, index: true },
    subtopic: { type: String, trim: true, maxlength: DSA_TEXT_MAX_LEN },
    difficulty: { type: String, required: true, enum: DIFFICULTIES, index: true },
    platform: { type: String, required: true, trim: true, maxlength: DSA_TEXT_MAX_LEN },
    timeTakenMinutes: { type: Number, required: true, min: 1, max: DSA_TIME_TAKEN_MAX },
    attemptType: { type: String, required: true, enum: ATTEMPT_TYPES },
    solvedWithoutHints: { type: Boolean, required: true },
    timeComplexity: { type: String, required: true, trim: true, maxlength: DSA_COMPLEXITY_MAX_LEN },
    spaceComplexity: { type: String, required: true, trim: true, maxlength: DSA_COMPLEXITY_MAX_LEN },
    confidence: { type: Number, required: true, min: CONFIDENCE_MIN, max: CONFIDENCE_MAX },
    needsRevision: { type: Boolean, required: true, index: true },
    interviewWorthy: { type: Boolean, required: true, index: true },
    // Normalized to midnight UTC of the day the problem was solved.
    solvedOn: { type: Date, required: true },
  },
  { timestamps: true },
);

// Reverse-chronological listing by solved date (tiebreak createdAt via _id).
DsaProblemSchema.index({ solvedOn: -1 });

export type DsaProblemDoc = InferSchemaType<typeof DsaProblemSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const DsaProblem: Model<DsaProblemDoc> =
  (mongoose.models.DsaProblem as Model<DsaProblemDoc>) ??
  mongoose.model<DsaProblemDoc>('DsaProblem', DsaProblemSchema);
