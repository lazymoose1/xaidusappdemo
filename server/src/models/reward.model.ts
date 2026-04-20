import mongoose, { Schema, Document } from 'mongoose';

export type RewardType = 'mark' | 'moment' | 'moova';
export type RewardSource =
  | 'goal_checkin'
  | 'goal_completion'
  | 'group_challenge'
  | 'leader_challenge'
  | 'sponsor_challenge'
  | 'platform_challenge'
  | 'consistency_30d';

export interface IReward extends Document {
  user_id: mongoose.Types.ObjectId;
  type: RewardType;
  title: string;
  source: RewardSource;
  source_id?: string;
  earned_at: Date;
}

const rewardSchema = new Schema<IReward>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['mark', 'moment', 'moova'], required: true },
    title: { type: String, required: true },
    source: { type: String, required: true },
    source_id: String,
    earned_at: { type: Date, default: Date.now },
  },
  { timestamps: false, collection: 'rewards' },
);

rewardSchema.index({ user_id: 1, earned_at: -1 });
rewardSchema.index({ user_id: 1, type: 1 });

export const Reward = mongoose.model<IReward>('Reward', rewardSchema);
