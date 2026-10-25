import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function SectionSidebar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <aside className={cn('flex w-[360px] shrink-0 flex-col gap-1 overflow-y-auto bg-sidebar px-3 py-4 text-sidebar-foreground', className)}>
      {children}
    </aside>
  );
}

export function SidebarLink({
  active,
  children,
  className,
  ...props
}: { active?: boolean; children: ReactNode; className?: string } & React.ComponentProps<'a'>) {
  return (
    <a
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-[15px] hover:bg-sidebar-hover',
        active && 'bg-sidebar-hover font-semibold text-white',
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}
