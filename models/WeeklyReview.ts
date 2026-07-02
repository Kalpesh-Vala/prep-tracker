import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import {
  PREP_TOTAL_WEEKS,
  WEEKLY_REVIEW_TEXT_MAX_LEN,
  WEEKLY_REVIEW_TOPIC_MAX_LEN,
} from '@/lib/constants';

const WeeklyReviewSchema = new Schema(
  {
    weekNumber: { type: Number, required: true, min: 1, max: PREP_TOTAL_WEEKS },
    // Derived server-side from weekNumber (midnight UTC). Not client-trusted.
    weekStartDate: { type: Date, required: true },
    weekEndDate: { type: Date, required: true },
    plannedWork: { type: String, required: true, trim: true, maxlength: WEEKLY_REVIEW_TEXT_MAX_LEN },
    completedWork: { type: String, required: true, trim: true, maxlength: WEEKLY_REVIEW_TEXT_MAX_LEN },
    totalStudyHours: { type: Number, required: true, min: 0 },
    problemsSolved: { type: Number, required: true, min: 0 },
    dsaAccuracyPercent: { type: Number, min: 0, max: 100, required: false },
    weakTopics: {
      type: [{ type: String, trim: true, maxlength: WEEKLY_REVIEW_TOPIC_MAX_LEN }],
      default: [],
    },
    wins: { type: String, required: true, trim: true, maxlength: WEEKLY_REVIEW_TEXT_MAX_LEN },
    nextWeekAdjustments: {
      type: String,
      required: true,
      trim: true,
      maxlength: WEEKLY_REVIEW_TEXT_MAX_LEN,
    },
    prefillSourceUsed: { type: Boolean, required: false },
  },
  { timestamps: true },
);

// One review per week (canonical identity).
WeeklyReviewSchema.index({ weekNumber: 1 }, { unique: true });
// Newest-first browse ordering.
WeeklyReviewSchema.index({ weekStartDate: -1 });

export type WeeklyReviewDoc = InferSchemaType<typeof WeeklyReviewSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const WeeklyReview: Model<WeeklyReviewDoc> =
  (mongoose.models.WeeklyReview as Model<WeeklyReviewDoc>) ??
  mongoose.model<WeeklyReviewDoc>('WeeklyReview', WeeklyReviewSchema);
