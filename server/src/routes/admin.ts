import { Router } from 'express';
import { requireApiKey } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as adminController from '../controllers/admin.controller';
import { z } from 'zod';

const router = Router();

const setRoleSchema = z.object({
  email: z.string().email(),
  role: z.enum(['teen', 'parent', 'scout_leader', 'educator', 'admin']),
});

// POST /api/admin/users/role — system-key protected role remediation
router.post('/users/role', requireApiKey, validate(setRoleSchema), adminController.setUserRole);

export default router;
