import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  GraduationCap,
  Images,
  Inbox,
  ShieldCheck,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { AdminStats } from '@zenith/shared';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/patterns/EmptyState';
import { ListState } from '@/components/patterns/ListState';
import { PageHeader } from '@/components/patterns/PageHeader';
import { CardGridSkeleton } from '@/components/patterns/skeletons';
import { adminStatsApi } from '@/features/admin/api';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

interface AdminModuleLink {
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
  formatMetric: (stats: AdminStats) => string;
}

const ADMIN_MODULES: AdminModuleLink[] = [
  {
    to: '/programs',
    title: 'Study Programs',
    description: 'Manage degree tracks, career paths, and course map links.',
    icon: GraduationCap,
    formatMetric: (stats) => `${stats.programs} programs`,
  },
  {
    to: '/courses',
    title: 'Courses',
    description: 'Manage curriculum courses, SKS weights, and semester placement.',
    icon: BookOpen,
    formatMetric: (stats) => `${stats.courses} courses`,
  },
  {
    to: '/members',
    title: 'Members',
    description: 'Manage cohort member records, roles, and optional birth dates.',
    icon: Users,
    formatMetric: (stats) => `${stats.members} members`,
  },
  {
    to: '/achievements',
    title: 'Achievements',
    description: 'Manage featured showcase awards and yearly achievement records.',
    icon: Trophy,
    formatMetric: (stats) => `${stats.achievements} awards`,
  },
  {
    to: '/gallery',
    title: 'Gallery',
    description: 'Manage cohort photos, hero visuals, and highlight images.',
    icon: Images,
    formatMetric: (stats) => `${stats.galleryItems} items`,
  },
  {
    to: '/activities',
    title: 'Activities',
    description: 'Manage cohort events, schedules, and activity recaps.',
    icon: Calendar,
    formatMetric: (stats) => `${stats.activities} activities`,
  },
  {
    to: '/admin/requests',
    title: 'Requests & Feedback',
    description: 'Triage member content submissions, feedback, and help threads.',
    icon: Inbox,
    formatMetric: (stats) =>
      `${stats.openContentRequests} open content, ${stats.openFeedbackThreads} open feedback`,
  },
];

export default function AdminHubPage() {
  useDocumentTitle('Admin Hub');

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [loadedNonce, setLoadedNonce] = useState(-1);

  const loading = loadedNonce !== reloadNonce;

  useEffect(() => {
    let active = true;
    adminStatsApi
      .get()
      .then((res) => {
        if (!active) return;
        setStats(res.data);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load admin summary');
      })
      .finally(() => {
        if (active) setLoadedNonce(reloadNonce);
      });

    return () => {
      active = false;
    };
  }, [reloadNonce]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Hub"
        description="Central workspace for Zenith curriculum, member records, showcase media, and request triage."
      />

      <ListState
        loading={loading}
        error={error}
        isEmpty={!stats}
        onRetry={() => setReloadNonce((n) => n + 1)}
        skeleton={<CardGridSkeleton count={7} />}
        empty={
          <EmptyState
            icon={ShieldCheck}
            title="Admin metrics unavailable"
            description="Summary counts could not be loaded right now."
          />
        }
      >
        {stats ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ADMIN_MODULES.map((mod) => {
              const Icon = mod.icon;
              return (
                <Link
                  key={mod.to}
                  to={mod.to}
                  className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Card className="h-full transition-colors duration-150 group-hover:border-primary/40 group-hover:bg-accent/20">
                    <CardHeader className="space-y-2 pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-muted text-foreground">
                          <Icon className="size-4" aria-hidden="true" />
                        </div>
                        <Badge variant="secondary" className="font-mono text-xs tabular-nums">
                          {mod.formatMetric(stats)}
                        </Badge>
                      </div>
                      <CardTitle className="flex items-center justify-between gap-2 text-base font-bold">
                        <span>{mod.title}</span>
                        <ArrowRight
                          className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground"
                          aria-hidden="true"
                        />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-xs leading-relaxed">
                        {mod.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : null}
      </ListState>
    </div>
  );
}
