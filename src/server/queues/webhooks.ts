import { Queue } from 'bullmq';
import { redis } from '../lib/redis';

/**
 * BullMQ producer for the `webhooks` queue. The route handler writes an
 * outbox row to WebhookEvent and enqueues a job here; the worker
 * (src/server/workers/webhook.worker.ts) consumes and applies the state
 * transition. See CLAUDE.md "Webhook Outbox Pattern".
 */
export const webhooksQueue = new Queue('webhooks', { connection: redis });
