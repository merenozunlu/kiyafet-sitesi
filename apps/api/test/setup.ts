process.env.NODE_ENV = 'test';
process.env.DATA_SOURCE = 'prisma';
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'file:./dev.db';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'test-access-secret-0123456789';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-0123456789';
process.env.ACCESS_TOKEN_TTL = '15m';
