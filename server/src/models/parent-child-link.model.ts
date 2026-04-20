import mongoose, { Schema, Document } from 'mongoose';

export interface IParentChildLink extends Document {
  parent_id: mongoose.Types.ObjectId;
  child_id: mongoose.Types.ObjectId;
  created_at: Date;
}

const parentChildLinkSchema = new Schema<IParentChildLink>(
  {
    parent_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    child_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: false,
    collection: 'parent_child_links',
  },
);

parentChildLinkSchema.add({ created_at: { type: Date, default: Date.now } });
parentChildLinkSchema.index({ parent_id: 1, child_id: 1 }, { unique: true });

export const ParentChildLink = mongoose.model<IParentChildLink>(
  'ParentChildLink',
  parentChildLinkSchema,
);
