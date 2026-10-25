'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ChevronRight,
  Copy,
  File,
  FileArchive,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Folder,
  FolderPlus,
  MoreHorizontal,
  Presentation,
  Search,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { DropdownMenu } from 'radix-ui';
import { Suspense, useDeferredValue, useRef, useState, type ComponentType } from 'react';
import { toast } from 'sonner';
import { FILE_KINDS, type FileDto, type FileKind, type FolderDto, type Page } from '@novachat-enterprise-erp/contracts';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { SectionSidebar } from '@/components/layout/section-sidebar';
import { useWorkspace } from '@/components/layout/workspace-context';
import { openFile } from '@/components/chat/attachment';
import { useMembers } from '@/hooks/use-members';
import { useSession } from '@/lib/auth-client';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { formatBytes, uploadFile } from '@/lib/upload';
import { cn } from '@/lib/utils';

type View = 'all' | 'mine' | 'shared' | 'deleted';

const VIEWS: { view: View; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { view: 'all', label: 'All files', icon: Copy },
  { view: 'mine', label: 'My files', icon: File },
  { view: 'shared', label: 'Shared with me', icon: Users },
  { view: 'deleted', label: 'Deleted files', icon: Trash2 },
];

const KIND_ICONS: Record<FileKind, ComponentType<{ className?: string }>> = {
  image: FileImage,
  video: FileVideo,
  audio: FileAudio,
  pdf: FileText,
  document: FileText,
  spreadsheet: FileSpreadsheet,
  presentation: Presentation,
  archive: FileArchive,
  other: File,
};

const filterClass = 'h-10 rounded-md border bg-background px-3 text-sm';
const menuItem = 'cursor-pointer rounded px-3 py-2 text-sm outline-none data-highlighted:bg-muted';

