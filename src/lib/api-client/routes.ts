/** Centralized API path builder. Never hardcode API paths in components. */
export const API_ROUTES = {
  auth: {
    base: '/api/auth',
  },
  bookings: {
    list: '/api/bookings',
    create: '/api/bookings',
    byId: (id: string) => `/api/bookings/${id}`,
    cancel: (id: string) => `/api/bookings/${id}/cancel`,
    assign: (id: string) => `/api/bookings/${id}/assign`,
  },
  drivers: {
    list: '/api/drivers',
    create: '/api/drivers',
    byId: (id: string) => `/api/drivers/${id}`,
    documents: (id: string) => `/api/drivers/${id}/documents`,
  },
  payments: {
    intent: '/api/payments/intent',
  },
  quotes: {
    create: '/api/quotes',
  },
  uploads: {
    presigned: '/api/uploads/presigned',
  },
  exchangeRates: {
    current: '/api/exchange-rates',
  },
  webhooks: {
    stripe: '/api/webhooks/stripe',
  },
  health: '/api/health',
} as const;
