import mongoose, { Schema, Document } from 'mongoose';

export interface IAiGoalFeedback extends Document {
  user_id: mongoose.Types.ObjectId;
  goal_id: mongoose.Types.ObjectId;
  completion_timeline?: string;
  parent_reviewed: boolean;
  parent_reviewed_at?: Date;
  parent_feedback?: string;
  parent_suggested_milestones: string[];
  completion_feedback?: any;
  adoption_reason?: string;
  milestones_completed: number;
  last_milestone_completed_at?: Date;
  created_at: Date;
}

const aiGoalFeedbackSchema = new Schema<IAiGoalFeedback>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    goal_id: { type: Schema.Types.ObjectId, ref: 'Goal', required: true },
    completion_timeline: String,
    parent_reviewed: { type: Boolean, default: false },
    parent_reviewed_at: Date,
    parent_feedback: String,
    parent_suggested_milestones: { type: [String], default: [] },
    completion_feedback: Schema.Types.Mixed,
    adoption_reason: String,
    milestones_completed: { type: Number, default: 0 },
    last_milestone_completed_at: Date,
  },
  {
    timestamps: false,
    collection: 'ai_goal_feedbacks',
  },
);

aiGoalFeedbackSchema.add({ created_at: { type: Date, default: Date.now } });
aiGoalFeedbackSchema.index({ goal_id: 1, user_id: 1 });

export const AiGoalFeedback = mongoose.model<IAiGoalFeedback>(
  'AiGoalFeedback',
  aiGoalFeedbackSchema,
);
