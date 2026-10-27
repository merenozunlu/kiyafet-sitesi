import { Router } from 'express';
import { productListQuerySchema } from '@shop/shared';
import { asyncHandler, getValidated, validate } from '../../middleware/validate';
import { categoriesService } from './categories.service';
import { productsService } from '../products/products.service';

export const categoriesRouter = Router();

categoriesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ data: await categoriesService.listActive() });
  }),
);

categoriesRouter.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    res.json({ data: await categoriesService.getBySlug(String(req.params.slug)) });
  }),
);

categoriesRouter.get(
  '/:slug/products',
  validate(productListQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = getValidated(res, productListQuerySchema, 'query');
    res.json(await productsService.list(query, String(req.params.slug)));
  }),
);
