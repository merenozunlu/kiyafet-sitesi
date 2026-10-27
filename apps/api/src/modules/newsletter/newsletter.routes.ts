import { Router } from 'express';
import { newsletterSchema } from '@shop/shared';
import { asyncHandler, getValidated, validate } from '../../middleware/validate';
import { sensitiveLimiter } from '../../middleware/rate-limit';
import { logger } from '../../shared/logger';

/**
 * Bülten aboneliği. Bu aşamada e-posta sağlayıcısı entegrasyonu yoktur;
 * adres doğrulanır ve sunucu belleğinde tutulur (geliştirme davranışı, açıkça belirtilmiştir).
 */
const subscribers = new Set<string>();

export const newsletterRouter = Router();

newsletterRouter.post(
  '/',
  sensitiveLimiter,
  validate(newsletterSchema),
  asyncHandler(async (_req, res) => {
    const { email } = getValidated(res, newsletterSchema);
    const already = subscribers.has(email);
    subscribers.add(email);
    logger.info({ email, already }, 'Bülten aboneliği');
    res.json({ data: { message: already ? 'Bu adres zaten kayıtlı.' : 'Bültenimize kaydoldunuz. Teşekkürler!' } });
  }),
);
