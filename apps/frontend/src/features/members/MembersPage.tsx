import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Plus, RotateCcw, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/patterns/EmptyState';
import { ListState } from '@/components/patterns/ListState';
import { PageHeader } from '@/components/patterns/PageHeader';
import { SearchInput } from '@/components/patterns/SearchInput';
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog';
import { ListSkeleton } from '@/components/patterns/skeletons';
import { Kbd } from '@/components/patterns/Kbd';
import { Paginator } from '@/components/Paginator';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useResourceList } from '@/hooks/useResourceList';
import { MemberAvatar } from '@/features/members/MemberCard';
import { MemberFormDialog } from '@/features/members/MemberFormDialog';
import { membersApi } from '@/features/members/api';
import { programsApi } from '@/features/programs/api';
import type { Program } from '@/features/programs/types';
import { toMemberPayload, type MemberFormValues } from '@/features/members/schema';
import type { Member } from '@/features/members/types';
import { useAuth } from '@/features/auth/useAuth';

const PAGE_SIZE = 12;

export default function MembersPage() {
  useDocumentTitle('Members');

  const { user } = useAuth();
  const isAdmin = user?.isAdmin ?? false;
  const [search, setSearch] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [programs, setPrograms] = useState<Program[]>([]);

  useEffect(() => {
    let active = true;
    programsApi
      .list()
      .then((res) => {
        if (active) setPrograms(res.data);
      })
      .catch((err) => {
        if (active) {
          toast.error(err instanceof Error ? err.message : 'Failed to load study programs');
        }
      });
    return () => {
      active = false;
    };
  }, []);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState<Member | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const list = useResourceList<Member>({
    path: '/members',
    pageSize: PAGE_SIZE,
    filters: { search, program: programFilter },
  });

  const programItems: Record<string, string> = { all: 'All programs' };
  for (const program of programs) programItems[program.id] = program.name;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (member: Member) => {
    setEditing(member);
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

  const submit = async (values: MemberFormValues) => {
    const payload = {
      ...toMemberPayload(values),
      major: programs.find((program) => program.id === values.programId)?.name ?? '',
    };
    const snapshot = list.data;
    setSaving(true);
    setFormOpen(false);

    if (editing) {
      const previous = editing;
      list.mutate((items) => items.map((item) => (item.npm === previous.npm ? payload : item)));
      try {
        await membersApi.update(previous.npm, payload);
        toast.success('Member updated');
        list.reload();
      } catch (err) {
        list.mutate(() => snapshot);
        toast.error(err instanceof Error ? err.message : 'Failed to save member');
        setFormOpen(true);
      } finally {
        setSaving(false);
      }
      return;
    }

    list.mutate((items) => [payload, ...items]);
    try {
      await membersApi.create(payload);
      toast.success('Member added');
      list.reload();
    } catch (err) {
      list.mutate(() => snapshot);
      toast.error(err instanceof Error ? err.message : 'Failed to save member');
      setFormOpen(true);
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
    list.mutate((items) => items.filter((item) => item.npm !== target.npm));
    try {
      await membersApi.remove(target.npm);
      toast.success('Member deleted');
      list.reload();
    } catch (err) {
      list.mutate(() => snapshot);
      toast.error(err instanceof Error ? err.message : 'Failed to delete member');
    } finally {
      setRemoving(false);
    }
  };

  const hasFilter = Boolean(search || programFilter);

  const resetFilters = () => {
    setSearch('');
    setProgramFilter('');
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Members"
        description={
          <>
            Member directory with social links. Press <Kbd>n</Kbd> to add,{' '}
            <Kbd>/</Kbd> to search.
          </>
        }
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus aria-hidden="true" />
            Add member
          </Button>
        }
      />

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
        <SearchInput
          ref={searchRef}
          placeholder="Search name or NPM"
          aria-label="Search members"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onClear={search ? () => setSearch('') : undefined}
        />
        <Select
          value={programFilter || 'all'}
          onValueChange={(value) => setProgramFilter(value === 'all' ? '' : (value ?? ''))}
        >
          <SelectTrigger className="w-full" aria-label="Filter study program">
            <SelectValue placeholder="All programs">{programItems[programFilter || 'all']}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All programs</SelectItem>
            {programs.map((program) => (
              <SelectItem key={program.id} value={program.id}>
                {program.name}
              </SelectItem>
            ))}
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
            icon={Users}
            title={hasFilter ? 'No matching members' : 'No members yet'}
            description={
              hasFilter
                ? 'Change the keyword or filter used.'
                : 'Add the first member to populate the directory.'
            }
            action={
              hasFilter ? (
                <Button type="button" variant="outline" onClick={resetFilters}>
                  Reset filter
                </Button>
              ) : (
                <Button type="button" onClick={openCreate}>
                  <Plus aria-hidden="true" />
                  Add member
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
                <TableHead className="px-3 font-mono">NPM</TableHead>
                <TableHead className="px-3">Name</TableHead>
                <TableHead className="px-3">Nickname</TableHead>
                <TableHead className="px-3">Study Program</TableHead>
                <TableHead className="px-3">Niche</TableHead>
                {isAdmin ? <TableHead className="px-3 text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.map((member) => (
                <TableRow key={member.npm}>
                  <TableCell className="px-3 font-mono tabular-nums text-primary">
                    {member.npm}
                  </TableCell>
                  <TableCell className="px-3">
                    <div className="flex items-center gap-2.5">
                      <MemberAvatar member={member} size="sm" />
                      <span className="font-medium text-foreground">{member.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 text-muted-foreground">
                    {member.nama_panggilan}
                  </TableCell>
                  <TableCell className="px-3 text-muted-foreground">
                    {member.major}
                  </TableCell>
                  <TableCell className="max-w-52 truncate px-3 text-muted-foreground">
                    {member.niche || '-'}
                  </TableCell>
                  {isAdmin ? (
                    <TableCell className="px-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(member)}
                          aria-label={`Edit ${member.name}`}
                        >
                          <Pencil aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleting(member)}
                          aria-label={`Delete ${member.name}`}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
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

      <MemberFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        saving={saving}
        isAdmin={isAdmin}
        onDelete={(member) => { setFormOpen(false); setDeleting(member); }}
        onPhotoSaved={(saved) => {
          list.mutate((prev) => prev.map((item) => (item.npm === saved.npm ? saved : item)));
        }}
        onSubmit={submit}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete member"
        description={
          <>
            Delete <strong>{deleting?.name}</strong> from the directory? This action cannot be undone.
          </>
        }
        confirmLabel="Delete member"
        pending={removing}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
