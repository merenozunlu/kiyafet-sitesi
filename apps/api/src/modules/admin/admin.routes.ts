import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import {
  adminCustomerListQuerySchema,
  adminOrderListQuerySchema,
  adminProductListQuerySchema,
  categoryInputSchema,
  categoryUpdateSchema,
  paginationQuerySchema,
  productInputSchema,
  productUpdateSchema,
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
} from '@shop/shared';
import { env } from '../../config/env';
import { requireAuth, requireRole } from '../../middleware/auth';
import { asyncHandler, getValidated, validate } from '../../middleware/validate';
import { AppError } from '../../shared/errors';
import { ordersService } from '../orders/orders.service';
import { adminService } from './admin.service';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('ADMIN'));

// ---------- Dashboard ----------
adminRouter.get('/dashboard', asyncHandler(async (_req, res) => res.json({ data: await adminService.dashboard() })));

// ---------- Ürünler ----------
adminRouter.get(
  '/products',
  validate(adminProductListQuerySchema, 'query'),
  asyncHandler(async (req, res) => res.json(await adminService.listProducts(getValidated(res, adminProductListQuerySchema, 'query')))),
);
adminRouter.get('/products/:id', asyncHandler(async (req, res) => res.json({ data: await adminService.getProduct(String(req.params.id)) })));
adminRouter.post(
  '/products',
  validate(productInputSchema),
  asyncHandler(async (req, res) => res.status(201).json({ data: await adminService.createProduct(getValidated(res, productInputSchema), req.user!.id) })),
);
adminRouter.patch(
  '/products/:id',
  validate(productUpdateSchema),
  asyncHandler(async (req, res) => res.json({ data: await adminService.updateProduct(String(req.params.id), getValidated(res, productUpdateSchema), req.user!.id) })),
);
adminRouter.delete(
  '/products/:id',
  asyncHandler(async (req, res) => {
    await adminService.deleteProduct(String(req.params.id), req.user!.id);
    res.status(204).end();
  }),
);

// ---------- Görsel yükleme (yerel disk adaptörü) ----------
const ALLOWED_MIME = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);
const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ALLOWED_MIME.get(file.mimetype) ?? ''}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) return cb(AppError.validation('Yalnızca JPEG, PNG veya WebP görseller yüklenebilir'));
    cb(null, true);
  },
});

adminRouter.post(
  '/uploads',
  (req, res, next) =>
    upload.single('file')(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        return next(AppError.validation(err.code === 'LIMIT_FILE_SIZE' ? 'Görsel en fazla 5 MB olabilir' : 'Dosya yüklenemedi'));
      }
      next(err);
    }),
  asyncHandler(async (req, res) => {
    if (!req.file) throw AppError.validation('Dosya bulunamadı (alan adı: file)');
    const url = `/uploads/${req.file.filename}`;
    await adminService.audit(req.user!.id, 'upload.create', 'Upload', req.file.filename, { size: req.file.size, mimetype: req.file.mimetype });
    res.status(201).json({ data: { url, filename: req.file.filename, size: req.file.size } });
  }),
);

// ---------- Kategoriler ----------
adminRouter.get('/categories', asyncHandler(async (_req, res) => res.json({ data: await adminService.listCategories() })));
adminRouter.post(
  '/categories',
  validate(categoryInputSchema),
  asyncHandler(async (req, res) => res.status(201).json({ data: await adminService.createCategory(getValidated(res, categoryInputSchema), req.user!.id) })),
);
adminRouter.patch(
  '/categories/:id',
  validate(categoryUpdateSchema),
  asyncHandler(async (req, res) => res.json({ data: await adminService.updateCategory(String(req.params.id), getValidated(res, categoryUpdateSchema), req.user!.id) })),
);
adminRouter.delete(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    await adminService.deleteCategory(String(req.params.id), req.user!.id);
    res.status(204).end();
  }),
);

// ---------- Siparişler ----------
adminRouter.get(
  '/orders',
  validate(adminOrderListQuerySchema, 'query'),
  asyncHandler(async (req, res) => res.json(await adminService.listOrders(getValidated(res, adminOrderListQuerySchema, 'query')))),
);
adminRouter.get('/orders/:id', asyncHandler(async (req, res) => res.json({ data: await adminService.getOrder(String(req.params.id)) })));
adminRouter.patch(
  '/orders/:id/status',
  validate(updateOrderStatusSchema),
  asyncHandler(async (req, res) => {
    const input = getValidated(res, updateOrderStatusSchema);
    const order = await ordersService.adminUpdateStatus(String(req.params.id), input.status, { note: input.note, trackingNumber: input.trackingNumber, adminId: req.user!.id });
    await adminService.audit(req.user!.id, 'order.status', 'Order', order.id, { to: input.status, trackingNumber: input.trackingNumber ?? null });
    res.json({ data: order });
  }),
);
adminRouter.patch(
  '/orders/:id/payment-status',
  validate(updatePaymentStatusSchema),
  asyncHandler(async (req, res) => {
    const input = getValidated(res, updatePaymentStatusSchema);
    const order = await ordersService.adminUpdatePaymentStatus(String(req.params.id), input.paymentStatus, { note: input.note, adminId: req.user!.id });
    await adminService.audit(req.user!.id, 'order.payment-status', 'Order', order.id, { to: input.paymentStatus });
    res.json({ data: order });
  }),
);

// ---------- Müşteriler ----------
adminRouter.get(
  '/customers',
  validate(adminCustomerListQuerySchema, 'query'),
  asyncHandler(async (req, res) => res.json(await adminService.listCustomers(getValidated(res, adminCustomerListQuerySchema, 'query')))),
);

// ---------- Audit log ----------
adminRouter.get(
  '/audit-logs',
  validate(paginationQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, pageSize } = getValidated(res, paginationQuerySchema, 'query');
    res.json(await adminService.listAuditLogs(page, pageSize));
  }),
);
