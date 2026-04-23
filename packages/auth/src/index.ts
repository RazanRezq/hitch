import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '@hitch/db';

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3001',
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days rolling
    updateAge: 60 * 60 * 24, // 1 day
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'PASSENGER',
      },
      phone: {
        type: 'string',
        required: false,
      },
      preferredLocale: {
        type: 'string',
        required: false,
        defaultValue: 'is',
      },
      preferredCurrency: {
        type: 'string',
        required: false,
        defaultValue: 'ISK',
      },
    },
  },
});

export type Auth = typeof auth;
export type Session = Auth['$Infer']['Session'];

export * from './middleware';
