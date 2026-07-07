import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatDateTime } from '@/lib/i18n-shared';
import { verifyGuestToken } from '@/server/lib/guestToken';

const h = vi.hoisted(() => ({
  prisma: { booking: { findUnique: vi.fn() } },
  emailsSend: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: h.prisma }));
vi.mock('@/server/lib/resend', () => ({ resend: { emails: { send: h.emailsSend } } }));

import {
  buildBookingConfirmationEmail,
  bookingConfirmationUrl,
  notifyBookingConfirmed,
  type BookingConfirmationInput,
} from './notify';

const booking: BookingConfirmationInput = {
  id: 'bk_test_1',
  code: 'HTCH-7K9P-XX42',
  pickupAddress: 'Keflavík Airport (KEF), Terminal',
  dropoffAddress: 'Laugavegur 1 & 3, Reykjavík',
  scheduledTime: new Date('2026-07-15T14:30:00Z'),
  passengerCount: 3,
  flightNumber: 'FI615',
  displayPrice: 12500,
  displayCurrency: 'ISK',
};

const URL_IS = 'https://hitch.is/is/book/confirmation/bk_test_1?t=token';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('GUEST_TOKEN_SECRET', 'test-secret');
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://hitch.is');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('buildBookingConfirmationEmail', () => {
  it('renders localized subject with the booking code and the booking link (is)', () => {
    const { subject, text, html } = buildBookingConfirmationEmail(booking, 'is', URL_IS);
    expect(subject).toBe('Bókun staðfest — HTCH-7K9P-XX42');
    expect(text).toContain(URL_IS);
    expect(html).toContain(`href="${URL_IS}"`);
    expect(html).toContain('HTCH-7K9P-XX42');
    expect(html).toContain('lang="is"');
  });

  it('renders the trip details: addresses (escaped), time, pax, and the real ISK price', () => {
    const { html, text } = buildBookingConfirmationEmail(booking, 'is', URL_IS);
    expect(html).toContain('Keflavík Airport (KEF), Terminal');
    expect(html).toContain('Laugavegur 1 &amp; 3, Reykjavík'); // & escaped
    expect(html).toContain(formatDateTime(booking.scheduledTime, 'is'));
    expect(html).toContain('12.500\u00A0kr.'); // ISK: no decimals, dot thousands, NBSP before unit
    expect(text).toContain('12.500\u00A0kr.');
  });

  it('includes the flight row only when a flight number is set (en)', () => {
    const withFlight = buildBookingConfirmationEmail(booking, 'en', URL_IS);
    expect(withFlight.subject).toBe('Booking confirmed — HTCH-7K9P-XX42');
    expect(withFlight.html).toContain('FI615');
    expect(withFlight.html).toContain('Flight number');

    const withoutFlight = buildBookingConfirmationEmail(
      { ...booking, flightNumber: null },
      'en',
      URL_IS,
    );
    expect(withoutFlight.html).not.toContain('Flight number');
  });

  it('falls back to the booking id when no code exists', () => {
    const { subject } = buildBookingConfirmationEmail({ ...booking, code: null }, 'en', URL_IS);
    expect(subject).toBe('Booking confirmed — bk_test_1');
  });
});

describe('bookingConfirmationUrl', () => {
  it('embeds a verifiable guest token for guests', () => {
    const url = bookingConfirmationUrl('bk_test_1', 'en', true);
    expect(url).toMatch(/^https:\/\/hitch\.is\/en\/book\/confirmation\/bk_test_1\?t=/);
    const token = new URL(url).searchParams.get('t');
    expect(token).toBeTruthy();
    expect(verifyGuestToken('bk_test_1', token as string)).toBe(true);
  });

  it('omits the token for account passengers', () => {
    expect(bookingConfirmationUrl('bk_test_1', 'is', false)).toBe(
      'https://hitch.is/is/book/confirmation/bk_test_1',
    );
  });
});

describe('notifyBookingConfirmed', () => {
  it('skips entirely (no DB read, no send) when Resend is not configured', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_placeholder');
    await notifyBookingConfirmed('bk_test_1');
    expect(h.prisma.booking.findUnique).not.toHaveBeenCalled();
    expect(h.emailsSend).not.toHaveBeenCalled();
  });

  it('sends to the passenger with the guest link in the localized email', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_real_key');
    h.prisma.booking.findUnique.mockResolvedValue({
      ...booking,
      passenger: {
        email: 'passenger@example.com',
        name: 'Anna Jónsdóttir',
        preferredLocale: 'is',
        isGuest: true,
      },
    });
    h.emailsSend.mockResolvedValue({ data: { id: 'em_1' }, error: null });

    await notifyBookingConfirmed('bk_test_1');

    expect(h.emailsSend).toHaveBeenCalledTimes(1);
    const payload = h.emailsSend.mock.calls[0][0];
    expect(payload.to).toBe('passenger@example.com');
    expect(payload.subject).toBe('Bókun staðfest — HTCH-7K9P-XX42');
    expect(payload.html).toContain('/is/book/confirmation/bk_test_1?t=');
  });

  it('never throws on a send failure (best-effort contract)', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_real_key');
    h.prisma.booking.findUnique.mockResolvedValue({
      ...booking,
      passenger: {
        email: 'passenger@example.com',
        name: null,
        preferredLocale: 'en',
        isGuest: false,
      },
    });
    h.emailsSend.mockResolvedValue({
      data: null,
      error: { name: 'application_error', message: 'boom' },
    });

    await expect(notifyBookingConfirmed('bk_test_1')).resolves.toBeUndefined();
  });
});
