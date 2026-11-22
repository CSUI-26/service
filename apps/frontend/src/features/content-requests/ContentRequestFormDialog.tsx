import { useState } from 'react';
import { Loader2, Trash2, X } from 'lucide-react';
import type {
  ContentRequestCreate,
  ContentRequestSummary,
  ContentRequestType,
} from '@zenith/shared';
import { ContentRequestCreateSchema } from '@zenith/shared';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormDialog } from '@/components/patterns/FormDialog';
import { ImageUploadEditor, type ImageUploadValue } from '@/components/patterns/ImageUploadEditor';
import { TextAreaField, TextField } from '@/components/patterns/TextField';
import {
  ADMIN_CONTENT_TYPE_LABELS,
  MEMBER_CONTENT_TYPE_LABELS,
} from '@/features/content-requests/api';

const MEMBER_TYPE_INSTRUCTIONS: Record<
  ContentRequestType,
  { guide: string; placeholder: string }
> = {
  achievement: {
    guide:
      'Tuliskan nama lomba, peringkat, nama tim dan anggota, serta tahun. Lampirkan satu foto utama atau cantumkan link Google Drive di Detail Konten jika ada foto tambahan dan sertifikat.',
    placeholder:
      'Contoh: Juara 2 Gemastik Keamanan Siber 2026. Tim ZenithSec (Budi, Ani, Citra). Link Drive foto/sertifikat (opsional): https://drive.google.com/...',
  },
  gallery: {
    guide:
      'Jelaskan nama momen, tanggal, dan keterangan singkat foto. Untuk mengirim lebih dari satu foto atau resolusi asli, cantumkan link folder Google Drive di Detail Konten.',
    placeholder:
      'Contoh: Dokumentasi Makrab Zenith 2026 (12 Okt 2026). Link folder Google Drive: https://drive.google.com/...',
  },
  activity: {
    guide:
      'Tuliskan nama kegiatan, tanggal pelaksanaan, dan ringkasan acara. Sertakan link Google Drive dokumentasi di Detail Konten bila tersedia.',
    placeholder:
      'Contoh: Open House CSUI 2026 pada 20 Nov 2026. Link dokumentasi (opsional): https://drive.google.com/...',
  },
  other: {
    guide:
      'Jelaskan konten atau pembaruan yang diajukan secara lengkap, dan cantumkan link Google Drive atau referensi di Detail Konten bila diperlukan.',
    placeholder: 'Tuliskan detail konten dan link referensi atau Google Drive (jika ada)...',
  },
};

const ADMIN_TYPE_INSTRUCTIONS: Record<
  ContentRequestType,
  { guide: string; placeholder: string }
> = {
  achievement: {
    guide:
      'Include competition name, award or rank, team and member names, year, and an optional Google Drive link for extra photos or certificates.',
    placeholder: 'e.g., 2nd Place Gemastik Cyber Security 2026, Team ZenithSec. Drive link: ...',
  },
  gallery: {
    guide:
      'Describe the event or moment, date, and optionally include a Google Drive folder link for full-resolution or multi-photo uploads.',
    placeholder: 'e.g., Cohort gathering photos (Oct 2026). Drive folder link: ...',
  },
  activity: {
    guide:
      'Include the activity title, date, short recap, and an optional Google Drive link for supporting media.',
    placeholder: 'e.g., CSUI Open House 2026 recap. Drive link: ...',
  },
  other: {
    guide:
      'Provide full context for the requested content update and include any Google Drive or reference links.',
    placeholder: 'Describe the requested content and any reference links...',
  },
};

interface ContentRequestFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: ContentRequestSummary | null;
  mode: 'member' | 'admin';
  saving: boolean;
  onDelete?: (item: ContentRequestSummary) => void;
  onSubmit: (payload: ContentRequestCreate) => void;
}

