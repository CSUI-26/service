import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Pencil, Sparkles, User } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/patterns/EmptyState';
import { ListState } from '@/components/patterns/ListState';
import { ListSkeleton } from '@/components/patterns/skeletons';
import { ProfileShowcaseCard } from '@/features/members/ProfileShowcaseCard';
import { membersApi } from '@/features/members/api';
import type { Member } from '@/features/members/types';
import { programsApi } from '@/features/programs/api';
import type { Program } from '@/features/programs/types';
import { useAuth } from '@/features/auth/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function MyProfilePage() {
  useDocumentTitle('Profilku');

  const { user } = useAuth();
  const [member, setMember] = useState<Member | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [fetchedKey, setFetchedKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  const currentKey = user?.npm ? `${user.npm}:${reloadNonce}` : '';
  const loading = Boolean(currentKey) && fetchedKey !== currentKey;

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

  useEffect(() => {
    if (!user?.npm) return;
    let active = true;
    const key = `${user.npm}:${reloadNonce}`;
    membersApi
      .get(user.npm)
      .then((res) => {
        if (active) {
          setMember(res.data);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Gagal memuat profil');
        }
      })
      .finally(() => {
        if (active) setFetchedKey(key);
      });
    return () => {
      active = false;
    };
  }, [user?.npm, reloadNonce]);

  const programName =
    programs.find((p) => p.id === member?.programId)?.name ?? member?.major ?? '';

  return (
    <div className="space-y-6">
      <div className="surface-card flex flex-wrap items-center justify-between gap-4 rounded-2xl border-primary/30 p-4 sm:px-5">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-primary">
            <Sparkles className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground sm:text-sm">
              Ini tampilan kartu profilmu di direktori Zenith!
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Biar makin gampang dikenal teman satu angkatan, kamu bisa lengkapi bio, minat, dan sosmedmu lewat Edit Profilku.
            </p>
          </div>
        </div>

        <Button asChild size="sm" className="shrink-0 rounded-xl">
          <Link to="/my-profile/edit">
            <Pencil aria-hidden="true" />
            <span>Edit Profilku</span>
          </Link>
        </Button>
      </div>

      <ListState
        loading={loading}
        error={error}
        isEmpty={!member}
        onRetry={() => setReloadNonce((n) => n + 1)}
        skeleton={<ListSkeleton rows={2} />}
        empty={
          <EmptyState
            icon={User}
            title="Profil belum tersedia"
            description="Data profil belum ditemukan untuk akun ini."
          />
        }
      >
        {member ? (
          <ProfileShowcaseCard
            member={{ ...member, programName }}
            isOwner
          />
        ) : null}
      </ListState>
    </div>
  );
}
