import { Router } from 'express';
import { z } from 'zod';
import { productListQuerySchema, searchQuerySchema } from '@shop/shared';
import { asyncHandler, getValidated, validate } from '../../middleware/validate';
import { productsService } from './products.service';

export const productsRouter = Router();

productsRouter.get(
  '/',
  validate(productListQuerySchema, 'query'),
  asyncHandler(async (_req, res) => {
    const query = getValidated(res, productListQuerySchema, 'query');
    res.json(await productsService.list(query));
  }),
);

productsRouter.get(
  '/home',
  asyncHandler(async (_req, res) => {
    res.json({ data: await productsService.home() });
  }),
);

productsRouter.get(
  '/search',
  validate(searchQuerySchema, 'query'),
  asyncHandler(async (_req, res) => {
    const { q, limit } = getValidated(res, searchQuerySchema, 'query');
    res.json({ data: await productsService.search(q, limit) });
  }),
);

productsRouter.get(
  '/slug/:slug',
  asyncHandler(async (req, res) => {
    res.json({ data: await productsService.getBySlug(String(req.params.slug)) });
  }),
);

const relatedQuery = z.object({ limit: z.coerce.number().int().min(1).max(12).default(4) });
productsRouter.get(
  '/:id/related',
  validate(relatedQuery, 'query'),
  asyncHandler(async (req, res) => {
    const { limit } = getValidated(res, relatedQuery, 'query');
    res.json({ data: await productsService.related(String(req.params.id), limit) });
  }),
);

productsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json({ data: await productsService.getById(String(req.params.id)) });
  }),
);
