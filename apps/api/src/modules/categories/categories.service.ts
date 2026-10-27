import { db } from '../../shared/db';
import { AppError } from '../../shared/errors';
import { toCategoryDto } from '../../shared/mappers';

export const categoriesService = {
  async listActive() {
    const categories = await db().categories.list({ onlyActive: true });
    const withCounts = await Promise.all(
      categories.map(async (c) => toCategoryDto(c, await db().categories.countProducts(c.id))),
    );
    return withCounts;
  },

  async getBySlug(slug: string) {
    const c = await db().categories.findBySlug(slug);
    if (!c || !c.isActive) throw AppError.notFound('Kategori bulunamadı');
    return toCategoryDto(c, await db().categories.countProducts(c.id));
  },
};
