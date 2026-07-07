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
  receipts: {
    byId: (id: string) => `/api/receipts/${id}`,
  },
  quotes: {
    create: '/api/quotes',
  },
  tours: {
    list: '/api/tours',
    quote: '/api/tours/quote',
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
  fleet: {
    status: '/api/fleet',
  },
  driver: {
    me: '/api/driver/me',
    jobs: '/api/driver/jobs',
    advance: (id: string) => `/api/driver/jobs/${id}/advance`,
  },
  admin: {
    bookings: {
      list: '/api/admin/bookings',
      byId: (id: string) => `/api/admin/bookings/${id}`,
      assign: (id: string) => `/api/admin/bookings/${id}/assign`,
      status: (id: string) => `/api/admin/bookings/${id}/status`,
      refund: (id: string) => `/api/admin/bookings/${id}/refund`,
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
      create: '/api/admin/vehicles',
      byId: (id: string) => `/api/admin/vehicles/${id}`,
      update: (id: string) => `/api/admin/vehicles/${id}`,
      remove: (id: string) => `/api/admin/vehicles/${id}`,
    },
    stats: {
      overview: '/api/admin/stats/overview',
    },
    receipts: {
      list: '/api/admin/receipts',
      create: '/api/admin/receipts',
      byId: (id: string) => `/api/admin/receipts/${id}`,
    },
  },
  health: '/api/health',
} as const;