function FilesView() {
  const { id, slug } = useWorkspace();
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const { members, byUserId } = useMembers();
  const { data: session } = useSession();
  const view = (params.get('view') as View) ?? 'all';
  const folderId = params.get('folder');
  const [tab, setTab] = useState<'files' | 'folders'>('files');
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const [uploader, setUploader] = useState('');
  const [modified, setModified] = useState('');
  const [sort, setSort] = useState('newest');
  const [uploading, setUploading] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [sharing, setSharing] = useState<FileDto | null>(null);
  const [folderOpen, setFolderOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const query = useDeferredValue(q);

  const href = (next: Partial<{ view: View; folder: string | null }>) => {
    const p = new URLSearchParams();
    p.set('view', next.view ?? view);
    const f = next.folder === undefined ? folderId : next.folder;
    if (f) p.set('folder', f);
    return `/${slug}/files?${p}`;
  };

  const listParams = new URLSearchParams({ view: folderId ? 'mine' : view, sort, limit: '50' });
  if (query) listParams.set('q', query);
  if (kind) listParams.set('kind', kind);
  if (uploader) listParams.set('uploaderId', uploader);
  if (modified) listParams.set('modified', modified);
  if (folderId) listParams.set('folderId', folderId);

  const files = useInfiniteQuery({
    queryKey: [...qk.files(id), listParams.toString()],
    queryFn: ({ pageParam }) => api<Page<FileDto>>(`/workspaces/${id}/files?${listParams}${pageParam ? `&cursor=${pageParam}` : ''}`),
    initialPageParam: '',
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const items = files.data?.pages.flatMap((p) => p.items) ?? [];

  const folders = useQuery({
    queryKey: [...qk.folders(id), folderId],
    queryFn: () => api<{ items: FolderDto[] }>(`/workspaces/${id}/folders${folderId ? `?parentId=${folderId}` : ''}`).then((r) => r.items),
    enabled: view === 'mine' || view === 'all' || !!folderId,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: qk.files(id) });
    qc.invalidateQueries({ queryKey: qk.folders(id) });
  };
  const action = useMutation({
    mutationFn: ({ path, method, body }: { path: string; method: 'POST' | 'PATCH' | 'DELETE'; body?: unknown }) =>
      api(`/workspaces/${id}${path}`, { method, body }),
    onSuccess: refresh,
    onError: (e) => toast.error(e.message),
  });

  const upload = async (list: FileList | null) => {
    if (!list?.length) return;
    for (const file of Array.from(list)) {
      setUploading((n) => n + 1);
      try {
        await uploadFile(id, file, { folderId });
        toast.success(`Uploaded ${file.name}`);
      } catch (e) {
        toast.error(`${file.name}: ${(e as Error).message}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    refresh();
    if (fileInput.current) fileInput.current.value = '';
  };

  const isDeleted = view === 'deleted';
  const title = folderId ? folders.data?.find((f) => f.id === folderId)?.name ?? 'Folder' : VIEWS.find((v) => v.view === view)!.label;

  return (
    <>
      <SectionSidebar>
        {VIEWS.map(({ view: v, label, icon: Icon }) => (
          <Link
            key={v}
            href={href({ view: v, folder: null })}
            className={cn('flex items-center gap-3 rounded-md px-4 py-3 text-[17px] hover:bg-sidebar-hover', view === v && !folderId && 'bg-sidebar-hover font-semibold text-white')}
          >
            <Icon className="size-5" /> {label}
          </Link>
        ))}
      </SectionSidebar>
      <main
        className="relative flex min-w-0 flex-1 flex-col"
        onDragOver={(e) => (e.preventDefault(), !isDeleted && setDragging(true))}
        onDragLeave={(e) => e.currentTarget === e.target && setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!isDeleted) upload(e.dataTransfer.files);
        }}
      >
        {dragging && (
          <div className="pointer-events-none absolute inset-3 z-20 grid place-items-center rounded-xl border-2 border-dashed border-primary bg-primary/5 text-lg font-semibold text-primary">
            Drop files to upload
          </div>
        )}
        <header className="flex items-center justify-between gap-4 border-b px-6 py-5">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            {folderId && (
              <>
                <Link href={href({ view: 'mine', folder: null })} className="text-muted-foreground hover:underline">My files</Link>
                <ChevronRight className="size-5 text-muted-foreground" />
              </>
            )}
            {title}
          </h1>
          {!isDeleted && (
            <div className="flex gap-3">
              <input ref={fileInput} type="file" multiple hidden onChange={(e) => upload(e.target.files)} />
              <Button variant="outline" onClick={() => fileInput.current?.click()} disabled={uploading > 0}>
                <Upload /> {uploading ? `Uploading ${uploading}…` : 'Upload File'}
              </Button>
              <Button variant="outline" onClick={() => setFolderOpen(true)}>
                <FolderPlus /> New Folder
              </Button>
            </div>
          )}
        </header>

        <div className="flex flex-wrap items-center gap-3 px-6 py-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="w-72 pl-9" placeholder="Search by file name" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className={filterClass} value={kind} onChange={(e) => setKind(e.target.value)} aria-label="File type">
            <option value="">File Type</option>
            {FILE_KINDS.map((k) => (
              <option key={k} value={k} className="capitalize">{k}</option>
            ))}
          </select>
          <select className={filterClass} value={uploader} onChange={(e) => setUploader(e.target.value)} aria-label="Uploaded by">
            <option value="">Uploaded By</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>{m.name}</option>
            ))}
          </select>
          <select className={filterClass} value={modified} onChange={(e) => setModified(e.target.value)} aria-label="Date modified">
            <option value="">Date Modified</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="year">This year</option>
          </select>
          <select className={cn(filterClass, 'ml-auto')} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name">Name</option>
            <option value="size">Largest</option>
          </select>
        </div>

        <div className="flex gap-6 border-b px-6">
          {(['folders', 'files'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn('-mb-px border-b-2 px-4 pb-3 text-[17px] capitalize', tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground')}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === 'folders' ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 p-6">
              {(folders.data ?? []).map((f) => (
                <div key={f.id} className="group relative rounded-xl border p-4 hover:bg-muted/50">
                  <button className="flex w-full items-center gap-3 text-left" onClick={() => (router.push(href({ view: 'mine', folder: f.id })), setTab('files'))}>
                    <Folder className="size-8 text-primary" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{f.name}</span>
                      <span className="text-xs text-muted-foreground">{f.fileCount} files</span>
                    </span>
                  </button>
                  <button
                    className="absolute right-2 top-2 hidden rounded p-1 hover:bg-muted group-hover:block"
                    onClick={() => confirm(`Delete folder ${f.name}? Files move to the parent folder.`) && action.mutate({ path: `/folders/${f.id}`, method: 'DELETE' })}
                    aria-label="Delete folder"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
              {folders.data?.length === 0 && <p className="text-sm text-muted-foreground">No folders yet.</p>}
            </div>
          ) : items.length === 0 && !files.isLoading ? (
            <div className="grid h-full place-items-center pb-24 text-center">
              <div>
                <p className="text-3xl font-medium">{isDeleted ? 'Nothing in the bin' : 'No files yet'}</p>
                {!isDeleted && <p className="mt-3 text-lg text-muted-foreground">Upload or drag &amp; drop to get started</p>}
              </div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Uploaded by</th>
                  <th className="px-4 py-3 font-medium">Size</th>
                  <th className="px-4 py-3 font-medium">{isDeleted ? 'Deleted' : 'Modified'}</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((f) => {
                  const Icon = KIND_ICONS[f.kind];
                  const owner = byUserId.get(f.uploaderId);
                  const mine = f.uploaderId === session?.user.id;
                  return (
                    <tr key={f.id} className="hover:bg-muted/40">
                      <td className="px-6 py-3">
                        <button className="flex items-center gap-3 text-left" onClick={() => !isDeleted && openFile(id, f.id, true)}>
                          <Icon className="size-6 shrink-0 text-primary" />
                          <span className="truncate font-medium">{f.name}</span>
                          {f.sharedWith.length > 0 && <Users className="size-3.5 text-muted-foreground" />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          <Avatar name={owner?.name ?? '?'} src={owner?.image} className="size-6" />
                          {mine ? 'You' : (owner?.name ?? 'Unknown')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatBytes(f.size)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{format(new Date(f.deletedAt ?? f.updatedAt), 'MMM d, yyyy')}</td>
                      <td className="px-2">
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger className="rounded p-1.5 hover:bg-muted" aria-label="File actions">
                            <MoreHorizontal className="size-4" />
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Portal>
                            <DropdownMenu.Content align="end" className="z-50 min-w-44 rounded-lg border bg-popover p-1 shadow-lg">
                              {isDeleted ? (
                                <>
                                  <DropdownMenu.Item className={menuItem} onSelect={() => action.mutate({ path: `/files/${f.id}/restore`, method: 'POST' })}>Restore</DropdownMenu.Item>
                                  <DropdownMenu.Item
                                    className={cn(menuItem, 'text-destructive')}
                                    onSelect={() => confirm(`Permanently delete ${f.name}?`) && action.mutate({ path: `/files/${f.id}/permanent`, method: 'DELETE' })}
                                  >
                                    Delete forever
                                  </DropdownMenu.Item>
                                </>
                              ) : (
                                <>
                                  <DropdownMenu.Item className={menuItem} onSelect={() => openFile(id, f.id)}>Download</DropdownMenu.Item>
                                  <DropdownMenu.Item className={menuItem} onSelect={() => setSharing(f)}>Share</DropdownMenu.Item>
                                  {mine && (
                                    <DropdownMenu.Item
                                      className={menuItem}
                                      onSelect={() => {
                                        const name = prompt('Rename file', f.name);
                                        if (name && name !== f.name) action.mutate({ path: `/files/${f.id}`, method: 'PATCH', body: { name } });
                                      }}
                                    >
                                      Rename
                                    </DropdownMenu.Item>
                                  )}
                                  <DropdownMenu.Item className={cn(menuItem, 'text-destructive')} onSelect={() => action.mutate({ path: `/files/${f.id}`, method: 'DELETE' })}>
                                    Move to Deleted files
                                  </DropdownMenu.Item>
                                </>
                              )}
                            </DropdownMenu.Content>
                          </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {files.hasNextPage && (
            <button className="m-6 text-sm text-primary hover:underline" onClick={() => files.fetchNextPage()}>
              Load more
            </button>
          )}
        </div>
      </main>

      <Dialog open={folderOpen} onOpenChange={setFolderOpen}>
        <DialogContent title="New folder">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const name = String(new FormData(e.currentTarget).get('name'));
              action.mutate({ path: '/folders', method: 'POST', body: { name, parentId: folderId } }, { onSuccess: () => (setFolderOpen(false), setTab('folders')) });
            }}
          >
            <Input name="name" placeholder="Folder name" required maxLength={255} autoFocus />
            <Button type="submit" className="w-full">Create folder</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!sharing} onOpenChange={(o) => !o && setSharing(null)}>
        <DialogContent title={`Share ${sharing?.name ?? ''}`} description="People you share with can view and download this file.">
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {members
              .filter((m) => m.userId !== session?.user.id && m.userId !== sharing?.uploaderId)
              .map((m) => {
                const shared = sharing?.sharedWith.includes(m.userId);
                return (
                  <div key={m.userId} className="flex items-center gap-3 rounded-md px-2 py-1.5">
                    <Avatar name={m.name} src={m.image} />
                    <span className="flex-1 text-sm">{m.name}</span>
                    <Button
                      size="sm"
                      variant={shared ? 'secondary' : 'outline'}
                      onClick={() =>
                        api<FileDto>(`/workspaces/${id}/files/${sharing!.id}/shares${shared ? `/${m.userId}` : ''}`, {
                          method: shared ? 'DELETE' : 'POST',
                          body: shared ? undefined : { userIds: [m.userId] },
                        })
                          .then((f) => (setSharing(f), refresh()))
                          .catch((e: Error) => toast.error(e.message))
                      }
                    >
                      {shared ? 'Shared ✓' : 'Share'}
                    </Button>
                  </div>
                );
              })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function FilesPage() {
  return (
    <Suspense>
      <FilesView />
    </Suspense>
  );
}
