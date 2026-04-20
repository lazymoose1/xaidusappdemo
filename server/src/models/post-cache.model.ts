import mongoose, { Schema, Document } from 'mongoose';

export interface IPostCache extends Document {
  user_id: string;
  platform: string;
  posts: any;
  fetched_at: Date;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

const postCacheSchema = new Schema<IPostCache>(
  {
    user_id: { type: String, required: true },
    platform: { type: String, required: true },
    posts: Schema.Types.Mixed,
    fetched_at: { type: Date, default: Date.now },
    expires_at: { type: Date, required: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'post_caches',
  },
);

postCacheSchema.index({ user_id: 1, platform: 1 }, { unique: true });
postCacheSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const PostCache = mongoose.model<IPostCache>('PostCache', postCacheSchema);
