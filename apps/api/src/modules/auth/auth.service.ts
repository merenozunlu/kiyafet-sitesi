import bcrypt from 'bcryptjs';
import type { AuthResponseDto, LoginInput, RegisterInput } from '@shop/shared';
import { db } from '../../shared/db';
import type { UserEntity } from '../../shared/db/entities';
import { AppError } from '../../shared/errors';
import { toUserDto } from '../../shared/mappers';
import { generateOpaqueToken, hashToken, refreshTokenExpiry, signAccessToken } from '../../shared/tokens';
import { env, isProd } from '../../config/env';
import { logger } from '../../shared/logger';

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer', 10);

export interface SessionResult extends AuthResponseDto {
  refreshToken: string;
  refreshExpiresAt: Date;
}

async function issueSession(user: UserEntity): Promise<SessionResult> {
  const refreshToken = generateOpaqueToken();
  const refreshExpiresAt = refreshTokenExpiry();
  await db().refreshTokens.create({ userId: user.id, tokenHash: hashToken(refreshToken), expiresAt: refreshExpiresAt, revokedAt: null });
  return {
    user: toUserDto(user),
    accessToken: signAccessToken({ sub: user.id, role: user.role, email: user.email }),
    refreshToken,
    refreshExpiresAt,
  };
}

export const authService = {
  async register(input: RegisterInput): Promise<SessionResult> {
    const existing = await db().users.findByEmail(input.email);
    if (existing) throw AppError.conflict('Bu e-posta adresi ile daha önce kayıt olunmuş');
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const user = await db().users.create({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone ?? null,
      role: 'CUSTOMER', // Rol asla istemciden alınmaz
      isActive: true,
    });
    return issueSession(user);
  },

  async login(input: LoginInput): Promise<SessionResult> {
    const user = await db().users.findByEmail(input.email);
    // Zamanlama farkını azaltmak için kullanıcı yoksa da hash karşılaştırması yap
    const ok = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) throw AppError.unauthorized('E-posta veya şifre hatalı');
    if (!user.isActive) throw AppError.unauthorized('Hesabınız pasif durumda. Lütfen destek ile iletişime geçin.');
    return issueSession(user);
  },

  async refresh(rawToken: string | undefined): Promise<SessionResult> {
    if (!rawToken) throw AppError.unauthorized('Oturum bulunamadı');
    const record = await db().refreshTokens.findByHash(hashToken(rawToken));
    if (!record) throw AppError.unauthorized('Oturum geçersiz');
    if (record.revokedAt) {
      // Yeniden kullanım tespiti: iptal edilmiş token kullanıldıysa tüm oturumları kapat
      await db().refreshTokens.revokeAllForUser(record.userId);
      logger.warn({ userId: record.userId }, 'İptal edilmiş refresh token yeniden kullanıldı; tüm oturumlar kapatıldı');
      throw AppError.unauthorized('Oturum geçersiz');
    }
    if (record.expiresAt <= new Date()) throw AppError.unauthorized('Oturum süresi doldu');
    const user = await db().users.findById(record.userId);
    if (!user || !user.isActive) throw AppError.unauthorized('Hesap bulunamadı');
    // Rotation: eskiyi iptal et, yenisini ver
    await db().refreshTokens.revoke(record.id);
    return issueSession(user);
  },

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const record = await db().refreshTokens.findByHash(hashToken(rawToken));
    if (record) await db().refreshTokens.revoke(record.id);
  },

  async forgotPassword(email: string): Promise<{ message: string; debugResetUrl?: string }> {
    const message = 'Bu e-posta kayıtlıysa şifre sıfırlama bağlantısı gönderildi.';
    const user = await db().users.findByEmail(email);
    if (!user || !user.isActive) return { message };
    await db().passwordResetTokens.invalidateAllForUser(user.id);
    const token = generateOpaqueToken(32);
    await db().passwordResetTokens.create({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      usedAt: null,
    });
    const resetUrl = `${env.CORS_ORIGIN.split(',')[0]}/sifre-yenile?token=${token}`;
    // E-posta sağlayıcısı entegrasyonu yok: geliştirmede bağlantı loglanır ve yanıtta döner.
    logger.info({ email: user.email, resetUrl }, 'Şifre sıfırlama bağlantısı (geliştirme)');
    return isProd ? { message } : { message, debugResetUrl: resetUrl };
  },

  async resetPassword(token: string, password: string): Promise<void> {
    const record = await db().passwordResetTokens.findByHash(hashToken(token));
    if (!record || record.usedAt || record.expiresAt <= new Date()) {
      throw AppError.validation('Bağlantı geçersiz veya süresi dolmuş. Lütfen yeni bir bağlantı isteyin.');
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await db().users.update(record.userId, { passwordHash });
    await db().passwordResetTokens.markUsed(record.id);
    await db().refreshTokens.revokeAllForUser(record.userId);
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await db().users.findById(userId);
    if (!user) throw AppError.notFound('Kullanıcı bulunamadı');
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw AppError.validation('Mevcut şifre hatalı', [{ path: 'currentPassword', message: 'Mevcut şifre hatalı' }]);
    await db().users.update(userId, { passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS) });
    await db().refreshTokens.revokeAllForUser(userId);
  },
};
