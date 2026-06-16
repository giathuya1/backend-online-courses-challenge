// src/routes/roles.ts
// Routes only — no logic, no Swagger annotations (moved to controller).

import { Router } from 'express';
import { authMiddleware, authorize } from '../middleware/auth';
import * as RolesController from '../controllers/roles.controller';

const router = Router();

router.get( '/',       authMiddleware, authorize(['admin']), RolesController.listRoles);
router.post('/assign', authMiddleware, authorize(['admin']), RolesController.assignRole);

export default router;