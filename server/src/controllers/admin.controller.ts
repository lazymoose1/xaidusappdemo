import { Request, Response, NextFunction } from 'express';
import { User } from '../models';
import { logger } from '../lib/logger';

/**
 * POST /api/admin/users/role
 * System-key protected. Body: { email, role }
 *
 * Remediation for accounts created with the wrong role (e.g. parents/leaders
 * who were stuck as 'teen' before the signup race fix). Operator-driven because
 * signup intent isn't stored, so affected accounts can't be auto-detected.
 */
export async function setUserRole(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, role } = req.body as { email: string; role: string };

    const escaped = email.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await User.findOne({ email: new RegExp(`^${escaped}$`, 'i') });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const previousRole = user.role;
    if (previousRole === role) {
      return res.json({ id: (user._id as any).toString(), email: user.email, role: user.role, previousRole, changed: false });
    }

    user.role = role;
    await user.save();

    logger.warn(
      { email: user.email, userId: (user._id as any).toString(), from: previousRole, to: role },
      'admin role remediation applied',
    );

    return res.json({ id: (user._id as any).toString(), email: user.email, role: user.role, previousRole, changed: true });
  } catch (err) {
    next(err);
  }
}
