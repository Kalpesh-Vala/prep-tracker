import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import { ENERGY_LEVELS, STUDY_HOURS_MAX, TEXT_FIELD_MAX_LEN } from '@/lib/constants';

const DailyLogSchema = new Schema(
  {
    // Normalized to midnight UTC of the calendar day so each day maps to one entry.
    date: {
      type: Date,
      required: true,
    },
    studyHours: {
      type: Number,
      required: true,
      min: 0,
      max: STUDY_HOURS_MAX,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
      maxlength: TEXT_FIELD_MAX_LEN,
    },
    problemsSolved: {
      type: Number,
      required: true,
      min: 0,
    },
    revisionCompleted: {
      type: Boolean,
      required: true,
    },
    biggestChallenge: {
      type: String,
      required: true,
      trim: true,
      maxlength: TEXT_FIELD_MAX_LEN,
    },
    nextDayGoal: {
      type: String,
      required: true,
      trim: true,
      maxlength: TEXT_FIELD_MAX_LEN,
    },
    energyLevel: {
      type: String,
      enum: ENERGY_LEVELS,
      required: false,
    },
  },
  { timestamps: true },
);

// Unique index enforces one entry per calendar day at the database layer
// (durable under concurrent create attempts).
DailyLogSchema.index({ date: 1 }, { unique: true });

export type DailyLogDoc = InferSchemaType<typeof DailyLogSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const DailyLog: Model<DailyLogDoc> =
  (mongoose.models.DailyLog as Model<DailyLogDoc>) ??
  mongoose.model<DailyLogDoc>('DailyLog', DailyLogSchema);
