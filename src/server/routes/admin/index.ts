import { Hono } from 'hono';
import { requireAuth, requireRole, type AuthVariables } from '@/lib/auth/middleware';
import { adminBookingsRoute } from './bookings';
import { adminDriversRoute } from './drivers';
import { adminVehiclesRoute } from './vehicles';
import { adminStatsRoute } from './stats';
import { adminReceiptsRoute } from './receipts';
import { adminEarningsRoute } from './earnings';

/**
 * Admin / dispatcher API surface. Guarded at the group level by
 * requireAuth + requireRole(SUPER_ADMIN | DISPATCHER) — every sub-route can
 * therefore assume a staff user on c.get('user'). Mounted at /api/admin by
 * src/server/app.ts.
 */
export const adminRoute = new Hono<{ Variables: AuthVariables }>();

adminRoute.use('*', requireAuth, requireRole(['SUPER_ADMIN', 'DISPATCHER']));

adminRoute.route('/bookings', adminBookingsRoute);
adminRoute.route('/drivers', adminDriversRoute);
adminRoute.route('/vehicles', adminVehiclesRoute);
adminRoute.route('/stats', adminStatsRoute);
adminRoute.route('/receipts', adminReceiptsRoute);
adminRoute.route('/earnings', adminEarningsRoute);
