'use client';

import { Smile } from 'lucide-react';
import { Popover } from 'radix-ui';
import type { ReactNode } from 'react';

export const EMOJIS = [
  '👍', '❤️', '😂', '🎉', '🙏', '👀', '🔥', '✅', '😀', '😃', '😄', '😁', '😅', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰',
  '😘', '😋', '😎', '🤓', '🤔', '🤨', '😐', '😶', '🙄', '😏', '😮', '😢', '😭', '😤', '😡', '🤯', '😱', '🥳', '🤗', '🤝',
  '👏', '🙌', '💪', '👋', '✌️', '🤞', '👌', '👆', '💯', '⭐', '✨', '💡', '📌', '📚', '📝', '💻', '🚀', '🎯', '⚡', '☕',
];

export function EmojiPicker({ onPick, trigger, label = 'Add emoji' }: { onPick: (emoji: string) => void; trigger?: ReactNode; label?: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        {trigger ?? (
          <button type="button" className="rounded p-1.5 text-muted-foreground hover:bg-muted" aria-label={label}>
            <Smile className="size-5" />
          </button>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side="top" align="start" sideOffset={6} className="z-50 grid w-72 grid-cols-10 gap-0.5 rounded-lg border bg-popover p-2 shadow-xl">
          {EMOJIS.map((emoji) => (
            <Popover.Close asChild key={emoji}>
              <button type="button" className="rounded p-1 text-lg hover:bg-muted" onClick={() => onPick(emoji)}>
                {emoji}
              </button>
            </Popover.Close>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
