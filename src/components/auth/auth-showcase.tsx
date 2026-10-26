'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

const SLIDES = [
  {
    quote: 'Channels, threads and direct messages keep every conversation in the right place.',
    title: 'Organised conversations',
    detail: 'Channels · Threads · Direct messages',
  },
  {
    quote: 'Share files and jump into a video call without ever leaving the chat.',
    title: 'Files and meetings',
    detail: 'Uploads · Previews · Video calls',
  },
  {
    quote: 'Invite your team with a single link and decide exactly what each role can do.',
    title: 'Your workspace, your rules',
    detail: 'Invite links · Roles · Permissions',
  },
];

const NOTCH = 'size-[104px]';
const FILLET = 'radial-gradient(circle at 100% 100%, transparent 31.5px, var(--background) 32px)';

export function AuthShowcase() {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index]!;

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 7000);
    return () => clearInterval(timer);
  }, [index]);

  const step = (delta: number) => setIndex((i) => (i + delta + SLIDES.length) % SLIDES.length);

  return (
    <aside className="relative hidden overflow-hidden rounded-[32px] rounded-tl-none lg:block">
      <Image
        src="/login-team.jpg"
        alt="A team working together around a computer"
        fill
        priority
        sizes="50vw"
        className="object-cover object-[38%_50%]"
      />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" />

      <div className={`absolute left-0 top-0 grid ${NOTCH} place-items-center rounded-br-[32px] bg-background`}>
        <div className="grid size-[80px] place-items-center rounded-full border border-border bg-background">
          <Image src="/logo-512.png" alt="" width={36} height={36} className="rounded-[10px]" />
        </div>
      </div>
      <div className="absolute left-[104px] top-0 size-8" style={{ background: FILLET }} />
      <div className="absolute left-0 top-[104px] size-8" style={{ background: FILLET }} />

      <div className="absolute inset-x-4 bottom-4 flex gap-3">
        <div className="flex-1 rounded-2xl border border-white/30 bg-white/15 p-5 text-white backdrop-blur-md">
          <p key={index} className="animate-in fade-in text-lg font-medium leading-snug duration-500">
            {slide.quote}
          </p>
          <p className="mt-4 text-sm font-bold">{slide.title}</p>
          <p className="text-sm text-white/80">{slide.detail}</p>
        </div>
        <div className="flex flex-col justify-end gap-3">
          <button
            type="button"
            aria-label="Next highlight"
            onClick={() => step(1)}
            className="grid size-14 place-items-center rounded-2xl border border-white/40 bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/25"
          >
            <ArrowRight className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Previous highlight"
            onClick={() => step(-1)}
            className="grid size-14 place-items-center rounded-2xl border border-white/40 bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/25"
          >
            <ArrowLeft className="size-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
