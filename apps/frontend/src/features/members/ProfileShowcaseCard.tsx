import { useEffect, useRef, useState } from 'react';
import {
  AtSign,
  Briefcase,
  Code2,
  GraduationCap,
  Lock,
  Mail,
  MessageCircle,
  Quote,
  Sparkles,
  Tag,
  User as UserIcon,
  type LucideIcon,
} from 'lucide-react';
import type { Member } from '@/features/members/types';
import { getSocialLinkHref, openSocialLink, type SocialPlatform } from '@/features/members/socialLinks';

export interface ProfileShowcaseMember extends Partial<Member> {
  npm?: string;
  programName?: string;
}

interface ProfileShowcaseCardProps {
  member: ProfileShowcaseMember;
  isOwner?: boolean;
}

function splitNiches(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatSocialHandle(platform: SocialPlatform, raw?: string): string {
  const trimmed = raw?.trim() ?? '';
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) return trimmed;

  try {
    const parsed = new URL(trimmed);
    const segment = parsed.pathname.split('/').filter(Boolean).pop() ?? trimmed;
    if (platform === 'instagram') return `@${segment.replace(/^@/, '')}`;
    if (platform === 'line') return segment.replace(/^~/, '');
    return segment;
  } catch {
    return trimmed;
  }
}

export function ProfileShowcaseCard({ member, isOwner = false }: ProfileShowcaseCardProps) {
  const [showLockHint, setShowLockHint] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const triggerLockHint = () => {
    setShowLockHint(true);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setShowLockHint(false);
      timerRef.current = null;
    }, 1600);
  };

  const cfg = member.foto?.config;
  const x = cfg?.x ?? 50;
  const y = cfg?.y ?? 50;
  const zoom = cfg?.zoom ?? 1;
  const rotate = cfg?.rotate ?? 0;
  const panXPercent = (50 - x) * Math.max(0, zoom - 1);
  const panYPercent = (50 - y) * Math.max(0, zoom - 1);

  const imgStyle = cfg
    ? {
        objectPosition: `${x}% ${y}%`,
        transform: `translate(${panXPercent}%, ${panYPercent}%) scale(${zoom}) rotate(${rotate}deg)`,
      }
    : undefined;

  const niches = splitNiches(member.niche);
  const programLabel = member.programName || member.major || 'CSUI 2026';

  const candidateSocials: Array<{
    platform: Exclude<SocialPlatform, 'photo'>;
    label: string;
    value: string;
    icon: LucideIcon;
  }> = [
    { platform: 'instagram', label: 'Instagram', value: member.instagram ?? '', icon: AtSign },
    { platform: 'github', label: 'GitHub', value: member.github ?? '', icon: Code2 },
    { platform: 'linkedin', label: 'LinkedIn', value: member.linkedin ?? '', icon: Briefcase },
    { platform: 'line', label: 'LINE', value: member.line ?? '', icon: MessageCircle },
  ];
  const socialItems = candidateSocials.filter((item) =>
    Boolean(getSocialLinkHref(item.platform, item.value)),
  );

  return (
    <div className="surface-card rounded-3xl p-5 shadow-xl sm:p-8">
      <div className="grid items-start gap-6 md:grid-cols-[300px_minmax(0,1fr)] lg:grid-cols-[340px_minmax(0,1fr)]">
        <div
          onPointerDown={triggerLockHint}
          style={{ touchAction: 'pan-y' }}
          className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-muted select-none shadow-lg"
        >
          {member.foto?.url ? (
            <img
              src={member.foto.url}
              alt={member.name || 'Foto profil'}
              draggable={false}
              style={imgStyle}
              className="size-full object-cover transition-transform duration-150 motion-reduce:transition-none"
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
              <UserIcon className="size-10 opacity-60" aria-hidden="true" />
              <span className="text-xs">Belum ada foto profil</span>
            </div>
          )}

          <div className="absolute top-3 left-3 flex items-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/80 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md">
              <Lock className="size-3 text-emerald-400" aria-hidden="true" />
              <span>Foto Terkunci</span>
            </span>
          </div>

          {showLockHint ? (
            <output className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/70 p-4 text-center backdrop-blur-xs">
              <div className="flex flex-col items-center gap-1.5 rounded-xl border border-primary/50 bg-background/95 px-3.5 py-2.5 text-xs font-medium text-foreground shadow-lg">
                <Lock className="size-4 text-emerald-400" aria-hidden="true" />
                <span>
                  {isOwner
                    ? 'Foto sedang dikunci. Buka menu Edit Profil untuk mengatur posisi foto.'
                    : 'Foto dikunci agar nyaman saat digeser.'}
                </span>
              </div>
            </output>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1 text-xs font-bold text-primary-foreground shadow-xs">
                <GraduationCap className="size-3.5" aria-hidden="true" />
                <span>{programLabel}</span>
              </span>
              {member.npm ? (
                <span className="surface-elevated rounded-full px-3 py-1 font-mono text-xs tabular-nums text-muted-foreground">
                  {member.npm}
                </span>
              ) : null}
            </div>

            <div className="min-w-0">
              {isOwner ? (
                <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-foreground break-words sm:text-4xl">
                  {member.name || 'Nama Lengkap'}
                </h1>
              ) : (
                <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-foreground break-words sm:text-4xl">
                  {member.name || 'Nama Lengkap'}
                </h2>
              )}

              <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground sm:text-sm">
                <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                  <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
                  <span>Panggilan: {member.nama_panggilan || 'Belum diisi'}</span>
                </span>
                {member.email ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 font-mono text-xs">
                      <Mail className="size-3.5 text-muted-foreground" aria-hidden="true" />
                      <span>{member.email}</span>
                    </span>
                  </>
                ) : null}
              </p>
            </div>

            <p className="text-sm leading-relaxed text-foreground/90 break-words sm:text-base">
              {member.deskripsi?.trim() ||
                'Belum ada deskripsi singkat. Ceritakan minat atau proyek yang sedang kamu kerjakan!'}
            </p>

            <div className="surface-elevated rounded-2xl border-l-4 border-l-primary p-3.5">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Quote className="size-3 text-primary" aria-hidden="true" />
                <span>Quotes Andalan</span>
              </div>
              <p className="mt-1 text-xs italic text-foreground/90 sm:text-sm">
                {member.quotes?.trim() ? `"${member.quotes.trim()}"` : 'Belum ada quotes yang disematkan.'}
              </p>
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Tag className="size-3 text-primary" aria-hidden="true" />
                <span>Minat &amp; Niche</span>
              </span>
              {niches.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {niches.map((tag) => (
                    <span
                      key={tag}
                      className="surface-elevated rounded-full px-3.5 py-1 text-xs font-medium text-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Belum ada minat yang ditambahkan.</p>
              )}
            </div>
          </div>

          {socialItems.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
              {socialItems.map((item) => {
                const Icon = item.icon;
                const handle = formatSocialHandle(item.platform, item.value);
                return (
                  <button
                    key={item.platform}
                    type="button"
                    onClick={() => openSocialLink(item.platform, item.value)}
                    className="surface-elevated inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/60"
                  >
                    <Icon className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                    <span className="font-mono">{handle || item.label}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
