import { Router } from 'express';
import { addressInputSchema, addressUpdateSchema } from '@shop/shared';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler, getValidated, validate } from '../../middleware/validate';
import { db } from '../../shared/db';
import { AppError } from '../../shared/errors';
import { toAddressDto } from '../../shared/mappers';

export const addressesRouter = Router();
addressesRouter.use(requireAuth);

async function ownAddress(userId: string, id: string) {
  const a = await db().addresses.findById(id);
  // Başkasına ait kaynak için de 404 (bilgi sızdırmamak için)
  if (!a || a.userId !== userId) throw AppError.notFound('Adres bulunamadı');
  return a;
}

addressesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const list = await db().addresses.listByUser(req.user!.id);
    res.json({ data: list.map(toAddressDto) });
  }),
);

addressesRouter.post(
  '/',
  validate(addressInputSchema),
  asyncHandler(async (req, res) => {
    const input = getValidated(res, addressInputSchema);
    const userId = req.user!.id;
    const existing = await db().addresses.listByUser(userId);
    const isDefault = input.isDefault || existing.length === 0;
    if (isDefault) await db().addresses.clearDefault(userId);
    const a = await db().addresses.create({
      userId,
      title: input.title,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      city: input.city,
      district: input.district,
      postalCode: input.postalCode ?? null,
      line: input.line,
      isDefault,
    });
    res.status(201).json({ data: toAddressDto(a) });
  }),
);

addressesRouter.patch(
  '/:id',
  validate(addressUpdateSchema),
  asyncHandler(async (req, res) => {
    const input = getValidated(res, addressUpdateSchema);
    const a = await ownAddress(req.user!.id, String(req.params.id));
    if (input.isDefault) await db().addresses.clearDefault(req.user!.id);
    const { isDefault, postalCode, ...rest } = input;
    const updated = await db().addresses.update(a.id, {
      ...rest,
      ...(postalCode !== undefined ? { postalCode: postalCode ?? null } : {}),
      ...(isDefault !== undefined ? { isDefault } : {}),
    });
    res.json({ data: toAddressDto(updated) });
  }),
);

addressesRouter.post(
  '/:id/default',
  asyncHandler(async (req, res) => {
    const a = await ownAddress(req.user!.id, String(req.params.id));
    await db().addresses.clearDefault(req.user!.id);
    const updated = await db().addresses.update(a.id, { isDefault: true });
    res.json({ data: toAddressDto(updated) });
  }),
);

addressesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const a = await ownAddress(req.user!.id, String(req.params.id));
    await db().addresses.delete(a.id);
    if (a.isDefault) {
      const rest = await db().addresses.listByUser(req.user!.id);
      if (rest[0]) await db().addresses.update(rest[0].id, { isDefault: true });
    }
    res.status(204).end();
  }),
);
