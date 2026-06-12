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
  feedback: {
    submit: '/api/complaint',
  },
  admin: {
    bookings: {
      list: '/api/admin/bookings',
      byId: (id: string) => `/api/admin/bookings/${id}`,
      assign: (id: string) => `/api/admin/bookings/${id}/assign`,
      status: (id: string) => `/api/admin/bookings/${id}/status`,
    },
    drivers: {
      list: '/api/admin/drivers',
      byId: (id: string) => `/api/admin/drivers/${id}`,
      create: '/api/admin/drivers',
      update: (id: string) => `/api/admin/drivers/${id}`,
      online: (id: string) => `/api/admin/drivers/${id}/online`,
      verifyDocument: (id: string, docId: string) =>
        `/api/admin/drivers/${id}/documents/${docId}/verify`,
    },
    vehicles: {
      list: '/api/admin/vehicles',
    },
    stats: {
      overview: '/api/admin/stats/overview',
    },
  },
  health: '/api/health',
} as const;
