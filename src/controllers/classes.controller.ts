// src/controllers/classes.controller.ts
// ONLY CHANGE vs. the original file: import ClassService instead of
// ClassesProvider. Everything else (validation calls, response shapes,
// Swagger docs) is unchanged — proof that swapping the business-logic
// layer underneath a controller doesn't require touching its HTTP contract.

import { Request, Response, NextFunction } from 'express';
import ApiResponse from '../utils/response';
import { handleControllerError } from '../utils/handleControllerError';
import { ClassService } from '../services/class.service';
import { validateCreateClass, validateUpdateClass } from '../validators/classes.validator';
import { CreateClassBody, BulkEnrollBody } from '../types/api.types';

export async function listClasses(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await ClassService.list({
      courseId: req.query.courseId as string | undefined,
      page:     req.query.page    as string | undefined,
      limit:    req.query.limit   as string | undefined,
    });
    return res.status(200).json(ApiResponse.success('Classes retrieved', data));
  } catch (err: any) { return handleControllerError(err, res, next); }
}

export async function getClass(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await ClassService.getById(Number(req.params.id));
    return res.status(200).json(ApiResponse.success('Class retrieved', data));
  } catch (err: any) { return handleControllerError(err, res, next); }
}

export async function createClass(
  req: Request<{}, {}, CreateClassBody>,
  res: Response,
  next: NextFunction,
) {
  const violations = validateCreateClass(req.body);
  if (violations.length) return res.status(400).json(ApiResponse.validationError(violations));
  try {
    const data = await ClassService.create(req.body, req.user!.id);
    return res.status(201).json(ApiResponse.success('Class created', data));
  } catch (err: any) { return handleControllerError(err, res, next); }
}

export async function bulkEnroll(
  req: Request<{ id: string }, {}, BulkEnrollBody>,
  res: Response,
  next: NextFunction,
) {
  const classId = Number(req.params.id);
  if (!Number.isInteger(classId) || classId <= 0)
    return res.status(400).json(ApiResponse.error('Invalid class id'));

  const { emails } = req.body;
  if (!Array.isArray(emails) || emails.length === 0)
    return res.status(400).json(
      ApiResponse.validationError([{ field: 'emails', rule: 'required', message: 'emails must be a non-empty array' }])
    );

  try {
    const data = await ClassService.bulkEnroll(classId, emails, req.user!.id, req.user!.role);
    return res.status(201).json(ApiResponse.success('Bulk enrolled', data));
  } catch (err: any) { return handleControllerError(err, res, next); }
}

export async function updateClass(req: Request, res: Response, next: NextFunction) {
  const violations = validateUpdateClass(req.body);
  if (violations.length) return res.status(400).json(ApiResponse.validationError(violations));
  try {
    const data = await ClassService.update(Number(req.params.id), req.body, req.user!.id, req.user!.role);
    return res.status(200).json(ApiResponse.success('Class updated', data));
  } catch (err: any) { return handleControllerError(err, res, next); }
}

export async function deleteClass(req: Request, res: Response, next: NextFunction) {
  try {
    await ClassService.remove(Number(req.params.id), req.user!.id, req.user!.role);
    return res.status(200).json(ApiResponse.success('Class deleted'));
  } catch (err: any) { return handleControllerError(err, res, next); }
}
