import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
  post_id: mongoose.Types.ObjectId;
  author_id: mongoose.Types.ObjectId;
  text: string;
  created_at: Date;
}

const commentSchema = new Schema<IComment>(
  {
    post_id: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    author_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
  },
  {
    timestamps: false,
    collection: 'comments',
  },
);

commentSchema.add({ created_at: { type: Date, default: Date.now } });
commentSchema.index({ post_id: 1, created_at: -1 });

export const Comment = mongoose.model<IComment>('Comment', commentSchema);
