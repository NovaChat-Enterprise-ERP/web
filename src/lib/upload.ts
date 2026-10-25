import type { FileDto, UploadTicketDto } from '@novachat-enterprise-erp/contracts';
import { api } from './api';

export async function uploadFile(
  workspaceId: string,
  file: File,
  target: { conversationId?: string | null; folderId?: string | null } = {},
): Promise<FileDto> {
  const ticket = await api<UploadTicketDto>(`/workspaces/${workspaceId}/files/uploads`, {
    method: 'POST',
    body: {
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      conversationId: target.conversationId ?? null,
      folderId: target.folderId ?? null,
    },
  });
  const put = await fetch(ticket.uploadUrl, { method: 'PUT', headers: ticket.headers, body: file });
  if (!put.ok) throw new Error(`Upload failed (${put.status})`);
  return api<FileDto>(`/workspaces/${workspaceId}/files/${ticket.file.id}/complete`, { method: 'POST' });
}

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
};
