import mongoose, { Schema, Document } from 'mongoose';

export type SupportTag =
  | 'outreach_attempted'
  | 'youth_responded'
  | 'missed_appointment'
  | 'goal_planning_help'
  | 'accountability_support'
  | 'needs_escalation'
  | 'resolved';

export type SupportStatus =
  | 'needs_support'
  | 'follow_up_due'
  | 'on_track'
  | 'resolved';

export interface ILeaderSupportNote extends Document {
  troop_id: mongoose.Types.ObjectId;
  youth_user_id: mongoose.Types.ObjectId;
  created_by: mongoose.Types.ObjectId;
  note: string;
  tags: SupportTag[];
  next_step?: string;
  follow_up_date?: Date | null;
  status: SupportStatus;
  created_at: Date;
  updated_at: Date;
}

const leaderSupportNoteSchema = new Schema<ILeaderSupportNote>(
  {
    troop_id: { type: Schema.Types.ObjectId, ref: 'Troop', required: true, index: true },
    youth_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, required: true, maxlength: 500 },
    tags: {
      type: [String],
      enum: [
        'outreach_attempted',
        'youth_responded',
        'missed_appointment',
        'goal_planning_help',
        'accountability_support',
        'needs_escalation',
        'resolved',
      ],
      default: [],
    },
    next_step: { type: String, maxlength: 200 },
    follow_up_date: { type: Date, default: null },
    status: {
      type: String,
      enum: ['needs_support', 'follow_up_due', 'on_track', 'resolved'],
      default: 'needs_support',
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'leader_support_notes',
  },
);

leaderSupportNoteSchema.index({ troop_id: 1, youth_user_id: 1, created_at: -1 });

export const LeaderSupportNote = mongoose.model<ILeaderSupportNote>(
  'LeaderSupportNote',
  leaderSupportNoteSchema,
);
