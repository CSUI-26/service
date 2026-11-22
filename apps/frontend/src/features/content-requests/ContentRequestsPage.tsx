import { useState } from 'react';
import {
  Camera,
  Lock,
  MessageSquare,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  ContentRequestCreate,
  ContentRequestSummary,
  ContentRequestType,
  RequestStatus,
} from '@zenith/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog';
import { EmptyState } from '@/components/patterns/EmptyState';
import { ListState } from '@/components/patterns/ListState';
import { ListSkeleton } from '@/components/patterns/skeletons';
import { Paginator } from '@/components/Paginator';
import { useAuth } from '@/features/auth/useAuth';
import { ContentRequestFormDialog } from '@/features/content-requests/ContentRequestFormDialog';
import {
  MEMBER_CONTENT_TYPE_LABELS,
  MEMBER_STATUS_LABELS,
  contentRequestsApi,
  formatEpochTimestamp,
  statusBadgeVariant,
} from '@/features/content-requests/api';
import { ThreadConversationDialog } from '@/features/requests/ThreadConversationDialog';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useResourceList } from '@/hooks/useResourceList';

const PAGE_SIZE = 10;

const TYPE_FILTERS: Array<{ value: '' | ContentRequestType; label: string }> = [
  { value: '', label: 'Semua' },
  { value: 'achievement', label: 'Achievement' },
  { value: 'gallery', label: 'Galeri' },
  { value: 'activity', label: 'Kegiatan' },
  { value: 'other', label: 'Konten Lainnya' },
];

