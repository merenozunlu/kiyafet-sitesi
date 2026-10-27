import { Router } from 'express';
import { favoriteMergeSchema } from '@shop/shared';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler, getValidated, validate } from '../../middleware/validate';
import { db } from '../../shared/db';
import { AppError } from '../../shared/errors';
import { toProductListItemDto } from '../../shared/mappers';

export const favoritesRouter = Router();
favoritesRouter.use(requireAuth);

async function listFor(userId: string) {
  const favs = await db().favorites.listByUser(userId);
  const products = await db().products.findManyByIds(favs.map((f) => f.productId));
  const cats = new Map((await db().categories.list()).map((c) => [c.id, c]));
  const order = new Map(favs.map((f, i) => [f.productId, i]));
  return products
    .filter((p) => p.status === 'ACTIVE' && !p.deletedAt)
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    .flatMap((p) => {
      const c = cats.get(p.categoryId);
      return c ? [toProductListItemDto(p, c)] : [];
    });
}

favoritesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ data: await listFor(req.user!.id) });
  }),
);

favoritesRouter.post(
  '/merge',
  validate(favoriteMergeSchema),
  asyncHandler(async (req, res) => {
    const { productIds } = getValidated(res, favoriteMergeSchema);
    const existing = await db().products.findManyByIds(productIds);
    for (const p of existing) if (p.status === 'ACTIVE') await db().favorites.add(req.user!.id, p.id);
    res.json({ data: await listFor(req.user!.id) });
  }),
);

favoritesRouter.post(
  '/:productId',
  asyncHandler(async (req, res) => {
    const productId = String(req.params.productId);
    const p = await db().products.findById(productId);
    if (!p || p.status !== 'ACTIVE') throw AppError.notFound('Ürün bulunamadı');
    await db().favorites.add(req.user!.id, productId);
    res.status(201).json({ data: { productId } });
  }),
);

favoritesRouter.delete(
  '/:productId',
  asyncHandler(async (req, res) => {
    await db().favorites.remove(req.user!.id, String(req.params.productId));
    res.status(204).end();
  }),
);
