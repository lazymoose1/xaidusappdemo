import mongoose, { Schema, Document } from 'mongoose';

export interface IForumReply extends Document {
  post_id: mongoose.Types.ObjectId;
  author_id: mongoose.Types.ObjectId;
  author_display_name: string;
  body: string;
  likes: string[];
  created_at: Date;
}

const forumReplySchema = new Schema<IForumReply>(
  {
    post_id: { type: Schema.Types.ObjectId, ref: 'ForumPost', required: true },
    author_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    author_display_name: { type: String, required: true },
    body: { type: String, required: true, maxlength: 5000 },
    likes: { type: [String], default: [] },
  },
  {
    timestamps: false,
    collection: 'forum_replies',
  },
);

forumReplySchema.add({ created_at: { type: Date, default: Date.now } });
forumReplySchema.index({ post_id: 1, created_at: 1 });

export const ForumReply = mongoose.model<IForumReply>('ForumReply', forumReplySchema);
