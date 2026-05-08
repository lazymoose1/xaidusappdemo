import mongoose, { Schema, Document } from 'mongoose';

export type AppFeedbackCategory = 'bug' | 'confusing' | 'idea' | 'praise' | 'safety' | 'other';
export type AppFeedbackSentiment = 'blocked' | 'frustrated' | 'neutral' | 'happy';

export interface IAppFeedback extends Document {
  user_id: string;
  user_role: string;
  category: AppFeedbackCategory;
  sentiment?: AppFeedbackSentiment;
  message: string;
  page?: string;
  contact_allowed: boolean;
  metadata?: Record<string, unknown>;
  created_at: Date;
}

const appFeedbackSchema = new Schema<IAppFeedback>(
  {
    user_id: { type: String, required: true, index: true },
    user_role: { type: String, required: true },
    category: {
      type: String,
      enum: ['bug', 'confusing', 'idea', 'praise', 'safety', 'other'],
      required: true,
    },
    sentiment: {
      type: String,
      enum: ['blocked', 'frustrated', 'neutral', 'happy'],
    },
    message: { type: String, required: true, maxlength: 2000 },
    page: { type: String, maxlength: 300 },
    contact_allowed: { type: Boolean, default: false },
    metadata: Schema.Types.Mixed,
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    collection: 'app_feedback',
  },
);

appFeedbackSchema.index({ created_at: -1 });
appFeedbackSchema.index({ category: 1, created_at: -1 });

export const AppFeedback = mongoose.model<IAppFeedback>('AppFeedback', appFeedbackSchema);