function ContentRequestFormDialogInner({
  open,
  onOpenChange,
  editing,
  mode,
  saving,
  onDelete,
  onSubmit,
}: ContentRequestFormDialogProps) {
  const isMember = mode === 'member';
  const contentTypeLabels = isMember ? MEMBER_CONTENT_TYPE_LABELS : ADMIN_CONTENT_TYPE_LABELS;
  const typeInstruction = (isMember ? MEMBER_TYPE_INSTRUCTIONS : ADMIN_TYPE_INSTRUCTIONS)[
    editing?.contentType ?? 'achievement'
  ];

  const [contentType, setContentType] = useState<ContentRequestType>(
    editing?.contentType ?? 'achievement',
  );
  const [title, setTitle] = useState(editing?.title ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [image, setImage] = useState<ImageUploadValue>(editing?.image ?? { url: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const activeInstruction =
    (isMember ? MEMBER_TYPE_INSTRUCTIONS : ADMIN_TYPE_INSTRUCTIONS)[contentType] ??
    typeInstruction;

  const handleFormSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const candidate = {
      contentType,
      title: title.trim(),
      description: description.trim(),
      image: image.url.trim() ? image : null,
    };

    const parsed = ContentRequestCreateSchema.safeParse(candidate);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.');
        if (!nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    onSubmit(parsed.data);
  };

  const dialogTitle = editing
    ? isMember
      ? 'Ubah Permintaan Konten'
      : 'Edit content request'
    : isMember
      ? 'Ajukan Konten Baru'
      : 'New content request';

  const dialogDescription = isMember
    ? 'Thread ini bersifat privat dan hanya bisa dibaca oleh kamu dan admin Zenith.'
    : 'Create or update a private member content submission thread.';

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={dialogTitle}
      description={dialogDescription}
      onSubmit={handleFormSubmit}
      className="sm:max-w-2xl"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <div>
            {editing && onDelete ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => onDelete(editing)}
                disabled={saving}
              >
                <Trash2 aria-hidden="true" />
                {isMember ? 'Hapus' : 'Delete'}
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              {isMember ? 'Batal' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              {saving
                ? isMember
                  ? 'Menyimpan...'
                  : 'Saving...'
                : isMember
                  ? 'Kirim Permintaan'
                  : 'Save'}
            </Button>
          </div>
        </div>
      }
    >
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(fieldErrors.contentType) || undefined}>
            <FieldLabel htmlFor="content-request-type">
              {isMember ? 'Jenis Konten' : 'Content Type'}
            </FieldLabel>
            <Select
              value={contentType}
              onValueChange={(value) => setContentType(value as ContentRequestType)}
            >
              <SelectTrigger
                id="content-request-type"
                className="w-full"
                aria-label={isMember ? 'Jenis Konten' : 'Content Type'}
              >
                <SelectValue>{contentTypeLabels[contentType]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="achievement">{contentTypeLabels.achievement}</SelectItem>
                <SelectItem value="gallery">{contentTypeLabels.gallery}</SelectItem>
                <SelectItem value="activity">{contentTypeLabels.activity}</SelectItem>
                <SelectItem value="other">{contentTypeLabels.other}</SelectItem>
              </SelectContent>
            </Select>
            <FieldError>{fieldErrors.contentType}</FieldError>
          </Field>

          <TextField
            id="content-request-title"
            label={isMember ? 'Judul Konten' : 'Title'}
            placeholder={
              isMember
                ? 'Contoh: Juara 2 Gemastik Keamanan Siber 2026'
                : 'e.g., Gemastik Cyber Security Winner 2026'
            }
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={fieldErrors.title}
            required
          />
        </div>

        <div className="space-y-2">
          <div className="rounded-lg border border-primary/25 bg-primary/5 px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">
              {isMember
                ? `Petunjuk ${contentTypeLabels[contentType]}: `
                : `${contentTypeLabels[contentType]} instructions: `}
            </span>
            {activeInstruction.guide}
          </div>

          <TextAreaField
            id="content-request-description"
            label={isMember ? 'Detail Konten' : 'Description'}
            placeholder={activeInstruction.placeholder}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            error={fieldErrors.description}
            required
          />
        </div>

        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-foreground">
              {isMember ? 'Lampiran Foto (Opsional)' : 'Image Attachment (Optional)'}
            </span>
            {image.url ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setImage({ url: '' })}
                aria-label={isMember ? 'Hapus lampiran foto' : 'Remove image attachment'}
              >
                <X className="size-3.5" aria-hidden="true" />
                {isMember ? 'Hapus foto' : 'Remove'}
              </Button>
            ) : null}
          </div>
          <ImageUploadEditor
            endpoint="/upload/request"
            defaultAspect="16:9"
            value={image}
            onChange={(next) => setImage(next)}
          />
        </div>
      </FieldGroup>
    </FormDialog>
  );
}

export function ContentRequestFormDialog(props: ContentRequestFormDialogProps) {
  const formKey = `${props.open ? 'open' : 'closed'}-${props.editing?.id ?? 'new'}`;
  return <ContentRequestFormDialogInner key={formKey} {...props} />;
}
