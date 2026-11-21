import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Plus, RotateCcw, Star, Trash2, Trophy } from 'lucide-react';
import type { Achievement, ImageConfig } from '@zenith/shared';
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
import { AchievementFormDialog } from '@/features/achievements/AchievementFormDialog';
import { achievementsApi } from '@/features/achievements/api';
import {
  toAchievementPayload,
  type AchievementFormValues,
} from '@/features/achievements/schema';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useResourceList } from '@/hooks/useResourceList';

const PAGE_SIZE = 12;

const FEATURED_FILTER_LABELS: Record<string, string> = {
  all: 'All status',
  true: 'Featured only',
  false: 'Regular only',
};

function imageStyle(cfg?: ImageConfig) {
  if (!cfg) return undefined;
  return {
    objectPosition: `${cfg.x}% ${cfg.y}%`,
    transform: `scale(${cfg.zoom}) rotate(${cfg.rotate ?? 0}deg)`,
  };
}

export default function AchievementsPage() {
  useDocumentTitle('Achievements');

  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [featuredFilter, setFeaturedFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Achievement | null>(null);
  const [deleting, setDeleting] = useState<Achievement | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const list = useResourceList<Achievement>({
    path: '/achievements',
    pageSize: PAGE_SIZE,
    filters: { search, year: yearFilter, featured: featuredFilter },
  });

  const yearOptions = useMemo(() => {
    const set = new Set<number>([2030, 2029, 2028, 2027, 2026, 2025, 2024]);
    for (const item of list.data) {
      if (Number.isFinite(item.year)) set.add(item.year);
    }
    if (yearFilter && Number.isFinite(Number(yearFilter))) {
      set.add(Number(yearFilter));
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [list.data, yearFilter]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (item: Achievement) => {
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
    !formOpen && !deleting,
  );

  const submit = async (values: AchievementFormValues) => {
    const payload = toAchievementPayload(values);
    const snapshot = list.data;
    setSaving(true);
    try {
      if (editing) {
        const { id: _id, ...updates } = payload;
        const nextRecord: Achievement = {
          ...editing,
          ...updates,
          position: editing.position,
        };
        list.mutate((items) =>
          items.map((item) => (item.id === editing.id ? nextRecord : item)),
        );
        await achievementsApi.update(editing.id, {
          ...updates,
          position: editing.position,
        });
        toast.success('Achievement updated');
      } else {
        await achievementsApi.create(payload);
        toast.success('Achievement added');
      }
      setFormOpen(false);
      list.reload();
    } catch (err) {
      list.mutate(() => snapshot);
      toast.error(err instanceof Error ? err.message : 'Failed to save achievement');
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
      await achievementsApi.remove(target.id);
      toast.success('Achievement deleted');
      list.reload();
    } catch (err) {
      list.mutate(() => snapshot);
      toast.error(err instanceof Error ? err.message : 'Failed to delete achievement');
    } finally {
      setRemoving(false);
    }
  };

  const hasFilter = Boolean(search || yearFilter || featuredFilter);

  const resetFilters = () => {
    setSearch('');
    setYearFilter('');
    setFeaturedFilter('');
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Achievements"
        description={
          <>
            Manage competition achievements, photos, and featured highlights. Press <Kbd>n</Kbd> to
            add, <Kbd>/</Kbd> to search.
          </>
        }
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus aria-hidden="true" />
            Add achievement
          </Button>
        }
      />

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_11rem_auto]">
        <SearchInput
          ref={searchRef}
          placeholder="Search title, award, or team"
          aria-label="Search achievements"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onClear={search ? () => setSearch('') : undefined}
        />
        <Select
          value={yearFilter || 'all'}
          onValueChange={(value) => setYearFilter(value === 'all' ? '' : (value ?? ''))}
        >
          <SelectTrigger className="w-full" aria-label="Filter year">
            <SelectValue placeholder="All years">{yearFilter || 'All years'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All years</SelectItem>
            {yearOptions.map((year) => (
              <SelectItem key={year} value={String(year)} className="font-mono tabular-nums">
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={featuredFilter || 'all'}
          onValueChange={(value) => setFeaturedFilter(value === 'all' ? '' : (value ?? ''))}
        >
          <SelectTrigger className="w-full" aria-label="Filter status">
            <SelectValue placeholder="All status">
              {FEATURED_FILTER_LABELS[featuredFilter || 'all']}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="true">Featured only</SelectItem>
            <SelectItem value="false">Regular only</SelectItem>
          </SelectContent>
        </Select>
        {hasFilter ? (
          <Button type="button" variant="ghost" onClick={resetFilters}>
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
            icon={Trophy}
            title={hasFilter ? 'No matching achievements' : 'No achievements yet'}
            description={
              hasFilter
                ? 'Change the search keyword, year, or status filter.'
                : 'Add the first achievement to populate the showcase and archive.'
            }
            action={
              hasFilter ? (
                <Button type="button" variant="outline" onClick={resetFilters}>
                  Reset filter
                </Button>
              ) : (
                <Button type="button" onClick={openCreate}>
                  <Plus aria-hidden="true" />
                  Add achievement
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
                <TableHead className="px-3">Title &amp; Team</TableHead>
                <TableHead className="px-3">Award</TableHead>
                <TableHead className="px-3 font-mono">Year</TableHead>
                <TableHead className="px-3">Highlight</TableHead>
                <TableHead className="px-3 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.map((item) => (
                <TableRow
                  key={item.id}
                  data-featured={item.isFeatured ? 'true' : 'false'}
                  className={
                    item.isFeatured
                      ? 'border-l-2 border-l-primary bg-primary/5 hover:bg-primary/10'
                      : undefined
                  }
                >
                  <TableCell className="w-24 px-3 py-2">
                    <div
                      className="flex w-24 items-center justify-center overflow-hidden rounded-md border border-border bg-muted"
                      style={{ aspectRatio: '16 / 9' }}
                    >
                      {item.image?.url ? (
                        <img
                          src={item.image.url}
                          alt={item.title}
                          style={imageStyle(item.image.config)}
                          className="size-full object-cover"
                        />
                      ) : (
                        <Trophy
                          className="size-4 text-muted-foreground/60"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="max-w-xs px-3 py-2">
                    <p className="truncate font-medium text-foreground">{item.title}</p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {item.id}
                      {item.teamName ? ` · ${item.teamName}` : ''}
                    </p>
                    {item.members.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {item.members.slice(0, 3).map((member) => (
                          <Badge
                            key={member}
                            variant="outline"
                            className="px-1.5 py-0 text-[10px] font-normal"
                          >
                            {member}
                          </Badge>
                        ))}
                        {item.members.length > 3 ? (
                          <Badge variant="outline" className="px-1.5 py-0 font-mono text-[10px]">
                            +{item.members.length - 3}
                          </Badge>
                        ) : null}
                      </div>
                    ) : null}
                  </TableCell>

                  <TableCell className="px-3 py-2">
                    {item.award ? (
                      <Badge variant="secondary" className="font-mono text-[11px]">
                        {item.award}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </TableCell>

                  <TableCell className="px-3 py-2 font-mono tabular-nums text-foreground">
                    {item.year}
                  </TableCell>

                  <TableCell className="px-3 py-2">
                    {item.isFeatured ? (
                      <Badge className="gap-1 bg-primary text-primary-foreground">
                        <Star className="size-3 fill-current" aria-hidden="true" />
                        <span>Featured</span>
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">Regular</span>
                    )}
                  </TableCell>

                  <TableCell className="px-3 py-2 text-right">
                    <div className="inline-flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${item.title}`}
                        onClick={() => openEdit(item)}
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${item.title}`}
                        onClick={() => setDeleting(item)}
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

      <AchievementFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        saving={saving}
        onDelete={(item) => {
          setFormOpen(false);
          setDeleting(item);
        }}
        onSubmit={submit}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete achievement"
        description={
          <>
            Delete <strong>{deleting?.title}</strong> from achievements? This action cannot be
            undone.
          </>
        }
        confirmLabel="Delete achievement"
        pending={removing}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
