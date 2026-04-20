import mongoose, { Schema, Document } from 'mongoose';

export interface IPost extends Document {
  author_id: mongoose.Types.ObjectId;
  content: string;
  media_type?: string;
  media_url?: string;
  visibility: string;
  created_at: Date;
}

const postSchema = new Schema<IPost>(
  {
    author_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    media_type: String,
    media_url: String,
    visibility: { type: String, default: 'public' },
  },
  {
    timestamps: false,
    collection: 'posts',
  },
);

postSchema.add({ created_at: { type: Date, default: Date.now } });
postSchema.index({ author_id: 1, created_at: -1 });

export const Post = mongoose.model<IPost>('Post', postSchema);
