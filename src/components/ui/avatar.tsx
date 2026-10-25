import { cn, initials } from '@/lib/utils';

export function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  return (
    <span className={cn('relative inline-flex size-8 shrink-0 overflow-hidden rounded-md bg-primary/20', className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="size-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span className="m-auto text-xs font-semibold text-primary">{initials(name)}</span>
      )}
    </span>
  );
}
