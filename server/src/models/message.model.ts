import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  thread_id: mongoose.Types.ObjectId;
  sender_id: mongoose.Types.ObjectId;
  text: string;
  attachments: string[];
  read_by: string[];
  created_at: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    thread_id: { type: Schema.Types.ObjectId, ref: 'Thread', required: true },
    sender_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    attachments: { type: [String], default: [] },
    read_by: { type: [String], default: [] },
  },
  {
    timestamps: false,
    collection: 'messages',
  },
);

messageSchema.add({ created_at: { type: Date, default: Date.now } });
messageSchema.index({ thread_id: 1, created_at: -1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
