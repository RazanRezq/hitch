import { Hono } from 'hono';
import type { Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { feedbackSubmitSchema } from '@/lib/types';
import { prisma } from '@/lib/db';
import { redis } from '@/server/lib/redis';
import { notifyFeedback } from '@/server/services/feedback/notify';

/**
 * POST /api/feedback — public, no auth. Accessed from the in-vehicle QR form.
 *
 * Order matters: validate → rate-limit → save to DB FIRST → fire-and-forget the
 * dual email. Email failures never affect the response (graceful degradation).
 */

const RATE_LIMIT = 5;
const RATE_WINDOW_SECONDS = 60;

function clientIp(c: Context): string {
  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return c.req.header('x-real-ip') ?? 'unknown';
}

export const feedbackRoute = new Hono().post(
  '/',
  zValidator('json', feedbackSubmitSchema),
  async (c) => {
    const body = c.req.valid('json');

    // Honeypot: pretend success so bots don't learn they were caught.
    if (body.website) {
      return c.json({ ok: true });
    }

    // Redis rate-limit: 5 submissions / minute / IP.
    const key = `feedback:rl:${clientIp(c)}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, RATE_WINDOW_SECONDS);
    if (count > RATE_LIMIT) {
      return c.json({ error: 'Too many submissions. Please try again later.' }, 429);
    }

    // Save FIRST. This is the only failure that should reach the user.
    const feedback = await prisma.feedback.create({
      data: {
        name: body.name,
        phone: body.phone,
        email: body.email,
        carNumber: body.carNumber,
        driverName: body.driverName,
        incidentLocation: body.incidentLocation,
        pickupLocation: body.pickupLocation,
        dropoffLocation: body.dropoffLocation,
        incidentDateTime: body.incidentDateTime,
        description: body.description,
        requestRefund: body.requestRefund,
        notifyAuthorities: body.notifyAuthorities,
        locale: body.locale,
      },
    });

    // Fire-and-forget: never block or fail the response on email delivery.
    void notifyFeedback(feedback).catch((err) => console.error('[feedback.notify]', err));

    return c.json({ ok: true, id: feedback.id }, 201);
  },
);
