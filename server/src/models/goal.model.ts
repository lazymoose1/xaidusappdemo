import mongoose, { Schema, Document } from 'mongoose';

export interface IGoal extends Document {
  user_id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  category: string;
  progress: number;
  completed: boolean;
  status: string;
  planned_days?: any;
  completed_dates: Date[];
  last_checkin?: any;
  micro_step?: string;
  milestones: any[];
  source: string;
  suggestion_id?: string;
  suggestion_title?: string;
  adopted_at?: Date;
  archetype_aligned?: boolean;
  reminder_window?: string;
  week_start?: string;
  resized?: boolean;
  carried_over_from?: string;
  // Scout-specific fields
  badge_focus?: string;          // e.g., 'Cookie Entrepreneur', 'STEM', 'Outdoor Adventure'
  goal_category_tag?: string;    // 'school' | 'skill' | 'community' | 'personal'
  size_preset?: string;          // '5min' | '10min' | '20min' | 'custom'
  check_in_windows?: string[];   // e.g., ['morning', 'evening']
  shrunk_from?: string;          // original title if goal was right-sized
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
}

const goalSchema = new Schema<IGoal>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: String,
    category: { type: String, default: 'personal' },
    progress: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    status: { type: String, default: 'active' },
    planned_days: Schema.Types.Mixed,
    completed_dates: { type: [Date], default: [] },
    last_checkin: Schema.Types.Mixed,
    micro_step: String,
    milestones: { type: Schema.Types.Mixed, default: [] },
    source: { type: String, default: 'manual' },
    suggestion_id: String,
    suggestion_title: String,
    adopted_at: Date,
    archetype_aligned: Boolean,
    reminder_window: String,
    week_start: String,
    resized: Boolean,
    carried_over_from: String,
    completed_at: Date,
    // Scout fields
    badge_focus: String,
    goal_category_tag: { type: String, enum: ['school', 'skill', 'community', 'personal'], default: 'personal' },
    size_preset: String,
    check_in_windows: { type: [String], default: [] },
    shrunk_from: String,
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'goals',
  },
);

goalSchema.index({ user_id: 1 });
goalSchema.index({ status: 1, completed: 1 });

export const Goal = mongoose.model<IGoal>('Goal', goalSchema);
