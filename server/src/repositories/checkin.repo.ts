import { Checkin } from '../models';

export async function create(data: {
  userId: string;
  goalId: string;
  status: string;
  date: Date;
  note?: string;
  snoozes?: number;
  effortLevel?: 1 | 2 | 3;
  reflection?: string;
  checkInWindow?: string;
  eventType?: string;
}) {
  const doc = await Checkin.create({
    user_id: data.userId,
    goal_id: data.goalId,
    status: data.status,
    date: data.date,
    note: data.note,
    snoozes: data.snoozes || 0,
    effort_level: data.effortLevel,
    reflection: data.reflection,
    check_in_window: data.checkInWindow,
    event_type: data.eventType || (data.status === 'yes' ? 'daily_checkin_yes' : 'daily_checkin_not_yet'),
  });
  return { ...doc.toObject(), id: doc._id.toString() };
}
