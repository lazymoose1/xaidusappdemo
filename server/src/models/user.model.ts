import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  auth_id: string;
  email: string;
  role: string;
  display_name: string;
  organization_type?: string;
  avatar_url?: string;
  cohort_code?: string;
  archetype?: string;
  interests: string[];
  coach_style?: string;
  reminder_windows: string[];
  parent_contact?: Record<string, any>;
  consent_flags?: Record<string, any>;
  social_ids?: Record<string, any>;
  // Scout-specific fields
  is_scout_account?: boolean;   // true = PIN-auth scout (no Supabase account)
  scout_pin_hash?: string;      // bcrypt hash of 4–6 digit PIN
  troop_code?: string;          // which troop this scout belongs to
  // Rewards
  is_moova?: boolean;
  moova_earned_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const userSchema = new Schema<IUser>(
  {
    auth_id: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, default: 'teen' },
    display_name: { type: String, default: '' },
    organization_type: { type: String, default: 'default_generic' },
    avatar_url: String,
    cohort_code: String,
    archetype: String,
    interests: { type: [String], default: [] },
    coach_style: { type: String, default: 'calm' },
    reminder_windows: { type: [String], default: [] },
    parent_contact: Schema.Types.Mixed,
    consent_flags: Schema.Types.Mixed,
    social_ids: Schema.Types.Mixed,
    // Scout fields
    is_scout_account: { type: Boolean, default: false },
    scout_pin_hash: String,
    troop_code: String,
    // Rewards
    is_moova: { type: Boolean, default: false },
    moova_earned_at: Date,
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'users',
  },
);

userSchema.index({ display_name: 'text' });

export const User = mongoose.model<IUser>('User', userSchema);
