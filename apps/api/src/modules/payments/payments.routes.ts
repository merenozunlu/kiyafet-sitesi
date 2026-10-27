import { Router, type Request } from 'express';
import { z } from 'zod';
import { cardInputSchema } from '@shop/shared';
import { optionalAuth, requireAuth } from '../../middleware/auth';
import { asyncHandler, getValidated, validate } from '../../middleware/validate';
import { db } from '../../shared/db';
import { AppError } from '../../shared/errors';
import { getPaymentProvider } from './index';
import { ordersService, orderToDto } from '../orders/orders.service';

export const paymentsRouter = Router();

/**
 * Bekleyen kart ödemesini yeniden başlatır (ör. ilk deneme PENDING kaldıysa).
 * Kart verisi yalnızca istek gövdesinde yaşar; saklanmaz, loglanmaz.
 */
const initSchema = z.object({ orderId: z.string().min(1), card: cardInputSchema });
paymentsRouter.post(
  '/initialize',
  optionalAuth,
  validate(initSchema),
  asyncHandler(async (req, res) => {
    const { orderId, card } = getValidated(res, initSchema);
    const order = await db().orders.findById(orderId);
    if (!order) throw AppError.notFound('Sipariş bulunamadı');
    if (order.userId && order.userId !== req.user?.id) throw AppError.notFound('Sipariş bulunamadı');
    if (order.paymentMethod !== 'CREDIT_CARD' || order.paymentStatus !== 'PENDING' || order.status !== 'PENDING') {
      throw AppError.invalidTransition('Bu sipariş için ödeme yeniden başlatılamaz');
    }
    const payment = order.payment;
    if (!payment) throw AppError.notFound('Ödeme kaydı bulunamadı');
    const provider = getPaymentProvider();
    const email = order.guestEmail ?? req.user?.email ?? '';
    const init = await provider.initializePayment({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amountCents: order.totalCents,
      currency: 'TRY',
      buyer: { email, firstName: order.shippingAddress.firstName, lastName: order.shippingAddress.lastName, phone: order.shippingAddress.phone },
      card,
    });
    await db().payments.update(payment.id, { providerPaymentId: init.providerPaymentId, cardLast4: init.cardLast4 ?? null, failureReason: init.failureReason ?? null });
    const verified = await provider.verifyPayment(init.providerPaymentId);
    await ordersService.applyProviderEvent({ eventId: `init:${init.providerPaymentId}`, providerPaymentId: init.providerPaymentId, status: verified.status });
    const fresh = (await db().orders.findById(order.id))!;
    if (verified.status === 'FAILED') throw new AppError(402, 'PAYMENT_FAILED', `Ödeme alınamadı: ${init.failureReason ?? 'bilinmeyen neden'}`);
    res.json({ data: await orderToDto(fresh) });
  }),
);

paymentsRouter.get(
  '/:id/status',
  requireAuth,
  asyncHandler(async (req, res) => {
    const payment = await db().payments.findById(String(req.params.id));
    if (!payment) throw AppError.notFound('Ödeme bulunamadı');
    const order = await db().orders.findById(payment.orderId);
    if (!order || (order.userId !== req.user!.id && req.user!.role !== 'ADMIN')) throw AppError.notFound('Ödeme bulunamadı');
    res.json({ data: { status: payment.status, reference: payment.reference, provider: payment.provider } });
  }),
);

/**
 * Sağlayıcı webhook'u. İmza doğrulaması sağlayıcı adaptöründe yapılır.
 * Aynı eventId tekrar gelirse 200 döner ve hiçbir şey değişmez.
 */
paymentsRouter.post(
  '/webhook',
  asyncHandler(async (req, res) => {
    const raw = (req as Request & { rawBody?: Buffer }).rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    const event = await getPaymentProvider().handleWebhook(raw, req.headers as Record<string, string | string[] | undefined>);
    const result = await ordersService.applyProviderEvent(event);
    res.json({ received: true, applied: result.applied });
  }),
);
