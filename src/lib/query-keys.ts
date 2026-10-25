export const qk = {
  members: (wid: string) => ['members', wid, 'directory'] as const,
  conversations: (wid: string) => ['conversations', wid] as const,
  conversation: (wid: string, cid: string) => ['conversation', wid, cid] as const,
  messages: (wid: string, cid: string) => ['messages', wid, cid] as const,
  replies: (wid: string, rootId: string) => ['replies', wid, rootId] as const,
  message: (wid: string, mid: string) => ['message', wid, mid] as const,
  threads: (wid: string) => ['threads', wid] as const,
  files: (wid: string) => ['files', wid] as const,
  folders: (wid: string) => ['folders', wid] as const,
  meetings: (wid: string) => ['meetings', wid] as const,
  notifications: (wid: string) => ['notifications', wid] as const,
  unread: (wid: string) => ['notifications', wid, 'unread'] as const,
};
