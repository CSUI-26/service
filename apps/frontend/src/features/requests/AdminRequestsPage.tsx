import { useRef, useState } from 'react';
import { Inbox, MessageSquare, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type {
  RequestCategory,
  RequestStatus,
  RequestThreadCreate,
  RequestThreadSummary,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog';
import { EmptyState } from '@/components/patterns/EmptyState';
import { Kbd } from '@/components/patterns/Kbd';
import { ListState } from '@/components/patterns/ListState';
import { PageHeader } from '@/components/patterns/PageHeader';
import { SearchInput } from '@/components/patterns/SearchInput';
import { ListSkeleton } from '@/components/patterns/skeletons';
import { Paginator } from '@/components/Paginator';
import { useAuth } from '@/features/auth/useAuth';
import { RequestFormDialog } from '@/features/requests/RequestFormDialog';
import { RequestThreadDialog } from '@/features/requests/RequestThreadDialog';
import {
  ADMIN_CATEGORY_LABELS,
  ADMIN_CONTENT_TYPE_LABELS,
  ADMIN_STATUS_LABELS,
  formatEpochTimestamp,
  requestsApi,
  statusBadgeVariant,
} from '@/features/requests/api';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useResourceList } from '@/hooks/useResourceList';

const PAGE_SIZE = 15;

export default function AdminRequestsPage() {
  useDocumentTitle('Requests (Admin)');

  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RequestThreadSummary | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<RequestThreadSummary | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const list = useResourceList<RequestThreadSummary>({
    path: '/requests',
    pageSize: PAGE_SIZE,
    filters: {
      scope: 'all',
      search,
      category: categoryFilter,
      status: statusFilter,
    },
  });

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (thread: RequestThreadSummary) => {
    setActiveThreadId(null);
    setEditing(thread);
    setFormOpen(true);
  };

  useKeyboardShortcuts(
    {
      n: openCreate,
      '/': (event) => {
        event.preventDefault();
        searchRef.current?.focus();
      },
    },
    !formOpen && !deleting && activeThreadId === null,
  );

  const handleSubmitForm = async (payload: RequestThreadCreate) => {
    setSaving(true);
    try {
      if (editing) {
        await requestsApi.update(editing.id, payload);
        toast.success('Request updated');
      } else {
        await requestsApi.create(payload);
        toast.success('Request created');
      }
      setFormOpen(false);
      list.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save request');
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
      await requestsApi.remove(target.id);
      toast.success('Request deleted');
      list.reload();
    } catch (err) {
      list.mutate(() => snapshot);
      toast.error(err instanceof Error ? err.message : 'Failed to delete request');
    } finally {
      setRemoving(false);
    }
  };

  const hasFilter = Boolean(search || categoryFilter || statusFilter);

  const resetFilters = () => {
    setSearch('');
    setCategoryFilter('');
    setStatusFilter('');
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Member Requests"
        description={
          <>
            Triage content requests, feedback, and private support threads. Press{' '}
            <Kbd>n</Kbd> to add, <Kbd>/</Kbd> to search.
          </>
        }
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus aria-hidden="true" />
            New request
          </Button>
        }
      />

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem_11rem_auto]">
        <SearchInput
          ref={searchRef}
          placeholder="Search subject, description, or NPM"
          aria-label="Search member requests"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onClear={search ? () => setSearch('') : undefined}
        />

        <Select
          value={categoryFilter || 'all'}
          onValueChange={(value) => setCategoryFilter(value === 'all' ? '' : value)}
        >
          <SelectTrigger className="w-full" aria-label="Filter category">
            <SelectValue placeholder="All categories">
              {categoryFilter
                ? ADMIN_CATEGORY_LABELS[categoryFilter as RequestCategory]
                : 'All categories'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="content">{ADMIN_CATEGORY_LABELS.content}</SelectItem>
            <SelectItem value="feedback">{ADMIN_CATEGORY_LABELS.feedback}</SelectItem>
            <SelectItem value="help">{ADMIN_CATEGORY_LABELS.help}</SelectItem>
            <SelectItem value="other">{ADMIN_CATEGORY_LABELS.other}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={statusFilter || 'all'}
          onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}
        >
          <SelectTrigger className="w-full" aria-label="Filter status">
            <SelectValue placeholder="All statuses">
              {statusFilter ? ADMIN_STATUS_LABELS[statusFilter as RequestStatus] : 'All statuses'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">{ADMIN_STATUS_LABELS.open}</SelectItem>
            <SelectItem value="in_progress">{ADMIN_STATUS_LABELS.in_progress}</SelectItem>
            <SelectItem value="resolved">{ADMIN_STATUS_LABELS.resolved}</SelectItem>
            <SelectItem value="closed">{ADMIN_STATUS_LABELS.closed}</SelectItem>
          </SelectContent>
        </Select>

        {hasFilter ? (
          <Button type="button" variant="ghost" onClick={resetFilters} aria-label="Reset filters">
            <RotateCcw aria-hidden="true" />
            Reset
          </Button>
        ) : null}
      </div>

      <ListState
        loading={list.loading}
        error={list.error}
        isEmpty={list.data.length === 0}
        onRetry={list.reload}
        skeleton={<ListSkeleton rows={6} />}
        empty={
          <EmptyState
            icon={Inbox}
            title={hasFilter ? 'No matching requests' : 'No member requests yet'}
            description={
              hasFilter
                ? 'Adjust the search keyword, category, or status filter.'
                : 'Member content requests, feedback, and help threads will appear here.'
            }
            action={
              hasFilter ? (
                <Button type="button" variant="outline" onClick={resetFilters}>
                  Reset filters
                </Button>
              ) : undefined
            }
          />
        }
      >
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table className="text-xs">
            <TableHeader className="bg-muted/50 text-[11px] uppercase text-muted-foreground">
              <TableRow>
                <TableHead className="px-3 font-mono">ID</TableHead>
                <TableHead className="px-3">Member</TableHead>
                <TableHead className="px-3">Category</TableHead>
                <TableHead className="px-3">Subject</TableHead>
                <TableHead className="px-3">Status</TableHead>
                <TableHead className="px-3 font-mono">Replies</TableHead>
                <TableHead className="px-3">Updated</TableHead>
                <TableHead className="px-3 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.map((thread) => (
                <TableRow key={thread.id}>
                  <TableCell className="px-3 font-mono tabular-nums text-primary">
                    #{thread.id}
                  </TableCell>
                  <TableCell className="px-3">
                    <div className="font-medium text-foreground">
                      {thread.author?.name ?? thread.authorNpm}
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {thread.authorNpm}
                    </div>
                  </TableCell>
                  <TableCell className="px-3">
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge variant="secondary">{ADMIN_CATEGORY_LABELS[thread.category]}</Badge>
                      {thread.category === 'content' && thread.metadata?.contentType ? (
                        <Badge variant="outline">
                          {ADMIN_CONTENT_TYPE_LABELS[thread.metadata.contentType]}
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs px-3">
                    <div className="truncate font-medium text-foreground">{thread.title}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {thread.description}
                    </div>
                  </TableCell>
                  <TableCell className="px-3">
                    <Badge variant={statusBadgeVariant(thread.status)}>
                      {ADMIN_STATUS_LABELS[thread.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3 font-mono tabular-nums text-muted-foreground">
                    {thread.messageCount}
                  </TableCell>
                  <TableCell className="px-3 text-muted-foreground">
                    {formatEpochTimestamp(thread.updatedAt, 'en-US')}
                  </TableCell>
                  <TableCell className="px-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setActiveThreadId(thread.id)}
                        aria-label={`Inspect thread ${thread.title}`}
                      >
                        <MessageSquare aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleting(thread)}
                        aria-label={`Delete ${thread.title}`}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Paginator
          page={list.page}
          totalPages={list.totalPages}
          total={list.total}
          onPageChange={list.setPage}
        />
      </ListState>

      <RequestFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        mode="admin"
        saving={saving}
        onDelete={(thread) => {
          setFormOpen(false);
          setDeleting(thread);
        }}
        onSubmit={handleSubmitForm}
      />

      <RequestThreadDialog
        threadId={activeThreadId}
        open={activeThreadId !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setActiveThreadId(null);
        }}
        mode="admin"
        currentUserNpm={user?.npm ?? ''}
        isAdmin={Boolean(user?.isAdmin)}
        onEditThread={openEdit}
        onThreadChanged={list.reload}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeleting(null);
        }}
        title="Delete request thread"
        description={
          <>
            Delete <strong>{deleting?.title}</strong> and all replies? This action cannot be undone.
          </>
        }
        confirmLabel="Delete thread"
        pending={removing}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
