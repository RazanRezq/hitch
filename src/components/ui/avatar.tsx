import { cn } from '@/lib/ui';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  className?: string;
}

function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

/**
 * Avatar with initials fallback. Photos render via a background-image span (not
 * <img>) so we sidestep next/image remote-domain config for signed/CDN URLs.
 */
export function Avatar({ src, name, className }: AvatarProps) {
  return (
    <span
      className={cn(
        'inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-medium text-muted-foreground',
        className,
      )}
      aria-hidden="true"
    >
      {src ? (
        <span
          className="size-full bg-cover bg-center"
          style={{ backgroundImage: `url(${src})` }}
        />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}
