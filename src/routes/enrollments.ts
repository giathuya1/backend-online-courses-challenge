// src/routes/enrollments.ts

import { Router } from 'express';
import { authMiddleware, authorize } from '../middleware/auth';
import * as EnrollmentsController from '../controllers/enrollments.controller';

const router = Router();

router.post( '/',           authMiddleware, authorize(['student', 'admin']), EnrollmentsController.enroll);
router.get(  '/',           authMiddleware, EnrollmentsController.listEnrollments);
router.delete('/:id',       authMiddleware, EnrollmentsController.dropEnrollment);
router.put(  '/:id/status', authMiddleware, authorize(['instructor', 'admin']), EnrollmentsController.updateEnrollmentStatus);

export default router; 