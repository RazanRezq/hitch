import { encodeQr, qrSvgPath } from '@/lib/qr';

/**
 * Render `value` as an inline-SVG QR code. Self-contained (no network, no npm
 * dependency) so it works in the app, the receipt preview, and print/PDF.
 * `shapeRendering="crispEdges"` keeps modules sharp at any scale. Colour is the
 * brand navy — high enough contrast on white to scan reliably. Size via className
 * (e.g. `size-24`).
 */
export function QrCode({
  value,
  className,
  title,
}: {
  value: string;
  className?: string;
  title?: string;
}) {
  const { dimension, path } = qrSvgPath(encodeQr(value));
  return (
    <svg
      className={className}
      viewBox={`0 0 ${dimension} ${dimension}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title ?? 'QR code'}
      shapeRendering="crispEdges"
    >
      <rect width={dimension} height={dimension} fill="#ffffff" />
      <path d={path} fill="#163F81" />
    </svg>
  );
}
