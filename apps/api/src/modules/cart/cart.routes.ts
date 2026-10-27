import { Router } from 'express';
import { cartLineSchema, cartLinesSchema, cartQuantitySchema } from '@shop/shared';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler, getValidated, validate } from '../../middleware/validate';
import { cartService } from './cart.service';

export const cartRouter = Router();

// Misafir doğrulaması: kimlik gerektirmez
cartRouter.post(
  '/validate',
  validate(cartLinesSchema),
  asyncHandler(async (_req, res) => {
    const { items } = getValidated(res, cartLinesSchema);
    res.json({ data: await cartService.validateGuest(items) });
  }),
);

cartRouter.use(requireAuth);

cartRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ data: await cartService.getForUser(req.user!.id) });
  }),
);

cartRouter.post(
  '/items',
  validate(cartLineSchema),
  asyncHandler(async (req, res) => {
    res.json({ data: await cartService.addItem(req.user!.id, getValidated(res, cartLineSchema)) });
  }),
);

cartRouter.patch(
  '/items/:itemId',
  validate(cartQuantitySchema),
  asyncHandler(async (req, res) => {
    const { quantity } = getValidated(res, cartQuantitySchema);
    res.json({ data: await cartService.updateItem(req.user!.id, String(req.params.itemId), quantity) });
  }),
);

cartRouter.delete(
  '/items/:itemId',
  asyncHandler(async (req, res) => {
    res.json({ data: await cartService.removeItem(req.user!.id, String(req.params.itemId)) });
  }),
);

cartRouter.delete(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ data: await cartService.clear(req.user!.id) });
  }),
);

cartRouter.post(
  '/merge',
  validate(cartLinesSchema),
  asyncHandler(async (req, res) => {
    const { items } = getValidated(res, cartLinesSchema);
    res.json({ data: await cartService.merge(req.user!.id, items) });
  }),
);
