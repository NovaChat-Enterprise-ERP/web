'use client';

import { useQuery } from '@tanstack/react-query';
import { Download, FileText } from 'lucide-react';
import type { AttachmentDto, DownloadUrlDto } from '@novachat-enterprise-erp/contracts';
import { useWorkspace } from '@/components/layout/workspace-context';
import { api } from '@/lib/api';
import { formatBytes } from '@/lib/upload';

const downloadUrl = (workspaceId: string, fileId: string, inline: boolean) =>
  api<DownloadUrlDto>(`/workspaces/${workspaceId}/files/${fileId}/download?inline=${inline}`).then((r) => r.url);

export async function openFile(workspaceId: string, fileId: string, inline = false) {
  window.open(await downloadUrl(workspaceId, fileId, inline), '_blank', 'noopener');
}

export function Attachment({ attachment }: { attachment: AttachmentDto }) {
  const { id } = useWorkspace();
  const isImage = attachment.mimeType.startsWith('image/');
  const { data: preview } = useQuery({
    queryKey: ['file-preview', attachment.fileId],
    queryFn: () => downloadUrl(id, attachment.fileId, true),
    enabled: isImage,
    staleTime: 4 * 60_000,
  });

  if (isImage && preview) {
    return (
      <button type="button" onClick={() => openFile(id, attachment.fileId, true)} className="block overflow-hidden rounded-lg border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt={attachment.name} className="max-h-72 max-w-sm object-contain" />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => openFile(id, attachment.fileId)}
      className="flex w-72 items-center gap-3 rounded-lg border p-3 text-left hover:bg-muted"
    >
      <span className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
        <FileText className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{attachment.name}</span>
        <span className="text-xs text-muted-foreground">{formatBytes(attachment.size)}</span>
      </span>
      <Download className="size-4 text-muted-foreground" />
    </button>
  );
}
