'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const options = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export default function AppearancePage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section>
      <h2 className="text-xl font-semibold">Appearance</h2>
      <p className="mt-1 text-muted-foreground">Choose how NovaChat looks to you.</p>
      <div className="mt-6 grid max-w-xl grid-cols-3 gap-4">
        {options.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={cn(
              'flex flex-col items-center gap-3 rounded-xl border p-6 hover:bg-muted',
              mounted && theme === value && 'border-primary ring-2 ring-primary/30',
            )}
          >
            <Icon className="size-6" />
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}
