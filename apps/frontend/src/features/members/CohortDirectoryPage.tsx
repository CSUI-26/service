import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/patterns/EmptyState';
import { ListState } from '@/components/patterns/ListState';
import { SearchInput } from '@/components/patterns/SearchInput';
import { CardGridSkeleton } from '@/components/patterns/skeletons';
import { Paginator } from '@/components/Paginator';
import { MemberAvatar } from '@/features/members/MemberCard';
import { ProfileShowcaseCard } from '@/features/members/ProfileShowcaseCard';
import type { Member } from '@/features/members/types';
import { programsApi } from '@/features/programs/api';
import type { Program } from '@/features/programs/types';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useResourceList } from '@/hooks/useResourceList';

const PAGE_SIZE = 16;

function topNiches(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
}

export default function CohortDirectoryPage() {
  useDocumentTitle('Teman Angkatan');

  const [search, setSearch] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selected, setSelected] = useState<Member | null>(null);

  useEffect(() => {
    let active = true;
    programsApi
      .list()
      .then((res) => {
        if (active) setPrograms(res.data);
      })
      .catch((err) => {
        if (active) {
          toast.error(err instanceof Error ? err.message : 'Gagal memuat daftar prodi');
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const list = useResourceList<Member>({
    path: '/members',
    pageSize: PAGE_SIZE,
    filters: { search, program: programFilter },
  });

  const hasFilter = Boolean(search || programFilter);

  const resetFilters = () => {
    setSearch('');
    setProgramFilter('');
  };

  return (
    <div className="space-y-6">
      <div className="surface-card flex flex-wrap items-center justify-between gap-4 rounded-2xl border-primary/30 p-4 sm:px-5">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-primary">
            <Users className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-foreground sm:text-base">
              Kenalan sama teman-teman Zenith 2026 yuk!
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Cari berdasarkan minat seperti &quot;Game Dev&quot; atau &quot;Cyber Security&quot; buat nemu partner lomba, belajar bareng, atau mabar.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            placeholder="Cari nama atau minat..."
            aria-label="Cari teman angkatan"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onClear={search ? () => setSearch('') : undefined}
            className="w-52 sm:w-60"
          />

          <div className="flex flex-wrap gap-1">
            <Button
              type="button"
              size="sm"
              variant={!programFilter ? 'default' : 'outline'}
              onClick={() => setProgramFilter('')}
              className="rounded-lg text-xs"
            >
              Semua
            </Button>
            {programs.map((program) => (
              <Button
                key={program.id}
                type="button"
                size="sm"
                variant={programFilter === program.id ? 'default' : 'outline'}
                onClick={() =>
                  setProgramFilter((prev) => (prev === program.id ? '' : program.id))
                }
                className="rounded-lg text-xs"
              >
                {program.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <ListState
        loading={list.loading}
        error={list.error}
        isEmpty={list.data.length === 0}
        onRetry={list.reload}
        skeleton={<CardGridSkeleton count={8} />}
        empty={
          <EmptyState
            icon={Users}
            title={hasFilter ? 'Belum ada teman yang cocok' : 'Belum ada data anggota'}
            description={
              hasFilter
                ? 'Coba kata kunci lain atau tampilkan semua program studi.'
                : 'Direktori anggota masih kosong.'
            }
            action={
              hasFilter ? (
                <Button type="button" variant="outline" onClick={resetFilters}>
                  Tampilkan Semua
                </Button>
              ) : undefined
            }
          />
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {list.data.map((member) => {
            const tags = topNiches(member.niche);
            const majorLabel =
              programs.find((p) => p.id === member.programId)?.name ?? member.major ?? '';
            return (
              <button
                key={member.npm}
                type="button"
                onClick={() => setSelected(member)}
                className="surface-card flex flex-col justify-between gap-3 rounded-2xl p-4 text-left transition hover:-translate-y-1 hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <div className="flex items-center gap-3">
                  <MemberAvatar member={member} size="lg" className="size-14 shrink-0 rounded-xl" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">
                      {member.nama_panggilan || member.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{member.name}</p>
                    <p className="truncate font-mono text-[11px] tabular-nums text-muted-foreground">
                      {member.npm}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {majorLabel ? (
                    <span className="inline-block rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      {majorLabel}
                    </span>
                  ) : null}
                  {tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="surface-elevated rounded-md px-2 py-0.5 text-[11px] text-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        <Paginator
          page={list.page}
          totalPages={list.totalPages}
          total={list.total}
          onPageChange={list.setPage}
        />
      </ListState>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selected?.name ?? 'Profil Anggota'}</DialogTitle>
          </DialogHeader>
          {selected ? (
            <ProfileShowcaseCard
              member={{
                ...selected,
                programName:
                  programs.find((p) => p.id === selected.programId)?.name ?? selected.major,
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
