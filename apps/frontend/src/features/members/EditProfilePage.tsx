import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Check, Eye, Lock, Sparkles, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ImageUploadEditor, type ImageUploadValue } from '@/components/patterns/ImageUploadEditor';
import { useAuth } from '@/features/auth/useAuth';
import { SocialLinkField } from '@/features/members/SocialLinkField';
import { membersApi } from '@/features/members/api';
import { normalizeMemberSocials, normalizeSocialLink } from '@/features/members/socialLinks';
import { programsApi } from '@/features/programs/api';
import type { Program } from '@/features/programs/types';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function EditProfilePage() {
  useDocumentTitle('Edit Profil');

  const navigate = useNavigate();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);

  const [form, setForm] = useState({
    name: '',
    nama_panggilan: '',
    email: '',
    programId: '',
    instagram: '',
    line: '',
    github: '',
    linkedin: '',
    deskripsi: '',
    niche: '',
    quotes: '',
    foto: { url: '' } as ImageUploadValue,
  });

  useEffect(() => {
    let active = true;
    programsApi
      .list()
      .then((res) => {
        if (active) setPrograms(res.data);
      })
      .catch((err) => {
        if (active) {
          toast.error(err instanceof Error ? err.message : 'Gagal memuat program studi');
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user?.npm) return;
    let active = true;
    membersApi
      .get(user.npm)
      .then((res) => {
        if (active && res.data) {
          setForm({
            name: res.data.name ?? '',
            nama_panggilan: res.data.nama_panggilan ?? '',
            email: res.data.email ?? '',
            programId: res.data.programId ?? '',
            instagram: res.data.instagram ?? '',
            line: res.data.line ?? '',
            github: res.data.github ?? '',
            linkedin: res.data.linkedin ?? '',
            deskripsi: res.data.deskripsi ?? '',
            niche: res.data.niche ?? '',
            quotes: res.data.quotes ?? '',
            foto: res.data.foto ?? { url: '' },
          });
        }
      })
      .catch((err) => {
        if (active) {
          toast.error(err instanceof Error ? err.message : 'Gagal memuat data profil');
        }
      });
    return () => {
      active = false;
    };
  }, [user?.npm]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const emitProfileUpdated = (fotoUrl: string) => {
    if (!user?.npm) return;
    window.dispatchEvent(
      new CustomEvent('zenith:profile-updated', {
        detail: { npm: user.npm, fotoUrl },
      }),
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.npm) return;
    setSaving(true);
    try {
      const normalized = normalizeMemberSocials(form);
      const res = await membersApi.updateMe(normalized);
      emitProfileUpdated(res.data.foto?.url ?? normalized.foto?.url ?? '');
      toast.success('Profil berhasil diperbarui');
      navigate('/my-profile');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan profil');
    } finally {
      setSaving(false);
    }
  };

  const handleCommitPhoto = async (next: ImageUploadValue) => {
    if (!user?.npm) return;
    const foto: ImageUploadValue = {
      url: normalizeSocialLink('photo', next.url),
      config: next.config,
    };
    const res = await membersApi.updateMe({ foto });
    const savedFoto = res.data.foto ?? foto;
    setForm((prev) => ({ ...prev, foto: savedFoto }));
    emitProfileUpdated(savedFoto.url);
    toast.success('Foto profil tersimpan');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Poles Kartu Profilmu!
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            Bikin teman-teman satu angkatan gampang kenal dan ngajak kamu kolaborasi.
          </p>
        </div>

        <Button asChild variant="outline" size="sm" className="rounded-xl">
          <Link to="/my-profile">
            <Eye aria-hidden="true" />
            <span>Lihat Hasil Kartu</span>
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="surface-card space-y-1.5 rounded-2xl border-primary/25 p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-primary">
            <Lock className="size-4 shrink-0" aria-hidden="true" />
            <span>1. Fitur Kunci Foto</span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Mau atur zoom atau geser posisi wajahmu? Tekan tombol <strong>Buka Kunci Foto</strong> terlebih dahulu, lalu kunci kembali setelah selesai.
          </p>
        </div>

        <div className="surface-card space-y-1.5 rounded-2xl border-primary/25 p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
            <Tag className="size-4 shrink-0" aria-hidden="true" />
            <span>2. Tips Niche &amp; Minat</span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Pisahkan minatmu pakai tanda koma (contoh: <span className="font-mono text-foreground">Game Dev, UI/UX, CTF</span>). Nanti otomatis tampil jadi badge keren!
          </p>
        </div>

        <div className="surface-card space-y-1.5 rounded-2xl border-primary/25 p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
            <Sparkles className="size-4 shrink-0" aria-hidden="true" />
            <span>3. Quotes &amp; Sosial Media</span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Tulis satu kalimat andalanmu di bagian Quotes, dan cukup ketik username sosmedmu saja tanpa perlu salin link panjang.
          </p>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <aside className="surface-card space-y-4 rounded-2xl p-5 lg:col-span-5">
          <div>
            <h2 className="text-sm font-bold text-foreground">Foto Profil</h2>
            <p className="text-xs text-muted-foreground">
              Pilih foto terbaikmu untuk direktori Zenith.
            </p>
          </div>
          <ImageUploadEditor
            endpoint="/upload/avatar"
            value={form.foto}
            onChange={(foto) => setForm((prev) => ({ ...prev, foto }))}
            onCommit={handleCommitPhoto}
          />
        </aside>

        <form
          onSubmit={handleSubmit}
          className="surface-card space-y-4 rounded-2xl p-5 sm:p-6 lg:col-span-7"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nama_panggilan">Nama Panggilan</Label>
              <Input
                id="nama_panggilan"
                placeholder="Biar akrab dipanggil apa nih?"
                value={form.nama_panggilan}
                onChange={(e) => handleChange('nama_panggilan', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="programId">Program Studi</Label>
              <Select
                value={form.programId}
                onValueChange={(value) => handleChange('programId', value ?? '')}
                required
              >
                <SelectTrigger id="programId" className="w-full">
                  <SelectValue placeholder="Pilih program studi" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Aktif</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="font-mono"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="niche">Minat &amp; Niche</Label>
              <span className="text-[11px] text-muted-foreground">Pisahkan dengan koma (,)</span>
            </div>
            <Input
              id="niche"
              placeholder="Contoh: Game Dev, Cyber Security, Data Science"
              value={form.niche}
              onChange={(e) => handleChange('niche', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="deskripsi">Cerita Singkat Tentangmu (Bio)</Label>
              <span className="text-[11px] text-muted-foreground">
                Lagi sibuk ngulik apa semester ini?
              </span>
            </div>
            <Textarea
              id="deskripsi"
              value={form.deskripsi}
              onChange={(e) => handleChange('deskripsi', e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="quotes">Quotes Andalan</Label>
              <span className="text-[11px] text-muted-foreground">
                Motto hidup atau kalimat penyemangat
              </span>
            </div>
            <Input
              id="quotes"
              value={form.quotes}
              onChange={(e) => handleChange('quotes', e.target.value)}
            />
          </div>

          <div className="grid gap-4 pt-1 sm:grid-cols-2">
            <SocialLinkField
              id="instagram"
              label="Instagram"
              platform="instagram"
              placeholder="@username"
              value={form.instagram}
              onChange={(value) => handleChange('instagram', value)}
            />
            <SocialLinkField
              id="github"
              label="GitHub"
              platform="github"
              placeholder="username"
              value={form.github}
              onChange={(value) => handleChange('github', value)}
            />
            <SocialLinkField
              id="linkedin"
              label="LinkedIn"
              platform="linkedin"
              placeholder="username"
              value={form.linkedin}
              onChange={(value) => handleChange('linkedin', value)}
            />
            <SocialLinkField
              id="line"
              label="LINE"
              platform="line"
              placeholder="ID LINE"
              value={form.line}
              onChange={(value) => handleChange('line', value)}
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-border pt-4">
            <Button type="button" variant="outline" asChild className="rounded-xl">
              <Link to="/my-profile">Batal</Link>
            </Button>
            <Button type="submit" disabled={saving} className="rounded-xl">
              <Check aria-hidden="true" />
              <span>{saving ? 'Menyimpan...' : 'Simpan & Lihat Kartu'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
