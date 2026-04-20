import mongoose, { Schema, Document } from 'mongoose';

export interface ICheckin extends Document {
  user_id: mongoose.Types.ObjectId;
  goal_id: mongoose.Types.ObjectId;
  status: string;
  date: Date;
  note?: string;
  snoozes: number;
  // Scout-specific fields
  effort_level?: 1 | 2 | 3;    // 1=light, 2=medium, 3=full — private, not shared with leader
  reflection?: string;          // private reflection, never surfaced to leader
  event_type?: string;          // badge trigger event, e.g. 'daily_checkin_yes', 'daily_checkin_not_yet'
  check_in_window?: string;     // 'morning' | 'evening' — for Two-Tap Titan badge
  created_at: Date;
}

const checkinSchema = new Schema<ICheckin>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    goal_id: { type: Schema.Types.ObjectId, ref: 'Goal', required: true },
    status: { type: String, required: true },
    date: { type: Date, required: true },
    note: String,
    snoozes: { type: Number, default: 0 },
    // Scout fields
    effort_level: { type: Number, enum: [1, 2, 3] },
    reflection: { type: String, maxlength: 500 },
    event_type: String,
    check_in_window: { type: String, enum: ['morning', 'evening', 'afternoon'] },
  },
  {
    timestamps: false,
    collection: 'checkins',
  },
);

checkinSchema.add({ created_at: { type: Date, default: Date.now } });
checkinSchema.index({ user_id: 1, goal_id: 1 });

export const Checkin = mongoose.model<ICheckin>('Checkin', checkinSchema);
