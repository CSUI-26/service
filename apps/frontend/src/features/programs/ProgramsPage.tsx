import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { GraduationCap, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/patterns/EmptyState';
import { Kbd } from '@/components/patterns/Kbd';
import { ListState } from '@/components/patterns/ListState';
import { PageHeader } from '@/components/patterns/PageHeader';
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog';
import { ListSkeleton } from '@/components/patterns/skeletons';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useResourceList } from '@/hooks/useResourceList';
import { ProgramFormDialog } from '@/features/programs/ProgramFormDialog';
import { programsApi } from '@/features/programs/api';
import type { ProgramFormValues } from '@/features/programs/schema';
import type { Program } from '@/features/programs/types';

function toPayload(values: ProgramFormValues): Program {
  return {
    id: values.id,
    name: values.name,
    slug: values.slug,
    description: values.description,
    careers: values.careers
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    courseMapUrl: values.courseMapUrl,
    driveUrl: values.driveUrl,
    semesters: [],
  };
}

export default function ProgramsPage() {
  useDocumentTitle('Study Programs');

  const list = useResourceList<Program>({ path: '/programs', pageSize: 100 });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Program | null>(null);
  const [deleting, setDeleting] = useState<Program | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (program: Program) => {
    setEditing(program);
    setFormOpen(true);
  };

  useKeyboardShortcuts({ n: openCreate }, !formOpen && !deleting);

  const submit = async (values: ProgramFormValues) => {
    const payload = toPayload(values);
    const snapshot = list.data;
    setSaving(true);
    setFormOpen(false);

    if (editing) {
      const previous = editing;
      list.mutate((items) =>
        items.map((item) =>
          item.id === previous.id
            ? { ...item, ...payload, semesters: item.semesters }
            : item,
        ),
      );
      try {
        await programsApi.update(previous.id, { ...payload, semesters: previous.semesters });
        toast.success('Study program updated');
        list.reload();
      } catch (err) {
        list.mutate(() => snapshot);
        toast.error(err instanceof Error ? err.message : 'Failed to save study program');
        setFormOpen(true);
      } finally {
        setSaving(false);
      }
      return;
    }

    list.mutate((items) =>
      [...items, payload].sort((a, b) => a.name.localeCompare(b.name)),
    );
    try {
      await programsApi.create(payload);
      toast.success('Study program added');
      list.reload();
    } catch (err) {
      list.mutate(() => snapshot);
      toast.error(err instanceof Error ? err.message : 'Failed to save study program');
      setFormOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const snapshot = list.data;
    const target = deleting;
    setRemoving(true);
    setDeleting(null);
    list.mutate((items) => items.filter((item) => item.id !== target.id));
    try {
      await programsApi.remove(target.id);
      toast.success('Study program deleted');
      list.reload();
    } catch (err) {
      list.mutate(() => snapshot);
      toast.error(err instanceof Error ? err.message : 'Failed to delete study program');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Study Programs"
        description={
          <>
            Manage study programs and their curriculum links. Press <Kbd>n</Kbd> to add.
          </>
        }
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus aria-hidden="true" />
            Add program
          </Button>
        }
      />

      <ListState
        loading={list.loading}
        error={list.error}
        isEmpty={list.data.length === 0}
        onRetry={list.reload}
        skeleton={<ListSkeleton rows={4} />}
        empty={
          <EmptyState
            icon={GraduationCap}
            title="No study programs yet"
            description="Add the first study program so courses can be grouped."
            action={
              <Button type="button" onClick={openCreate}>
                <Plus aria-hidden="true" />
                Add program
              </Button>
            }
          />
        }
      >
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table className="text-xs">
            <TableHeader className="bg-muted/50 text-[11px] uppercase text-muted-foreground">
              <TableRow>
                <TableHead className="px-3 font-mono">ID</TableHead>
                <TableHead className="px-3">Name</TableHead>
                <TableHead className="px-3">Slug</TableHead>
                <TableHead className="px-3 font-mono">Semesters</TableHead>
                <TableHead className="px-3">Courses</TableHead>
                <TableHead className="px-3 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.map((program) => (
                <TableRow key={program.id}>
                  <TableCell className="px-3 font-mono font-medium text-primary">
                    {program.id}
                  </TableCell>
                  <TableCell className="px-3 font-medium text-foreground">
                    {program.name}
                  </TableCell>
                  <TableCell className="px-3 font-mono text-muted-foreground">
                    {program.slug}
                  </TableCell>
                  <TableCell className="px-3 font-mono tabular-nums text-muted-foreground">
                    {program.semesters.length}
                  </TableCell>
                  <TableCell className="px-3">
                    <Link
                      to={`/courses?program=${encodeURIComponent(program.id)}`}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      View courses
                    </Link>
                  </TableCell>
                  <TableCell className="px-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(program)}
                        aria-label={`Edit ${program.name}`}
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleting(program)}
                        aria-label={`Delete ${program.name}`}
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
      </ListState>

      <ProgramFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        saving={saving}
        onSubmit={submit}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete study program"
        description={
          <>
            Delete <strong>{deleting?.name}</strong>? Courses inside it will also be deleted and this action cannot be undone.
          </>
        }
        confirmLabel="Delete program"
        pending={removing}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
