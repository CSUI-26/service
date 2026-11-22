import { useState } from 'react';
import { Loader2, Trash2, X } from 'lucide-react';
import type {
  ContentRequestCreate,
  ContentRequestMetadata,
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

  const [contentType, setContentType] = useState<ContentRequestType>(
    editing?.contentType ?? 'achievement',
  );
  const [title, setTitle] = useState(editing?.title ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [externalUrl, setExternalUrl] = useState(editing?.metadata?.externalUrl ?? '');
  const [year, setYear] = useState(editing?.metadata?.year ? String(editing.metadata.year) : '');
  const [teamName, setTeamName] = useState(editing?.metadata?.teamName ?? '');
  const [image, setImage] = useState<ImageUploadValue>(editing?.image ?? { url: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const showExternalUrl = contentType !== 'achievement';

  const handleFormSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const metadata: ContentRequestMetadata = {};
    if (year.trim()) {
      const parsedYear = Number(year.trim());
      if (Number.isInteger(parsedYear)) {
        metadata.year = parsedYear;
      }
    }
    if (teamName.trim()) {
      metadata.teamName = teamName.trim();
    }
    if (showExternalUrl && externalUrl.trim()) {
      metadata.externalUrl = externalUrl.trim();
    }

    const candidate = {
      contentType,
      title: title.trim(),
      description: description.trim(),
      image: image.url.trim() ? image : null,
      metadata,
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

        <div className={showExternalUrl ? 'grid gap-4 sm:grid-cols-3' : 'grid gap-4 sm:grid-cols-2'}>
          <TextField
            id="content-request-team"
            label={isMember ? 'Nama Tim (Opsional)' : 'Team Name (Optional)'}
            placeholder="ZenithSec"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
          />
          <TextField
            id="content-request-year"
            label={isMember ? 'Tahun (Opsional)' : 'Year (Optional)'}
            type="number"
            min={1990}
            max={2100}
            className="font-mono tabular-nums"
            placeholder="2026"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            error={fieldErrors['metadata.year']}
          />
          {showExternalUrl ? (
            <TextField
              id="content-request-external-url"
              label={isMember ? 'Link Drive / Bukti (Opsional)' : 'Reference URL (Optional)'}
              placeholder="https://drive.google.com/..."
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              error={fieldErrors['metadata.externalUrl']}
            />
          ) : null}
        </div>

        <TextAreaField
          id="content-request-description"
          label={isMember ? 'Detail Konten' : 'Description'}
          placeholder={
            isMember
              ? 'Ceritakan detail prestasi, anggota tim, atau keterangan konten yang ingin ditampilkan...'
              : 'Describe the requested achievement, gallery photo, or activity...'
          }
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={fieldErrors.description}
          required
        />

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
