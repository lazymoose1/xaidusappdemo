import mongoose, { Schema, Document } from 'mongoose';

export interface IRoleCode extends Document {
  user_id: mongoose.Types.ObjectId;
  code_hash: string;
  target_role: 'teen' | 'parent' | 'scout_leader';
  expires_at: Date;
  used_at?: Date;
}

const RoleCodeSchema = new Schema<IRoleCode>({
  user_id:     { type: Schema.Types.ObjectId, required: true, index: true },
  code_hash:   { type: String, required: true },
  target_role: { type: String, enum: ['teen', 'parent', 'scout_leader'], required: true },
  expires_at:  { type: Date, required: true },
  used_at:     { type: Date },
});

// Auto-delete expired codes after 1 hour of expiry
RoleCodeSchema.index({ expires_at: 1 }, { expireAfterSeconds: 3600 });

export const RoleCode = mongoose.model<IRoleCode>('RoleCode', RoleCodeSchema);
