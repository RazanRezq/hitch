import { Hono } from 'hono';
import { Webhook } from 'svix';
import { prisma } from '@/lib/db';
import { USER_ROLES, type UserRole } from '@/lib/types';

/**
 * Clerk → Postgres user sync. Clerk owns identity; this keeps a matching `User`
 * row (by `clerkId`) so RBAC roles and `actorId` foreign keys keep working.
 *
 * svix-signed (CLERK_WEBHOOK_SECRET). Roles live in Postgres: a new user syncs
 * as PASSENGER (or a valid `public_metadata.role`); updates never overwrite an
 * existing DB role, so an admin promoted in the DB stays an admin.
 */

interface ClerkUserEvent {
  type: string;
  data: {
    id: string;
    email_addresses?: { id: string; email_address: string }[];
    primary_email_address_id?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    public_metadata?: { role?: string } | null;
  };
}

function getSecret(): string {
  const s = process.env.CLERK_WEBHOOK_SECRET;
  if (!s) throw new Error('CLERK_WEBHOOK_SECRET is not set');
  return s;
}

function primaryEmail(data: ClerkUserEvent['data']): string | null {
  const list = data.email_addresses ?? [];
  if (list.length === 0) return null;
  const primary = list.find((e) => e.id === data.primary_email_address_id);
  return (primary ?? list[0]).email_address;
}

function metadataRole(data: ClerkUserEvent['data']): UserRole | null {
  const r = data.public_metadata?.role;
  return r && (Object.values(USER_ROLES) as string[]).includes(r) ? (r as UserRole) : null;
}

export const clerkWebhookRoute = new Hono().post('/', async (c) => {
  const rawBody = await c.req.raw.text();
  let evt: ClerkUserEvent;
  try {
    evt = new Webhook(getSecret()).verify(rawBody, {
      'svix-id': c.req.header('svix-id') ?? '',
      'svix-timestamp': c.req.header('svix-timestamp') ?? '',
      'svix-signature': c.req.header('svix-signature') ?? '',
    }) as ClerkUserEvent;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    console.warn('[clerk-webhook] signature verification failed', message);
    return c.json({ error: `Invalid signature: ${message}` }, 400);
  }

  const { type, data } = evt;

  if (type === 'user.created' || type === 'user.updated') {
    const email = primaryEmail(data);
    if (!email) return c.json({ received: true, skipped: 'no email' });
    const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || null;
    await prisma.user.upsert({
      where: { clerkId: data.id },
      // role only set on create — never clobber a DB-assigned role on update.
      create: { clerkId: data.id, email, name, role: metadataRole(data) ?? USER_ROLES.PASSENGER },
      update: { email, name },
    });
    return c.json({ received: true });
  }

  if (type === 'user.deleted') {
    // Keep the row (bookings/audit FKs) but sever the Clerk link → revokes access.
    await prisma.user.updateMany({ where: { clerkId: data.id }, data: { clerkId: null } });
    return c.json({ received: true });
  }

  return c.json({ received: true, ignored: type });
});
