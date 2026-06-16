// src/routes/classes.ts

import { Router } from 'express';
import { authMiddleware, authorize } from '../middleware/auth';
import * as ClassesController from '../controllers/classes.controller';

const router = Router();

router.get( '/',                authMiddleware, ClassesController.listClasses);
router.get( '/:id',             ClassesController.getClass);
router.post('/',                authMiddleware, authorize(['instructor', 'admin']), ClassesController.createClass);
router.post('/:id/bulk-enroll', authMiddleware, authorize(['instructor', 'admin']), ClassesController.bulkEnroll);
router.put( '/:id',             authMiddleware, authorize(['instructor', 'admin']), ClassesController.updateClass);
router.delete('/:id',           authMiddleware, authorize(['instructor', 'admin']), ClassesController.deleteClass);

export default router;