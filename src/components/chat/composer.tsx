'use client';

import { AtSign, Bold, Code, Hash, Italic, Link2, List, ListOrdered, Loader2, Paperclip, SendHorizontal, Strikethrough, Type, X } from 'lucide-react';
import { useRef, useState, type KeyboardEvent } from 'react';
import { toast } from 'sonner';
import type { AttachmentDto } from '@novachat-enterprise-erp/contracts';
import { useWorkspace } from '@/components/layout/workspace-context';
import { useRealtime } from '@/components/realtime/realtime-provider';
import { Avatar } from '@/components/ui/avatar';
import { useMembers } from '@/hooks/use-members';
import { useSendMessage } from '@/hooks/use-messages';
import { formatBytes, uploadFile } from '@/lib/upload';
import { cn } from '@/lib/utils';
import { EmojiPicker } from './emoji-picker';

const SPECIAL = [
  { username: 'channel', name: 'Notify everyone in this channel' },
  { username: 'here', name: 'Notify everyone in this channel' },
];

const MENTION_AT_CARET = /(^|\s)@([a-z0-9_.]*)$/i;

export function Composer({
  conversationId,
  parentId,
  placeholder,
  isChannel,
}: {
  conversationId: string;
  parentId?: string;
  placeholder: string;
  isChannel: boolean;
}) {
  const workspace = useWorkspace();
  const { members } = useMembers();
  const { sendTyping } = useRealtime();
  const send = useSendMessage();
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [toolbar, setToolbar] = useState(true);
  const [attachments, setAttachments] = useState<AttachmentDto[]>([]);
  const [uploading, setUploading] = useState(0);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(0);
  const lastTyping = useRef(0);

  const suggestions =
    mentionQuery === null
      ? []
      : [
          ...(isChannel ? SPECIAL.map((s) => ({ ...s, userId: s.username, image: null })) : []),
          ...members.map((m) => ({ username: m.username, name: m.name, userId: m.userId, image: m.image })),
        ]
          .filter((m) => m.username.startsWith(mentionQuery.toLowerCase()) || m.name.toLowerCase().includes(mentionQuery.toLowerCase()))
          .slice(0, 8);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  };

  const update = (value: string) => {
    setText(value);
    const caret = ref.current?.selectionStart ?? value.length;
    const match = MENTION_AT_CARET.exec(value.slice(0, caret));
    setMentionQuery(match ? match[2]! : null);
    setHighlight(0);
    requestAnimationFrame(resize);
    if (value.trim() && Date.now() - lastTyping.current > 2_500) {
      lastTyping.current = Date.now();
      sendTyping(conversationId, parentId);
    }
  };

  const insertAtCaret = (before: string, after = '', placeholderText = '') => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const selected = text.slice(start, end) || placeholderText;
    const next = text.slice(0, start) + before + selected + after + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
      resize();
    });
  };

  const prefixLines = (prefix: (i: number) => string) => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const block = text.slice(lineStart, end) || 'item';
    const replaced = block.split('\n').map((line, i) => prefix(i) + line).join('\n');
    setText(text.slice(0, lineStart) + replaced + text.slice(end));
    requestAnimationFrame(() => el.focus());
  };

  const pickMention = (username: string) => {
    const el = ref.current;
    if (!el) return;
    const caret = el.selectionStart;
    const before = text.slice(0, caret).replace(/@([a-z0-9_.]*)$/i, `@${username} `);
    const next = before + text.slice(caret);
    setText(next);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(before.length, before.length);
    });
  };

  const submit = () => {
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || uploading) return;
    const handles = new Set([...trimmed.matchAll(/@([a-z0-9_.]+)/gi)].map((m) => m[1]!.toLowerCase()));
    const mentions = members.filter((m) => handles.has(m.username.toLowerCase())).map((m) => m.userId);
    send.mutate(
      {
        input: {
          conversationId,
          parentId,
          text: trimmed,
          mentions,
          mentionsChannel: isChannel && (handles.has('channel') || handles.has('here')),
          attachments,
        },
        clientMsgId: crypto.randomUUID(),
      },
      { onError: (e) => toast.error(e.message) },
    );
    setText('');
    setAttachments([]);
    requestAnimationFrame(resize);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight((h) => (h + (e.key === 'ArrowDown' ? 1 : suggestions.length - 1)) % suggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        pickMention(suggestions[highlight]!.username);
        return;
      }
      if (e.key === 'Escape') return setMentionQuery(null);
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === 'b') (e.preventDefault(), insertAtCaret('**', '**', 'bold'));
    if (mod && e.key === 'i') (e.preventDefault(), insertAtCaret('_', '_', 'italic'));
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const file of Array.from(files).slice(0, 10)) {
      setUploading((n) => n + 1);
      try {
        const uploaded = await uploadFile(workspace.id, file, { conversationId });
        setAttachments((list) => [...list, { fileId: uploaded.id, name: uploaded.name, mimeType: uploaded.mimeType, size: uploaded.size }]);
      } catch (error) {
        toast.error(`${file.name}: ${(error as Error).message}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileInput.current) fileInput.current.value = '';
  };

  const tool = 'rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground';

  return (
    <div
      className="relative rounded-xl border bg-background shadow-sm focus-within:border-primary/50"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onFiles(e.dataTransfer.files);
      }}
    >
      {suggestions.length > 0 && (
        <div className="absolute bottom-full left-2 z-20 mb-2 w-80 rounded-lg border bg-popover p-1 shadow-xl">
          {suggestions.map((s, i) => (
            <button
              key={s.userId}
              type="button"
              onMouseDown={(e) => (e.preventDefault(), pickMention(s.username))}
              className={cn('flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm', i === highlight && 'bg-muted')}
            >
              <Avatar name={s.name} src={s.image} className="size-6" />
              <span className="font-medium">@{s.username}</span>
              <span className="truncate text-muted-foreground">{s.name}</span>
            </button>
          ))}
        </div>
      )}
      {toolbar && (
        <div className="flex items-center gap-0.5 border-b bg-muted/40 px-2 py-1">
          <button type="button" className={tool} onClick={() => insertAtCaret('**', '**', 'bold')} aria-label="Bold"><Bold className="size-4" /></button>
          <button type="button" className={tool} onClick={() => insertAtCaret('_', '_', 'italic')} aria-label="Italic"><Italic className="size-4" /></button>
          <button type="button" className={tool} onClick={() => insertAtCaret('~~', '~~', 'strike')} aria-label="Strikethrough"><Strikethrough className="size-4" /></button>
          <span className="mx-1 h-5 w-px bg-border" />
          <button type="button" className={tool} onClick={() => insertAtCaret('[', '](https://)', 'link text')} aria-label="Link"><Link2 className="size-4" /></button>
          <button type="button" className={tool} onClick={() => prefixLines((i) => `${i + 1}. `)} aria-label="Numbered list"><ListOrdered className="size-4" /></button>
          <button type="button" className={tool} onClick={() => prefixLines(() => '- ')} aria-label="Bulleted list"><List className="size-4" /></button>
          <span className="mx-1 h-5 w-px bg-border" />
          <button type="button" className={tool} onClick={() => insertAtCaret('```\n', '\n```', 'code')} aria-label="Code block"><Code className="size-4" /></button>
        </div>
      )}
      <textarea
        ref={ref}
        rows={1}
        value={text}
        placeholder={placeholder}
        onChange={(e) => update(e.target.value)}
        onKeyDown={onKeyDown}
        onPaste={(e) => e.clipboardData.files.length && (e.preventDefault(), onFiles(e.clipboardData.files))}
        className="block max-h-60 min-h-11 w-full resize-none bg-transparent px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground"
      />
      {(attachments.length > 0 || uploading > 0) && (
        <div className="flex flex-wrap gap-2 px-3 pb-2">
          {attachments.map((a) => (
            <span key={a.fileId} className="flex items-center gap-2 rounded-md border bg-muted px-2 py-1 text-xs">
              <span className="max-w-40 truncate">{a.name}</span>
              <span className="text-muted-foreground">{formatBytes(a.size)}</span>
              <button type="button" onClick={() => setAttachments((l) => l.filter((x) => x.fileId !== a.fileId))} aria-label={`Remove ${a.name}`}>
                <X className="size-3" />
              </button>
            </span>
          ))}
          {uploading > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> Uploading {uploading}…
            </span>
          )}
        </div>
      )}
      <div className="flex items-center gap-1 px-2 pb-2">
        <input ref={fileInput} type="file" multiple hidden onChange={(e) => onFiles(e.target.files)} />
        <button type="button" className={tool} onClick={() => fileInput.current?.click()} aria-label="Attach files"><Paperclip className="size-5" /></button>
        <button type="button" className={cn(tool, toolbar && 'text-primary')} onClick={() => setToolbar((v) => !v)} aria-label="Toggle formatting"><Type className="size-5" /></button>
        <EmojiPicker onPick={(emoji) => insertAtCaret(emoji)} />
        <button type="button" className={tool} onClick={() => update(`${text}${text && !text.endsWith(' ') ? ' ' : ''}@`)} aria-label="Mention someone"><AtSign className="size-5" /></button>
        <button type="button" className={tool} onClick={() => insertAtCaret('#')} aria-label="Reference a channel"><Hash className="size-5" /></button>
        <button
          type="button"
          onClick={submit}
          disabled={(!text.trim() && attachments.length === 0) || uploading > 0}
          className="ml-auto rounded-md p-2 text-primary hover:bg-primary/10 disabled:text-muted-foreground disabled:hover:bg-transparent"
          aria-label="Send message"
        >
          <SendHorizontal className="size-5" />
        </button>
      </div>
    </div>
  );
}
