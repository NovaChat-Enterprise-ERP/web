import { Fragment, type ReactNode } from 'react';

const INLINE = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(~~[^~\n]+~~)|(_[^_\n]+_|\*[^*\n]+\*)|(\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))|(https?:\/\/[^\s<]+[^\s<.,:;"')\]])|(@[a-z0-9_.]+)/gi;

function inline(text: string, isMention: (handle: string) => boolean, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const match of text.matchAll(INLINE)) {
    const [token] = match;
    const start = match.index!;
    if (start > last) out.push(text.slice(last, start));
    const key = `${keyBase}-${i++}`;
    if (match[1]) out.push(<code key={key} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] text-rose-600">{token.slice(1, -1)}</code>);
    else if (match[2]) out.push(<strong key={key}>{inline(token.slice(2, -2), isMention, key)}</strong>);
    else if (match[3]) out.push(<s key={key}>{inline(token.slice(2, -2), isMention, key)}</s>);
    else if (match[4]) out.push(<em key={key}>{inline(token.slice(1, -1), isMention, key)}</em>);
    else if (match[5]) {
      const [, label, href] = /^\[([^\]]+)\]\((.+)\)$/.exec(token)!;
      out.push(<a key={key} href={href} target="_blank" rel="noreferrer noopener" className="text-primary underline">{label}</a>);
    } else if (match[6]) out.push(<a key={key} href={token} target="_blank" rel="noreferrer noopener" className="text-primary underline break-all">{token}</a>);
    else if (match[7] && isMention(token.slice(1))) out.push(<span key={key} className="rounded bg-primary/15 px-1 font-medium text-primary">{token}</span>);
    else out.push(token);
    last = start + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text, isMention }: { text: string; isMention: (handle: string) => boolean }) {
  const blocks: ReactNode[] = [];
  const parts = text.split(/```/);
  parts.forEach((part, index) => {
    if (index % 2 === 1) {
      blocks.push(
        <pre key={`code-${index}`} className="my-1 overflow-x-auto rounded-md border bg-muted p-3 font-mono text-[13px]">
          {part.replace(/^\w*\n/, '')}
        </pre>,
      );
      return;
    }
    const lines = part.split('\n');
    let list: { ordered: boolean; items: string[] } | null = null;
    const flush = (key: string) => {
      if (!list) return;
      const Tag = list.ordered ? 'ol' : 'ul';
      blocks.push(
        <Tag key={key} className={list.ordered ? 'ml-5 list-decimal' : 'ml-5 list-disc'}>
          {list.items.map((item, j) => (
            <li key={j}>{inline(item, isMention, `${key}-${j}`)}</li>
          ))}
        </Tag>,
      );
      list = null;
    };
    lines.forEach((line, j) => {
      const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
      const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
      if (bullet || numbered) {
        const ordered = !!numbered;
        if (list && list.ordered !== ordered) flush(`l-${index}-${j}`);
        list ??= { ordered, items: [] };
        list.items.push((bullet ?? numbered)![1]!);
        return;
      }
      flush(`l-${index}-${j}`);
      if (line.startsWith('> ')) {
        blocks.push(<blockquote key={`q-${index}-${j}`} className="border-l-4 pl-3 text-muted-foreground">{inline(line.slice(2), isMention, `q-${index}-${j}`)}</blockquote>);
      } else {
        blocks.push(
          <Fragment key={`p-${index}-${j}`}>
            {inline(line, isMention, `p-${index}-${j}`)}
            {j < lines.length - 1 && <br />}
          </Fragment>,
        );
      }
    });
    flush(`l-${index}-end`);
  });
  return <div className="whitespace-pre-wrap break-words leading-relaxed">{blocks}</div>;
}
