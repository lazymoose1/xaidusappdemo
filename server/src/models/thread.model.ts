import mongoose, { Schema, Document } from 'mongoose';

export interface IThreadMember {
  user_id: mongoose.Types.ObjectId;
}

export interface IThread extends Document {
  type: string;
  title: string;
  created_by?: string;
  members: IThreadMember[];
  last_message?: any;
  last_message_at?: Date;
  read_by?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

const threadMemberSchema = new Schema<IThreadMember>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: false },
);

const threadSchema = new Schema<IThread>(
  {
    type: { type: String, default: 'dm' },
    title: { type: String, default: '' },
    created_by: String,
    members: { type: [threadMemberSchema], default: [] },
    last_message: Schema.Types.Mixed,
    last_message_at: Date,
    read_by: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'threads',
  },
);

threadSchema.index({ 'members.user_id': 1 });
threadSchema.index({ last_message_at: -1 });

export const Thread = mongoose.model<IThread>('Thread', threadSchema);
