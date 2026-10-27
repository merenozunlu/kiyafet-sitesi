import { Router } from 'express';
import { changePasswordSchema, updateProfileSchema } from '@shop/shared';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler, getValidated, validate } from '../../middleware/validate';
import { db } from '../../shared/db';
import { AppError } from '../../shared/errors';
import { toUserDto } from '../../shared/mappers';
import { authService } from '../auth/auth.service';

export const usersRouter = Router();
usersRouter.use(requireAuth);

usersRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    const user = await db().users.findById(req.user!.id);
    if (!user) throw AppError.notFound();
    res.json({ data: toUserDto(user) });
  }),
);

usersRouter.patch(
  '/me',
  validate(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const input = getValidated(res, updateProfileSchema);
    const patch: Record<string, unknown> = {};
    if (input.firstName !== undefined) patch.firstName = input.firstName;
    if (input.lastName !== undefined) patch.lastName = input.lastName;
    if (input.phone !== undefined) patch.phone = input.phone;
    const user = await db().users.update(req.user!.id, patch);
    res.json({ data: toUserDto(user) });
  }),
);

usersRouter.post(
  '/me/change-password',
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = getValidated(res, changePasswordSchema);
    await authService.changePassword(req.user!.id, currentPassword, newPassword);
    res.status(204).end();
  }),
);
