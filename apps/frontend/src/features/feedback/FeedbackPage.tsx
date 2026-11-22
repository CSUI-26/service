import { useState } from 'react';
import {
  Camera,
  Lock,
  MessageSquare,
  MessageSquarePlus,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  FeedbackCategory,
  FeedbackThreadCreate,
  FeedbackThreadSummary,
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
import {
  MEMBER_STATUS_LABELS,
  formatEpochTimestamp,
  statusBadgeVariant,
} from '@/features/content-requests/api';
import { FeedbackFormDialog } from '@/features/feedback/FeedbackFormDialog';
import { MEMBER_FEEDBACK_CATEGORY_LABELS, feedbackApi } from '@/features/feedback/api';
import { ThreadConversationDialog } from '@/features/requests/ThreadConversationDialog';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useResourceList } from '@/hooks/useResourceList';

const PAGE_SIZE = 10;

const CATEGORY_FILTERS: Array<{ value: '' | FeedbackCategory; label: string }> = [
  { value: '', label: 'Semua' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'help', label: 'Bantuan' },
  { value: 'other', label: 'Lainnya' },
];

export default function FeedbackPage() {
  useDocumentTitle('Feedback & Bantuan');

  const { user } = useAuth();
  const [categoryFilter, setCategoryFilter] = useState<'' | FeedbackCategory>('');
  const [statusFilter, setStatusFilter] = useState<'' | RequestStatus>('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FeedbackThreadSummary | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<FeedbackThreadSummary | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const list = useResourceList<FeedbackThreadSummary>({
    path: '/feedback',
    pageSize: PAGE_SIZE,
    filters: {
      scope: 'mine',
      category: categoryFilter,
      status: statusFilter,
    },
  });

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (thread: FeedbackThreadSummary) => {
    setActiveThreadId(null);
    setEditing(thread);
    setFormOpen(true);
  };

  const handleSubmitForm = async (payload: FeedbackThreadCreate) => {
    setSaving(true);
    try {
      if (editing) {
        await feedbackApi.update(editing.id, payload);
        toast.success('Pesan berhasil diperbarui');
      } else {
        const res = await feedbackApi.create(payload);
        toast.success('Pesan terkirim ke admin Zenith');
        setActiveThreadId(res.data.id);
      }
      setFormOpen(false);
      list.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan pesan');
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
      await feedbackApi.remove(target.id);
      toast.success('Thread berhasil dihapus');
      list.reload();
    } catch (err) {
      list.mutate(() => snapshot);
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus thread');
    } finally {
      setRemoving(false);
    }
  };

  const hasFilter = Boolean(categoryFilter || statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Feedback &amp; Bantuan
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            Sampaikan masukan, laporkan kendala, atau minta bantuan langsung ke admin Zenith.
          </p>
        </div>

        <Button type="button" onClick={openCreate} className="rounded-xl">
          <Plus aria-hidden="true" />
          <span>Kirim Pesan Baru</span>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="surface-card space-y-1.5 rounded-2xl border-primary/25 p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-primary">
            <Sparkles className="size-4 shrink-0" aria-hidden="true" />
            <span>1. Pilih Topik Pesan</span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Punya ide fitur atau saran untuk Zenith? Pilih <strong>Feedback</strong>. Butuh
            pertolongan akun atau kendala teknis? Pilih <strong>Bantuan</strong>.
          </p>
        </div>

        <div className="surface-card space-y-1.5 rounded-2xl border-primary/25 p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-primary">
            <Camera className="size-4 shrink-0" aria-hidden="true" />
            <span>2. Sertakan Bukti atau Link</span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Lampirkan tangkapan layar atau tautan referensi jika ada kendala supaya admin lebih
            cepat menelusurinya.
          </p>
        </div>

        <div className="surface-card space-y-1.5 rounded-2xl border-primary/25 p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-primary">
            <Lock className="size-4 shrink-0" aria-hidden="true" />
            <span>3. Diskusi Privat dengan Admin</span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Thread ini hanya bisa dibaca oleh kamu dan admin Zenith. Kamu bisa membalas, mengubah,
            atau menghapus pesanmu kapan saja.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <fieldset className="m-0 flex flex-wrap items-center gap-1.5 border-0 p-0">
          <legend className="sr-only">Filter kategori</legend>
          {CATEGORY_FILTERS.map((item) => {
            const active = categoryFilter === item.value;
            return (
              <Button
                key={item.value || 'all'}
                type="button"
                size="sm"
                variant={active ? 'default' : 'outline'}
                className="rounded-xl"
                onClick={() => setCategoryFilter(item.value)}
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
            icon={MessageSquarePlus}
            title={hasFilter ? 'Belum ada thread yang cocok' : 'Belum ada feedback atau bantuan'}
            description={
              hasFilter
                ? 'Ubah filter kategori atau status untuk melihat thread lain.'
                : 'Klik tombol Kirim Pesan Baru untuk memulai diskusi dengan admin.'
            }
            action={
              hasFilter ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCategoryFilter('');
                    setStatusFilter('');
                  }}
                >
                  Reset filter
                </Button>
              ) : (
                <Button type="button" onClick={openCreate}>
                  <Plus aria-hidden="true" />
                  Kirim Pesan Baru
                </Button>
              )
            }
          />
        }
      >
        <div className="grid gap-3">
          {list.data.map((thread) => (
            <article
              key={thread.id}
              className="surface-card flex flex-col gap-3 rounded-2xl p-4 transition-colors duration-150 hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono tabular-nums">
                    #{thread.id}
                  </Badge>
                  <Badge variant="secondary">
                    {MEMBER_FEEDBACK_CATEGORY_LABELS[thread.category]}
                  </Badge>
                  <Badge variant={statusBadgeVariant(thread.status)}>
                    {MEMBER_STATUS_LABELS[thread.status]}
                  </Badge>
                </div>

                <h2 className="truncate text-sm font-bold text-foreground sm:text-base">
                  {thread.title}
                </h2>
                <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  {thread.description}
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                    <MessageSquare className="size-3.5" aria-hidden="true" />
                    {thread.messageCount} balasan
                  </span>
                  <span>Diperbarui {formatEpochTimestamp(thread.updatedAt, 'id-ID')}</span>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setActiveThreadId(thread.id)}
                >
                  <MessageSquare className="size-3.5" aria-hidden="true" />
                  <span>Buka Diskusi</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="rounded-xl"
                  aria-label={`Ubah ${thread.title}`}
                  onClick={() => openEdit(thread)}
                >
                  <Pencil className="size-3.5" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="rounded-xl text-destructive hover:text-destructive"
                  aria-label={`Hapus ${thread.title}`}
                  onClick={() => setDeleting(thread)}
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

      <FeedbackFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        mode="member"
        saving={saving}
        onDelete={(thread) => {
          setFormOpen(false);
          setDeleting(thread);
        }}
        onSubmit={handleSubmitForm}
      />

      <ThreadConversationDialog
        domain="feedback"
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
        title="Hapus Thread"
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
