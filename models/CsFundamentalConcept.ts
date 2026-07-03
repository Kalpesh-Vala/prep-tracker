import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import {
  CS_DOMAINS,
  CS_STAGES,
  CS_TITLE_MAX_LEN,
  CS_TAG_MAX_LEN,
  CS_REF_MAX_LEN,
  CS_NOTES_MAX_LEN,
} from '@/lib/constants';

const CsFundamentalConceptSchema = new Schema(
  {
    domain: { type: String, required: true, enum: CS_DOMAINS, index: true },
    title: { type: String, required: true, trim: true, maxlength: CS_TITLE_MAX_LEN },
    subtopic: { type: String, trim: true, maxlength: CS_TITLE_MAX_LEN },
    // Derived: domain|lower(trim(title))|lower(trim(subtopic)). Unique concept identity.
    conceptKey: { type: String, required: true },
    tags: { type: [{ type: String, trim: true, maxlength: CS_TAG_MAX_LEN }], default: [] },
    stage: { type: String, required: true, enum: CS_STAGES, index: true },
    confidence: { type: Number, required: true, min: 1, max: 5, index: true },
    lastRevisedAt: { type: Date, required: true, index: true },
    notes: { type: String, trim: true, maxlength: CS_NOTES_MAX_LEN },
    interviewQuestionRefs: {
      type: [{ type: String, trim: true, maxlength: CS_REF_MAX_LEN }],
      default: [],
    },
    isArchived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

// One record per (domain, normalized title, normalized subtopic).
CsFundamentalConceptSchema.index({ conceptKey: 1 }, { unique: true });
// Stable listing.
CsFundamentalConceptSchema.index({ createdAt: -1 });

export type CsFundamentalConceptDoc = InferSchemaType<typeof CsFundamentalConceptSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const CsFundamentalConcept: Model<CsFundamentalConceptDoc> =
  (mongoose.models.CsFundamentalConcept as Model<CsFundamentalConceptDoc>) ??
  mongoose.model<CsFundamentalConceptDoc>('CsFundamentalConcept', CsFundamentalConceptSchema);
