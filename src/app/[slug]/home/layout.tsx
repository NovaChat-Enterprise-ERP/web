import type { ReactNode } from 'react';
import { HomeSidebar } from '@/components/chat/home-sidebar';

export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <HomeSidebar />
      <div className="flex min-w-0 flex-1">{children}</div>
    </>
  );
}
