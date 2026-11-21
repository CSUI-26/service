import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Images, Pencil, Plus, RotateCcw, Star, Trash2 } from 'lucide-react';
import type { GalleryCategory, GalleryItem, ImageConfig } from '@zenith/shared';
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
import { GalleryFormDialog } from '@/features/gallery/GalleryFormDialog';
import { galleryApi } from '@/features/gallery/api';
import { toGalleryPayload, type GalleryFormValues } from '@/features/gallery/schema';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useResourceList } from '@/hooks/useResourceList';

const PAGE_SIZE = 12;

const CATEGORY_LABELS: Record<GalleryCategory, string> = {
  photo: 'Cohort Photo',
  hero: 'Mascot Hero',
  highlight: 'Homepage Highlight',
};

function aspectToCss(aspect?: string): string {
  if (!aspect) return '4 / 3';
  const [rawW, rawH] = aspect.split(':');
  const w = Number(rawW);
  const h = Number(rawH);
  return Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0 ? `${w} / ${h}` : '4 / 3';
}

function imageStyle(cfg?: ImageConfig) {
  if (!cfg) return undefined;
  return {
    objectPosition: `${cfg.x}% ${cfg.y}%`,
    transform: `scale(${cfg.zoom}) rotate(${cfg.rotate ?? 0}deg)`,
  };
}

export default function GalleryPage() {
  useDocumentTitle('Gallery');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [deleting, setDeleting] = useState<GalleryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const list = useResourceList<GalleryItem>({
    path: '/gallery',
    pageSize: PAGE_SIZE,
    filters: { search, category: categoryFilter },
  });

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (item: GalleryItem) => {
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

  const submit = async (values: GalleryFormValues) => {
    const payload = toGalleryPayload(values);
    setSaving(true);
    try {
      if (editing) {
        const { id: _id, ...updates } = payload;
        await galleryApi.update(editing.id, updates);
        toast.success('Gallery item updated');
      } else {
        await galleryApi.create(payload);
        toast.success('Gallery item added');
      }
      setFormOpen(false);
      list.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save gallery item');
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
      await galleryApi.remove(target.id);
      toast.success('Gallery item deleted');
      list.reload();
    } catch (err) {
      list.mutate(() => snapshot);
      toast.error(err instanceof Error ? err.message : 'Failed to delete gallery item');
    } finally {
      setRemoving(false);
    }
  };

  const hasFilter = Boolean(search || categoryFilter);

  const resetFilters = () => {
    setSearch('');
    setCategoryFilter('');
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Gallery"
        description={
          <>
            Manage cohort photos, character illustrations, and homepage highlights. Press{' '}
            <Kbd>n</Kbd> to add, <Kbd>/</Kbd> to search.
          </>
        }
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus aria-hidden="true" />
            Add item
          </Button>
        }
      />

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_13rem_auto]">
        <SearchInput
          ref={searchRef}
          placeholder="Search title, ID, or alt text"
          aria-label="Search gallery items"
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
              {categoryFilter ? CATEGORY_LABELS[categoryFilter as GalleryCategory] : 'All categories'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="photo">Cohort Photo</SelectItem>
            <SelectItem value="hero">Mascot Hero</SelectItem>
            <SelectItem value="highlight">Homepage Highlight</SelectItem>
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
            icon={Images}
            title={hasFilter ? 'No matching gallery items' : 'No gallery items yet'}
            description={
              hasFilter
                ? 'Change the search keyword or category filter.'
                : 'Add the first cohort photo, mascot illustration, or homepage highlight.'
            }
            action={
              hasFilter ? (
                <Button type="button" variant="outline" onClick={resetFilters}>
                  Reset filter
                </Button>
              ) : (
                <Button type="button" onClick={openCreate}>
                  <Plus aria-hidden="true" />
                  Add item
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
                <TableHead className="px-3">Title & Alt</TableHead>
                <TableHead className="px-3">Category</TableHead>
                <TableHead className="px-3 font-mono">Order</TableHead>
                <TableHead className="px-3 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="w-20 px-3 py-2">
                    <div
                      className="w-16 overflow-hidden rounded-md border border-border bg-muted"
                      style={{ aspectRatio: aspectToCss(item.image.config?.aspect) }}
                    >
                      <img
                        src={item.image.url}
                        alt={item.alt}
                        loading="lazy"
                        className="h-full w-full object-cover"
                        style={imageStyle(item.image.config)}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="px-3 font-mono text-primary">{item.id}</TableCell>
                  <TableCell className="max-w-xs px-3">
                    <div className="font-medium text-foreground">{item.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{item.alt}</div>
                  </TableCell>
                  <TableCell className="px-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary">{CATEGORY_LABELS[item.category]}</Badge>
                      {item.isFeatured ? (
                        <Badge variant="default" className="gap-1">
                          <Star className="size-3" aria-hidden="true" />
                          Featured
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 font-mono tabular-nums text-muted-foreground">
                    {item.position}
                  </TableCell>
                  <TableCell className="px-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(item)}
                        aria-label={`Edit ${item.title}`}
                      >
                        <Pencil aria-hidden="true" />
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

      <GalleryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        saving={saving}
        onDelete={(item) => {
          setFormOpen(false);
          setDeleting(item);
        }}
        onImageSaved={list.reload}
        onSubmit={submit}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete gallery item"
        description={
          <>
            Delete <strong>{deleting?.title}</strong> from the gallery? This action cannot be undone.
          </>
        }
        confirmLabel="Delete item"
        pending={removing}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
