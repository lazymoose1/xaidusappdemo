import mongoose, { Schema, Document } from 'mongoose';

export interface IScoutNudge extends Document {
  from_user_id: mongoose.Types.ObjectId;
  to_user_id: mongoose.Types.ObjectId;
  troop_id: mongoose.Types.ObjectId;
  type: 'leader_nudge' | 'scout_nudge_back';
  message?: string;
  acknowledged: boolean;
  created_at: Date;
}

const scoutNudgeSchema = new Schema<IScoutNudge>(
  {
    from_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    to_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    troop_id: { type: Schema.Types.ObjectId, ref: 'Troop', required: true },
    type: { type: String, enum: ['leader_nudge', 'scout_nudge_back'], required: true },
    message: { type: String, maxlength: 200 },
    acknowledged: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    collection: 'scout_nudges',
  },
);

scoutNudgeSchema.index({ to_user_id: 1, acknowledged: 1 });
scoutNudgeSchema.index({ troop_id: 1, created_at: -1 });

export const ScoutNudge = mongoose.model<IScoutNudge>('ScoutNudge', scoutNudgeSchema);
