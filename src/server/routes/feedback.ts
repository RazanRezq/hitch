import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { feedbackSubmitSchema } from '@/lib/types';
import { generateFeedbackReference } from '@/lib/utils';
import { prisma } from '@/lib/db';
import { consumeRateLimit } from '@/server/middleware/rate-limit';
import { notifyFeedback } from '@/server/services/feedback/notify';

/**
 * POST /api/complaint — public, no auth. Accessed from the in-vehicle QR form.
 *
 * Order matters: validate → honeypot → rate-limit → save to DB FIRST →
 * fire-and-forget the dual email. Email failures never affect the response
 * (graceful degradation).
 */

export const feedbackRoute = new Hono().post(
  '/',
  zValidator('json', feedbackSubmitSchema),
  async (c) => {
    const body = c.req.valid('json');

    // Honeypot: pretend success so bots don't learn they were caught. Checked
    // BEFORE the rate limit so bots don't learn that exists either.
    if (body.website) {
      return c.json({ ok: true });
    }

    // 5 submissions / minute / IP.
    if (!(await consumeRateLimit(c, { prefix: 'feedback', limit: 5 }))) {
      return c.json({ error: 'Too many submissions. Please try again later.' }, 429);
    }

    const data = {
      name: body.name,
      phone: body.phone,
      email: body.email,
      bookingReference: body.bookingReference,
      carNumber: body.carNumber,
      driverName: body.driverName,
      incidentLocation: body.incidentLocation,
      pickupLocation: body.pickupLocation,
      dropoffLocation: body.dropoffLocation,
      incidentDateTime: body.incidentDateTime,
      description: body.description,
      requestRefund: body.requestRefund,
      notifyAuthorities: body.notifyAuthorities,
      attachments: body.attachments,
      locale: body.locale,
    };

    // Save FIRST. This is the only failure that should reach the user. Each row
    // gets a unique human-friendly reference; retry on the (vanishingly rare)
    // P2002 unique collision before giving up.
    let feedback;
    for (let attempt = 0; ; attempt++) {
      try {
        feedback = await prisma.feedback.create({
          data: { ...data, reference: generateFeedbackReference() },
        });
        break;
      } catch (err) {
        if (attempt < 4 && (err as { code?: string }).code === 'P2002') continue;
        throw err;
      }
    }

    // Fire-and-forget: never block or fail the response on email delivery.
    void notifyFeedback(feedback).catch((err) => console.error('[feedback.notify]', err));

    return c.json({ ok: true, id: feedback.id, reference: feedback.reference }, 201);
  },
);
