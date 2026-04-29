import mongoose, { Schema, Document } from 'mongoose';

export interface ITroop extends Document {
  name: string;
  troop_code: string;
  leader_id: mongoose.Types.ObjectId;
  member_ids: mongoose.Types.ObjectId[];
  settings: {
    weekly_reset_day: string;
    check_in_windows: string[];
  };
  created_at: Date;
  updated_at: Date;
}

const troopSchema = new Schema<ITroop>(
  {
    name: { type: String, required: true },
    troop_code: { type: String, required: true, unique: true, uppercase: true },
    leader_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    member_ids: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
    settings: {
      weekly_reset_day: { type: String, default: 'sun' },
      check_in_windows: { type: [String], default: ['morning', 'evening'] },
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'troops',
  },
);

troopSchema.index({ leader_id: 1 });

export const Troop = mongoose.model<ITroop>('Troop', troopSchema);
