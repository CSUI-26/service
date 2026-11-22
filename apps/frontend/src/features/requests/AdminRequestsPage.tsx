import { useRef, useState } from 'react';
import { Inbox, MessageSquare, Plus, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type {
  ContentRequestCreate,
  ContentRequestSummary,
  ContentRequestType,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog';
import { EmptyState } from '@/components/patterns/EmptyState';
import { Kbd } from '@/components/patterns/Kbd';
import { ListState } from '@/components/patterns/ListState';
import { PageHeader } from '@/components/patterns/PageHeader';
import { SearchInput } from '@/components/patterns/SearchInput';
import { ListSkeleton } from '@/components/patterns/skeletons';
import { Paginator } from '@/components/Paginator';
import { useAuth } from '@/features/auth/useAuth';
import { ContentRequestFormDialog } from '@/features/content-requests/ContentRequestFormDialog';
import {
  ADMIN_CONTENT_TYPE_LABELS,
  ADMIN_STATUS_LABELS,
  contentRequestsApi,
  formatEpochTimestamp,
  statusBadgeVariant,
} from '@/features/content-requests/api';
import { FeedbackFormDialog } from '@/features/feedback/FeedbackFormDialog';
import { ADMIN_FEEDBACK_CATEGORY_LABELS, feedbackApi } from '@/features/feedback/api';
import { ThreadConversationDialog } from '@/features/requests/ThreadConversationDialog';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useResourceList } from '@/hooks/useResourceList';

const PAGE_SIZE = 15;

function ContentRequestsAdminTab({
  currentUserNpm,
  isAdmin,
}: {
  currentUserNpm: string;
  isAdmin: boolean;
}) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ContentRequestSummary | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<ContentRequestSummary | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const list = useResourceList<ContentRequestSummary>({
    path: '/content-requests',
    pageSize: PAGE_SIZE,
    filters: {
      scope: 'all',
      search,
      contentType: typeFilter,
      status: statusFilter,
    },
  });

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (item: ContentRequestSummary) => {
    setActiveId(null);
    setEditing(item);
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
    !formOpen && !deleting && activeId === null,
  );

  const handleSubmitForm = async (payload: ContentRequestCreate) => {
    setSaving(true);
    try {
      if (editing) {
        await contentRequestsApi.update(editing.id, payload);
        toast.success('Content request updated');
      } else {
        await contentRequestsApi.create(payload);
        toast.success('Content request created');
      }
      setFormOpen(false);
      list.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save content request');
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
      toast.success('Content request deleted');
      list.reload();
    } catch (err) {
      list.mutate(() => snapshot);
      toast.error(err instanceof Error ? err.message : 'Failed to delete content request');
    } finally {
      setRemoving(false);
    }
  };

  const hasFilter = Boolean(search || typeFilter || statusFilter);
  const resetFilters = () => {
    setSearch('');
    setTypeFilter('');
    setStatusFilter('');
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem_11rem_auto_auto]">
        <SearchInput
          ref={searchRef}
          placeholder="Search title, description, or NPM"
          aria-label="Search content requests"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onClear={search ? () => setSearch('') : undefined}
        />

        <Select
          value={typeFilter || 'all'}
          onValueChange={(value) => setTypeFilter(value === 'all' ? '' : value)}
        >
          <SelectTrigger className="w-full" aria-label="Filter content type">
            <SelectValue placeholder="All content types">
              {typeFilter
                ? ADMIN_CONTENT_TYPE_LABELS[typeFilter as ContentRequestType]
                : 'All content types'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All content types</SelectItem>
            <SelectItem value="achievement">{ADMIN_CONTENT_TYPE_LABELS.achievement}</SelectItem>
            <SelectItem value="gallery">{ADMIN_CONTENT_TYPE_LABELS.gallery}</SelectItem>
            <SelectItem value="activity">{ADMIN_CONTENT_TYPE_LABELS.activity}</SelectItem>
            <SelectItem value="other">{ADMIN_CONTENT_TYPE_LABELS.other}</SelectItem>
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

        <Button type="button" onClick={openCreate}>
          <Plus aria-hidden="true" />
          New content request
        </Button>
      </div>

      <ListState
        loading={list.loading}
        error={list.error}
        isEmpty={list.data.length === 0}
        onRetry={list.reload}
        skeleton={<ListSkeleton rows={6} />}
        empty={
          <EmptyState
            icon={Sparkles}
            title={hasFilter ? 'No matching content requests' : 'No content requests yet'}
            description={
              hasFilter
                ? 'Adjust the search keyword, content type, or status filter.'
                : 'Member achievement, gallery, and activity requests will appear here.'
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
                <TableHead className="px-3">Type</TableHead>
                <TableHead className="px-3">Title</TableHead>
                <TableHead className="px-3">Status</TableHead>
                <TableHead className="px-3 font-mono">Replies</TableHead>
                <TableHead className="px-3">Updated</TableHead>
                <TableHead className="px-3 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="px-3 font-mono tabular-nums text-primary">
                    #{item.id}
                  </TableCell>
                  <TableCell className="px-3">
                    <div className="font-medium text-foreground">
                      {item.author?.name ?? item.authorNpm}
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {item.authorNpm}
                    </div>
                  </TableCell>
                  <TableCell className="px-3">
                    <Badge variant="secondary">
                      {ADMIN_CONTENT_TYPE_LABELS[item.contentType]}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs px-3">
                    <div className="truncate font-medium text-foreground">{item.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{item.description}</div>
                  </TableCell>
                  <TableCell className="px-3">
                    <Badge variant={statusBadgeVariant(item.status)}>
                      {ADMIN_STATUS_LABELS[item.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3 font-mono tabular-nums text-muted-foreground">
                    {item.messageCount}
                  </TableCell>
                  <TableCell className="px-3 text-muted-foreground">
                    {formatEpochTimestamp(item.updatedAt, 'en-US')}
                  </TableCell>
                  <TableCell className="px-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setActiveId(item.id)}
                        aria-label={`Inspect thread ${item.title}`}
                      >
                        <MessageSquare aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleting(item)}
                        aria-label={`Delete ${item.title}`}
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

      <ContentRequestFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        mode="admin"
        saving={saving}
        onDelete={(item) => {
          setFormOpen(false);
          setDeleting(item);
        }}
        onSubmit={handleSubmitForm}
      />

      <ThreadConversationDialog
        domain="content-request"
        threadId={activeId}
        open={activeId !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setActiveId(null);
        }}
        mode="admin"
        currentUserNpm={currentUserNpm}
        isAdmin={isAdmin}
        onEditThread={openEdit}
        onThreadChanged={list.reload}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeleting(null);
        }}
        title="Delete content request"
        description={
          <>
            Delete <strong>{deleting?.title}</strong> and all replies? This action cannot be undone.
          </>
        }
        confirmLabel="Delete request"
        pending={removing}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

function FeedbackAdminTab({
  currentUserNpm,
  isAdmin,
}: {
  currentUserNpm: string;
  isAdmin: boolean;
}) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FeedbackThreadSummary | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<FeedbackThreadSummary | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const list = useResourceList<FeedbackThreadSummary>({
    path: '/feedback',
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

  const openEdit = (thread: FeedbackThreadSummary) => {
    setActiveId(null);
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
    !formOpen && !deleting && activeId === null,
  );

  const handleSubmitForm = async (payload: FeedbackThreadCreate) => {
    setSaving(true);
    try {
      if (editing) {
        await feedbackApi.update(editing.id, payload);
        toast.success('Feedback thread updated');
      } else {
        await feedbackApi.create(payload);
        toast.success('Feedback thread created');
      }
      setFormOpen(false);
      list.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save feedback thread');
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
      toast.success('Feedback thread deleted');
      list.reload();
    } catch (err) {
      list.mutate(() => snapshot);
      toast.error(err instanceof Error ? err.message : 'Failed to delete feedback thread');
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
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem_11rem_auto_auto]">
        <SearchInput
          ref={searchRef}
          placeholder="Search subject, description, or NPM"
          aria-label="Search feedback threads"
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
                ? ADMIN_FEEDBACK_CATEGORY_LABELS[categoryFilter as FeedbackCategory]
                : 'All categories'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="feedback">{ADMIN_FEEDBACK_CATEGORY_LABELS.feedback}</SelectItem>
            <SelectItem value="help">{ADMIN_FEEDBACK_CATEGORY_LABELS.help}</SelectItem>
            <SelectItem value="other">{ADMIN_FEEDBACK_CATEGORY_LABELS.other}</SelectItem>
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

        <Button type="button" onClick={openCreate}>
          <Plus aria-hidden="true" />
          New feedback thread
        </Button>
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
            title={hasFilter ? 'No matching feedback threads' : 'No feedback threads yet'}
            description={
              hasFilter
                ? 'Adjust the search keyword, category, or status filter.'
                : 'Member feedback and help threads will appear here.'
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
                    <Badge variant="secondary">
                      {ADMIN_FEEDBACK_CATEGORY_LABELS[thread.category]}
                    </Badge>
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
                        onClick={() => setActiveId(thread.id)}
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

      <FeedbackFormDialog
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

      <ThreadConversationDialog
        domain="feedback"
        threadId={activeId}
        open={activeId !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setActiveId(null);
        }}
        mode="admin"
        currentUserNpm={currentUserNpm}
        isAdmin={isAdmin}
        onEditThread={openEdit}
        onThreadChanged={list.reload}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeleting(null);
        }}
        title="Delete feedback thread"
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

export default function AdminRequestsPage() {
  useDocumentTitle('Requests & Feedback (Admin)');

  const { user } = useAuth();
  const currentUserNpm = user?.npm ?? '';
  const isAdmin = Boolean(user?.isAdmin);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Requests & Feedback"
        description={
          <>
            Triage member content submissions, feedback, and private support threads. Press{' '}
            <Kbd>n</Kbd> to add, <Kbd>/</Kbd> to search.
          </>
        }
      />

      <Tabs defaultValue="content" className="space-y-4">
        <TabsList>
          <TabsTrigger value="content">Content Requests</TabsTrigger>
          <TabsTrigger value="feedback">Feedback &amp; Help</TabsTrigger>
        </TabsList>

        <TabsContent value="content">
          <ContentRequestsAdminTab currentUserNpm={currentUserNpm} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="feedback">
          <FeedbackAdminTab currentUserNpm={currentUserNpm} isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
