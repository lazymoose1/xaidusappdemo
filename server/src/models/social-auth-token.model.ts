import mongoose, { Schema, Document } from 'mongoose';

export interface ISocialAuthToken extends Document {
  user_id: mongoose.Types.ObjectId;
  platform: string;
  access_token: string;
  refresh_token?: string;
  expires_at?: Date;
  social_user_id?: string;
  scope?: string;
  profile?: any;
  created_at: Date;
  updated_at: Date;
}

const socialAuthTokenSchema = new Schema<ISocialAuthToken>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    platform: { type: String, required: true },
    access_token: { type: String, required: true },
    refresh_token: String,
    expires_at: Date,
    social_user_id: String,
    scope: String,
    profile: Schema.Types.Mixed,
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'social_auth_tokens',
  },
);

socialAuthTokenSchema.index({ user_id: 1, platform: 1 }, { unique: true });

export const SocialAuthToken = mongoose.model<ISocialAuthToken>(
  'SocialAuthToken',
  socialAuthTokenSchema,
);
