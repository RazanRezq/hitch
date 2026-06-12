'use client';

import { createAuthClient } from 'better-auth/react';

/**
 * Browser auth client for dashboard sign-in / sign-out. Same-origin: the Better
 * Auth handler is mounted at /api/auth inside the Next app, so the default
 * baseURL (current origin) is correct.
 */
export const authClient = createAuthClient();
