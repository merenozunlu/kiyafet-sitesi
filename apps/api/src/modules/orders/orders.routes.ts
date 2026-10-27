import { Router } from 'express';
import { z } from 'zod';
import { cancelOrderSchema, createOrderSchema, paginationQuerySchema } from '@shop/shared';
import { optionalAuth, requireAuth } from '../../middleware/auth';
import { asyncHandler, getValidated, validate } from '../../middleware/validate';
import { AppError } from '../../shared/errors';
import { ordersService } from './orders.service';

export const ordersRouter = Router();

const idempotencyHeader = z.string().min(8).max(128);

ordersRouter.post(
  '/',
  optionalAuth,
  validate(createOrderSchema),
  asyncHandler(async (req, res) => {
    const key = idempotencyHeader.safeParse(req.get('Idempotency-Key'));
    if (!key.success) throw AppError.validation('Idempotency-Key başlığı zorunludur (8-128 karakter)');
    const input = getValidated(res, createOrderSchema);
    const { order, created } = await ordersService.create(input, req.user ?? null, key.data);
    res.status(created ? 201 : 200).json({ data: order });
  }),
);

const trackQuery = z.object({ email: z.string().email() });
ordersRouter.get(
  '/track/:orderNumber',
  validate(trackQuery, 'query'),
  asyncHandler(async (req, res) => {
    const { email } = getValidated(res, trackQuery, 'query');
    res.json({ data: await ordersService.track(String(req.params.orderNumber), email) });
  }),
);

ordersRouter.get(
  '/',
  requireAuth,
  validate(paginationQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, pageSize } = getValidated(res, paginationQuerySchema, 'query');
    res.json(await ordersService.listForUser(req.user!.id, page, pageSize));
  }),
);

ordersRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ data: await ordersService.getForUser(req.user!.id, String(req.params.id)) });
  }),
);

ordersRouter.post(
  '/:id/cancel',
  requireAuth,
  validate(cancelOrderSchema),
  asyncHandler(async (req, res) => {
    const { reason } = getValidated(res, cancelOrderSchema);
    res.json({ data: await ordersService.cancelByCustomer(req.user!.id, String(req.params.id), reason) });
  }),
);
