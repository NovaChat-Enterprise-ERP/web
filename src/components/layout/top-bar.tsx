'use client';

import { ChevronDown, Search } from 'lucide-react';
import Link from 'next/link';
import { DropdownMenu } from 'radix-ui';
import { useMyWorkspaces } from '@/hooks/use-workspaces';
import { Avatar } from '@/components/ui/avatar';
import { useWorkspace } from './workspace-context';

export function TopBar({ onSearch }: { onSearch: () => void }) {
  const workspace = useWorkspace();
  const { data: workspaces = [] } = useMyWorkspaces();

  return (
    <header className="grid h-14 shrink-0 grid-cols-[1fr_minmax(0,560px)_1fr] items-center gap-4 bg-topbar px-4">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger className="flex w-fit items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-white hover:bg-white/15">
          <Avatar name={workspace.name} src={workspace.logoUrl} className="size-6" />
          <span className="max-w-40 truncate font-semibold">{workspace.name}</span>
          <ChevronDown className="size-4" />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="start" sideOffset={6} className="z-50 min-w-64 rounded-lg border bg-popover p-1 shadow-lg">
            <DropdownMenu.Label className="px-2 py-1.5 text-xs text-muted-foreground">Workspaces</DropdownMenu.Label>
            {workspaces.map((w) => (
              <DropdownMenu.Item key={w.id} asChild>
                <Link href={`/${w.slug}/home`} className="flex items-center gap-2 rounded-md px-2 py-2 text-sm outline-none data-highlighted:bg-muted">
                  <Avatar name={w.name} src={w.logoUrl} className="size-6" />
                  <span className="truncate">{w.name}</span>
                  {w.id === workspace.id && <span className="ml-auto text-xs text-primary">Current</span>}
                </Link>
              </DropdownMenu.Item>
            ))}
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
            <DropdownMenu.Item asChild>
              <Link href="/onboarding" className="block rounded-md px-2 py-2 text-sm outline-none data-highlighted:bg-muted">
                Create a new workspace
              </Link>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <button
        type="button"
        onClick={onSearch}
        className="flex h-9 items-center gap-3 rounded-md bg-white/10 px-3 text-left text-sm text-white/80 hover:bg-white/15"
      >
        <Search className="size-4" />
        <span className="flex-1 truncate">Search messages and people...</span>
        <kbd className="rounded border border-white/30 px-1.5 py-0.5 font-mono text-[11px]">Ctrl K</kbd>
      </button>
      <div />
    </header>
  );
}
