import mongoose, { Schema, Document } from 'mongoose';

export type ForumCategory = 'Help' | 'Ideas' | 'General' | 'Tips' | 'Announcement';

export interface IForumPost extends Document {
  title: string;
  body: string;
  category: ForumCategory;
  author_id: mongoose.Types.ObjectId;
  author_display_name: string;
  is_pinned: boolean;
  reply_count: number;
  view_count: number;
  likes: string[];
  created_at: Date;
  updated_at: Date;
}

const forumPostSchema = new Schema<IForumPost>(
  {
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 10000 },
    category: {
      type: String,
      enum: ['Help', 'Ideas', 'General', 'Tips', 'Announcement'],
      default: 'General',
    },
    author_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    author_display_name: { type: String, required: true },
    is_pinned: { type: Boolean, default: false },
    reply_count: { type: Number, default: 0 },
    view_count: { type: Number, default: 0 },
    likes: { type: [String], default: [] },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'forum_posts',
  },
);

forumPostSchema.index({ is_pinned: -1, created_at: -1 });
forumPostSchema.index({ category: 1, created_at: -1 });

export const ForumPost = mongoose.model<IForumPost>('ForumPost', forumPostSchema);
