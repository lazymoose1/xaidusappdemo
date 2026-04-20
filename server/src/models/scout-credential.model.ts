import mongoose, { Schema, Document } from 'mongoose';

export type CredentialType =
  | 'streak'
  | 'goal_complete'
  | 'badge'
  | 'troop_award'
  | 'badge_milestone'
  | 'bronze_award'
  | 'silver_award'
  | 'gold_award'
  | 'service_hours';

export const BADGE_KEYS = [
  'momentum_spark',
  'comeback_core',
  'shrink_to_win',
  'two_tap_titan',
  'study_switch',
  'skill_session',
  'service_signal',
  'leader_lift',
  'quiet_power',
  'plan_true',
  'focus_forge',
  'proof_pulse',
  'team_current',
  'insight_drop',
  'boundary_boss',
  'future_maker',
] as const;

export type BadgeKey = (typeof BADGE_KEYS)[number];

export type AnchorStatus = 'none' | 'submitted' | 'confirmed' | 'failed';

export interface IScoutCredential extends Document {
  user_id: mongoose.Types.ObjectId;
  credential_type: CredentialType;
  badge_key?: BadgeKey | string;
  title: string;
  badge_focus?: string;
  earned_at: Date;
  issued_by: string; // 'system' | userId string
  proof_hash: string;
  acknowledged: boolean;
  anchor_status: AnchorStatus;
  anchor_handle?: string;
  anchor_proof?: string;
  anchor_submitted_at?: Date;
  anchor_confirmed_at?: Date;
  metadata?: Record<string, unknown>;
  created_at: Date;
}

const scoutCredentialSchema = new Schema<IScoutCredential>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    credential_type: {
      type: String,
      enum: ['streak', 'goal_complete', 'badge', 'troop_award', 'badge_milestone', 'bronze_award', 'silver_award', 'gold_award', 'service_hours'],
      required: true,
    },
    badge_key: String,
    title: { type: String, required: true },
    badge_focus: String,
    earned_at: { type: Date, required: true },
    issued_by: { type: String, required: true },
    proof_hash: { type: String, required: true },
    acknowledged: { type: Boolean, default: false },
    anchor_status: { type: String, enum: ['none', 'submitted', 'confirmed', 'failed'], default: 'none' },
    anchor_handle: String,
    anchor_proof: String,
    anchor_submitted_at: Date,
    anchor_confirmed_at: Date,
    metadata: Schema.Types.Mixed,
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    collection: 'scout_credentials',
  },
);

scoutCredentialSchema.index({ user_id: 1, earned_at: -1 });
scoutCredentialSchema.index({ user_id: 1, acknowledged: 1 });

export const ScoutCredential = mongoose.model<IScoutCredential>('ScoutCredential', scoutCredentialSchema);
