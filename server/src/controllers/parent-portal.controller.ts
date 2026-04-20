import { Request, Response, NextFunction } from 'express';
import * as parentPortalService from '../services/parent-portal.service';
import * as userService from '../services/user.service';
import { sendParentEmail } from '../services/notification.service';
import * as parentChildLinkRepo from '../repositories/parent-child-link.repo';
import * as userRepo from '../repositories/user.repo';
import { z } from 'zod';

export async function getOverview(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    return res.json(parentPortalService.getOverview());
  } catch (err) {
    next(err);
  }
}

export async function getChildren(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const children = await parentPortalService.getChildren(req.user.id);
    return res.json(children);
  } catch (err) {
    next(err);
  }
}

export async function addChild(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { troopCode, nickname } = z.object({
      troopCode: z.string().optional(),
      nickname: z.string().min(1),
    }).parse(req.body);

    // Find the scout by nickname (and optionally troop code)
    const teen = await userRepo.findScoutByNickname(nickname, troopCode);
    if (!teen) {
      const msg = troopCode
        ? 'No scout found with that troop code and nickname.'
        : 'No scout found with that nickname. If there are multiple scouts with similar names, ask for the troop code.';
      return res.status(404).json({ error: msg });
    }
    if (teen.id === req.user.id) return res.status(400).json({ error: 'You cannot link yourself.' });

    // Create link (unique index will silently handle duplicates via upsert)
    await parentChildLinkRepo.create(req.user.id, teen.id).catch(() => {});

    // Return the updated children list
    const children = await parentPortalService.getChildren(req.user.id);
    return res.status(201).json(children);
  } catch (err) {
    next(err);
  }
}

export async function getWeeklySummary(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const summary = await parentPortalService.getWeeklySummary(req.user.id);
    return res.json(summary);
  } catch (err) {
    next(err);
  }
}

export async function sendWeeklySummary(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const summary = await parentPortalService.getWeeklySummary(req.user.id);
    const profile = await userService.getProfile(req.user.id);
    const parentContact = (profile as any)?.parentContact || (profile as any)?.parent_contact;
    // We need the raw user data for parent contact info
    const { User } = await import('../models');
    const user = await User.findById(req.user.id).lean();

    const contact = user?.parent_contact as any;
    const email = contact?.email;
    const optedIn = Boolean(
      contact?.optIn || (user?.consent_flags as any)?.parentEmails,
    );

    const emailCheck = z.string().email().safeParse(email);
    if (!emailCheck.success || !optedIn) {
      return res
        .status(400)
        .json({ error: 'Parent email not configured or not opted in' });
    }

    const subject = `Weekly snapshot: ${summary.goalsCompleted}/${summary.goalsSet} completed`;
    const text = [
      `Goals set: ${summary.goalsSet}`,
      `Goals completed: ${summary.goalsCompleted}`,
      `Coach style: ${summary.coachStyle}`,
      `Cadence: ${summary.cadence}`,
      '',
      'Conversation starters:',
      ...summary.conversationStarters.map((c, i) => `${i + 1}. ${c}`),
    ].join('\n');

    const html = `
      <h2>Weekly snapshot</h2>
      <p><strong>Goals set:</strong> ${summary.goalsSet}</p>
      <p><strong>Goals completed:</strong> ${summary.goalsCompleted}</p>
      <p><strong>Coach style:</strong> ${summary.coachStyle}</p>
      <p><strong>Cadence:</strong> ${summary.cadence}</p>
      <h3>Conversation starters</h3>
      <ul>
        ${summary.conversationStarters.map((c) => `<li>${c}</li>`).join('')}
      </ul>
    `;

    await sendParentEmail(email, subject, text, html);
    await User.findByIdAndUpdate(req.user.id, {
      parent_contact: { ...(contact || {}), lastSent: new Date().toISOString() },
    });

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function getAISuggestedGoals(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const result = await parentPortalService.getAISuggestedGoals(req.user.id);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function submitFeedback(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { childId, goalId } = req.params;

    // Verify parent has a link to this child
    const links = await parentChildLinkRepo.findChildrenByParent(req.user.id);
    const hasLink = links.some((l) => l.child.id === childId);
    if (!hasLink) {
      return res.status(403).json({ error: 'Not authorized for this child' });
    }

    const result = await parentPortalService.submitFeedback(
      childId,
      goalId,
      req.body,
    );
    return res.json({ success: true, feedback: result });
  } catch (err) {
    next(err);
  }
}

export async function getDashboard(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const dashboard = await parentPortalService.getDashboard(req.user.id);
    return res.json(dashboard);
  } catch (err) {
    next(err);
  }
}