export default function ContentRequestsPage() {
  useDocumentTitle('Permintaan Konten');

  const { user } = useAuth();
  const [typeFilter, setTypeFilter] = useState<'' | ContentRequestType>('');
  const [statusFilter, setStatusFilter] = useState<'' | RequestStatus>('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ContentRequestSummary | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<ContentRequestSummary | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const list = useResourceList<ContentRequestSummary>({
    path: '/content-requests',
    pageSize: PAGE_SIZE,
    filters: {
      scope: 'mine',
      contentType: typeFilter,
      status: statusFilter,
    },
  });

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (item: ContentRequestSummary) => {
    setActiveThreadId(null);
    setEditing(item);
    setFormOpen(true);
  };

  const handleSubmitForm = async (payload: ContentRequestCreate) => {
    setSaving(true);
    try {
      if (editing) {
        await contentRequestsApi.update(editing.id, payload);
        toast.success('Permintaan konten diperbarui');
      } else {
        const res = await contentRequestsApi.create(payload);
        toast.success('Permintaan konten terkirim ke admin Zenith');
        setActiveThreadId(res.data.id);
      }
      setFormOpen(false);
      list.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan permintaan konten');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    const snapshot = list.data;
    setRemoving(true);
    setDeleting(null);
    list.mutate((items) => items.filter((item) => item.id !== target.id));
    try {
      await contentRequestsApi.remove(target.id);
      toast.success('Permintaan konten dihapus');
      list.reload();
    } catch (err) {
      list.mutate(() => snapshot);
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus permintaan konten');
    } finally {
      setRemoving(false);
    }
  };

  const hasFilter = Boolean(typeFilter || statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Permintaan Konten
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            Ajukan prestasi, foto galeri, atau dokumentasi kegiatan angkatan ke admin Zenith.
          </p>
        </div>

        <Button type="button" onClick={openCreate} className="rounded-xl">
          <Plus aria-hidden="true" />
          <span>Ajukan Konten</span>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="surface-card space-y-1.5 rounded-2xl border-primary/25 p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-primary">
            <Sparkles className="size-4 shrink-0" aria-hidden="true" />
            <span>1. Pilih Jenis Konten</span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Pilih <strong>Achievement</strong> untuk prestasi tim, <strong>Galeri</strong> untuk foto
            angkatan, atau <strong>Kegiatan</strong> untuk liputan acara.
          </p>
        </div>

        <div className="surface-card space-y-1.5 rounded-2xl border-primary/25 p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-primary">
            <Camera className="size-4 shrink-0" aria-hidden="true" />
            <span>2. Unggah Foto Pendukung</span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Lampirkan foto terbaikmu langsung lewat form agar tim konten dapat langsung memproses
            dan menayangkannya.
          </p>
        </div>

        <div className="surface-card space-y-1.5 rounded-2xl border-primary/25 p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-primary">
            <Lock className="size-4 shrink-0" aria-hidden="true" />
            <span>3. Diskusi Privat dengan Admin</span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Pengajuanmu bersifat privat antara kamu dan admin Zenith. Kamu bisa membalas pesan atau
            memperbarui detail kapan saja.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <fieldset className="m-0 flex flex-wrap items-center gap-1.5 border-0 p-0">
          <legend className="sr-only">Filter jenis konten</legend>
          {TYPE_FILTERS.map((item) => {
            const active = typeFilter === item.value;
            return (
              <Button
                key={item.value || 'all'}
                type="button"
                size="sm"
                variant={active ? 'default' : 'outline'}
                className="rounded-xl"
                onClick={() => setTypeFilter(item.value)}
              >
                {item.label}
              </Button>
            );
          })}
        </fieldset>

        <Select
          value={statusFilter || 'all'}
          onValueChange={(value) =>
            setStatusFilter(value === 'all' ? '' : (value as RequestStatus))
          }
        >
          <SelectTrigger className="w-44 rounded-xl" aria-label="Filter status">
            <SelectValue placeholder="Semua status">
              {statusFilter ? MEMBER_STATUS_LABELS[statusFilter] : 'Semua status'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="open">{MEMBER_STATUS_LABELS.open}</SelectItem>
            <SelectItem value="in_progress">{MEMBER_STATUS_LABELS.in_progress}</SelectItem>
            <SelectItem value="resolved">{MEMBER_STATUS_LABELS.resolved}</SelectItem>
            <SelectItem value="closed">{MEMBER_STATUS_LABELS.closed}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ListState
        loading={list.loading}
        error={list.error}
        isEmpty={list.data.length === 0}
        onRetry={list.reload}
        skeleton={<ListSkeleton rows={4} />}
        empty={
          <EmptyState
            icon={Sparkles}
            title={hasFilter ? 'Belum ada pengajuan yang cocok' : 'Belum ada permintaan konten'}
            description={
              hasFilter
                ? 'Ubah filter jenis konten atau status untuk melihat pengajuan lain.'
                : 'Klik tombol Ajukan Konten untuk mengusulkan prestasi, galeri, atau kegiatan baru.'
            }
            action={
              hasFilter ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setTypeFilter('');
                    setStatusFilter('');
                  }}
                >
                  Reset filter
                </Button>
              ) : (
                <Button type="button" onClick={openCreate}>
                  <Plus aria-hidden="true" />
                  Ajukan Konten
                </Button>
              )
            }
          />
        }
      >
        <div className="grid gap-3">
          {list.data.map((item) => (
            <article
              key={item.id}
              className="surface-card flex flex-col gap-3 rounded-2xl p-4 transition-colors duration-150 hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono tabular-nums">
                    #{item.id}
                  </Badge>
                  <Badge variant="secondary">{MEMBER_CONTENT_TYPE_LABELS[item.contentType]}</Badge>
                  <Badge variant={statusBadgeVariant(item.status)}>
                    {MEMBER_STATUS_LABELS[item.status]}
                  </Badge>
                </div>

                <h2 className="truncate text-sm font-bold text-foreground sm:text-base">
                  {item.title}
                </h2>
                <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  {item.description}
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                    <MessageSquare className="size-3.5" aria-hidden="true" />
                    {item.messageCount} balasan
                  </span>
                  <span>Diperbarui {formatEpochTimestamp(item.updatedAt, 'id-ID')}</span>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setActiveThreadId(item.id)}
                >
                  <MessageSquare className="size-3.5" aria-hidden="true" />
                  <span>Buka Diskusi</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="rounded-xl"
                  aria-label={`Ubah ${item.title}`}
                  onClick={() => openEdit(item)}
                >
                  <Pencil className="size-3.5" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="rounded-xl text-destructive hover:text-destructive"
                  aria-label={`Hapus ${item.title}`}
                  onClick={() => setDeleting(item)}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </Button>
              </div>
            </article>
          ))}
        </div>

        <Paginator
          page={list.page}
          totalPages={list.totalPages}
          total={list.total}
          onPageChange={list.setPage}
        />
      </ListState>

      <ContentRequestFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        mode="member"
        saving={saving}
        onDelete={(item) => {
          setFormOpen(false);
          setDeleting(item);
        }}
        onSubmit={handleSubmitForm}
      />

      <ThreadConversationDialog
        domain="content-request"
        threadId={activeThreadId}
        open={activeThreadId !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setActiveThreadId(null);
        }}
        mode="member"
        currentUserNpm={user?.npm ?? ''}
        isAdmin={false}
        onEditThread={openEdit}
        onThreadChanged={list.reload}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeleting(null);
        }}
        title="Hapus Permintaan Konten"
        description={
          <>
            Yakin ingin menghapus <strong>{deleting?.title}</strong>? Semua balasan di dalamnya akan
            ikut terhapus permanen.
          </>
        }
        confirmLabel="Hapus"
        pending={removing}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
