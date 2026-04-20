import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  actor_id: mongoose.Types.ObjectId;
  actor_role: string;
  action: string;
  target_user_id?: mongoose.Types.ObjectId;
  troop_id?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
  created_at: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actor_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actor_role: { type: String, required: true },
    action: { type: String, required: true },
    target_user_id: { type: Schema.Types.ObjectId, ref: 'User' },
    troop_id: { type: Schema.Types.ObjectId, ref: 'Troop' },
    metadata: Schema.Types.Mixed,
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    collection: 'audit_logs',
  },
);

auditLogSchema.index({ actor_id: 1, created_at: -1 });
auditLogSchema.index({ troop_id: 1, created_at: -1 });
auditLogSchema.index({ action: 1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);

/** Write an audit log entry without throwing. Fire-and-forget safe. */
export async function writeAuditLog(entry: Omit<IAuditLog, '_id' | 'created_at' | keyof Document>): Promise<void> {
  try {
    await AuditLog.create(entry);
  } catch {
    // Audit logging must never break the main request
  }
}
