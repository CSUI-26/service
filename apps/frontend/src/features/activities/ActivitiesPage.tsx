import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Calendar, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import type { Activity, ImageConfig } from '@zenith/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { ActivityFormDialog } from '@/features/activities/ActivityFormDialog';
import { activitiesApi } from '@/features/activities/api';
import { toActivityPayload, type ActivityFormValues } from '@/features/activities/schema';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useResourceList } from '@/hooks/useResourceList';

const PAGE_SIZE = 12;

function imageStyle(cfg?: ImageConfig) {
  if (!cfg) return undefined;
  return {
    objectPosition: `${cfg.x}% ${cfg.y}%`,
    transform: `scale(${cfg.zoom}) rotate(${cfg.rotate ?? 0}deg)`,
  };
}

export default function ActivitiesPage() {
  useDocumentTitle('Activities');

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [deleting, setDeleting] = useState<Activity | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const list = useResourceList<Activity>({
    path: '/activities',
    pageSize: PAGE_SIZE,
    filters: { search },
  });

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (activity: Activity) => {
    setEditing(activity);
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
    !formOpen && !deleting,
  );

  const submit = async (values: ActivityFormValues) => {
    const payload = toActivityPayload(values);
    setSaving(true);
    try {
      if (editing) {
        const { id: _id, ...updates } = payload;
        await activitiesApi.update(editing.id, updates);
        toast.success('Activity updated');
      } else {
        await activitiesApi.create(payload);
        toast.success('Activity added');
      }
      setFormOpen(false);
      list.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save activity');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    const snapshot = list.data;
    setRemoving(true);
    setDeleting(null);
    list.mutate((items) => items.filter((item) => item.id !== target.id));
    try {
      await activitiesApi.remove(target.id);
      toast.success('Activity deleted');
      list.reload();
    } catch (err) {
      list.mutate(() => snapshot);
      toast.error(err instanceof Error ? err.message : 'Failed to delete activity');
    } finally {
      setRemoving(false);
    }
  };

  const hasFilter = Boolean(search);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Activities"
        description={
          <>
            Manage cohort activities shown on the homepage. Press <Kbd>n</Kbd> to add,{' '}
            <Kbd>/</Kbd> to search.
          </>
        }
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus aria-hidden="true" />
            Add activity
          </Button>
        }
      />

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <SearchInput
          ref={searchRef}
          placeholder="Search activity title, date, or description"
          aria-label="Search activities"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onClear={search ? () => setSearch('') : undefined}
        />
        {hasFilter ? (
          <Button type="button" variant="ghost" onClick={() => setSearch('')}>
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
        skeleton={<ListSkeleton rows={4} />}
        empty={
          <EmptyState
            icon={Calendar}
            title={hasFilter ? 'No matching activities' : 'No activities yet'}
            description={
              hasFilter
                ? 'Change the search keyword.'
                : 'Add the first cohort activity to showcase on the homepage.'
            }
            action={
              hasFilter ? (
                <Button type="button" variant="outline" onClick={() => setSearch('')}>
                  Reset filter
                </Button>
              ) : (
                <Button type="button" onClick={openCreate}>
                  <Plus aria-hidden="true" />
                  Add activity
                </Button>
              )
            }
          />
        }
      >
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table className="text-xs">
            <TableHeader className="bg-muted/50 text-[11px] uppercase text-muted-foreground">
              <TableRow>
                <TableHead className="px-3">Preview</TableHead>
                <TableHead className="px-3 font-mono">ID</TableHead>
                <TableHead className="px-3">Title & Description</TableHead>
                <TableHead className="px-3">Date</TableHead>
                <TableHead className="px-3 font-mono">Order</TableHead>
                <TableHead className="px-3 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell className="w-24 px-3 py-2">
                    <div className="aspect-video w-20 overflow-hidden rounded-md border border-border bg-muted">
                      <img
                        src={activity.image.url}
                        alt={activity.title}
                        loading="lazy"
                        className="h-full w-full object-cover"
                        style={imageStyle(activity.image.config)}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="px-3 font-mono text-primary">{activity.id}</TableCell>
                  <TableCell className="max-w-md px-3">
                    <div className="font-medium text-foreground">{activity.title}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {activity.description}
                    </div>
                  </TableCell>
                  <TableCell className="px-3">
                    {activity.date ? (
                      <Badge variant="secondary">{activity.date}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="px-3 font-mono tabular-nums text-muted-foreground">
                    {activity.position}
                  </TableCell>
                  <TableCell className="px-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(activity)}
                        aria-label={`Edit ${activity.title}`}
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleting(activity)}
                        aria-label={`Delete ${activity.title}`}
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

      <ActivityFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        saving={saving}
        onDelete={(activity) => {
          setFormOpen(false);
          setDeleting(activity);
        }}
        onImageSaved={list.reload}
        onSubmit={submit}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete activity"
        description={
          <>
            Delete <strong>{deleting?.title}</strong>? This action cannot be undone.
          </>
        }
        confirmLabel="Delete activity"
        pending={removing}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
