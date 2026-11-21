import { useEffect, useState } from 'react';
import { Loader2, Trash2, X } from 'lucide-react';
import type {
  RequestCategory,
  RequestContentType,
  RequestMetadata,
  RequestThreadCreate,
  RequestThreadSummary,
} from '@zenith/shared';
import { RequestThreadCreateSchema } from '@zenith/shared';
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
  ADMIN_CATEGORY_LABELS,
  ADMIN_CONTENT_TYPE_LABELS,
  MEMBER_CATEGORY_LABELS,
  MEMBER_CONTENT_TYPE_LABELS,
} from '@/features/requests/api';

interface RequestFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: RequestThreadSummary | null;
  mode: 'member' | 'admin';
  saving: boolean;
  onDelete?: (thread: RequestThreadSummary) => void;
  onSubmit: (payload: RequestThreadCreate) => void;
}

export function RequestFormDialog({
  open,
  onOpenChange,
  editing,
  mode,
  saving,
  onDelete,
  onSubmit,
}: RequestFormDialogProps) {
  const isMember = mode === 'member';
  const categoryLabels = isMember ? MEMBER_CATEGORY_LABELS : ADMIN_CATEGORY_LABELS;
  const contentTypeLabels = isMember ? MEMBER_CONTENT_TYPE_LABELS : ADMIN_CONTENT_TYPE_LABELS;

  const [category, setCategory] = useState<RequestCategory>('content');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState<RequestContentType>('achievement');
  const [externalUrl, setExternalUrl] = useState('');
  const [year, setYear] = useState('');
  const [teamName, setTeamName] = useState('');
  const [image, setImage] = useState<ImageUploadValue>({ url: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setFieldErrors({});
    if (editing) {
      setCategory(editing.category);
      setTitle(editing.title);
      setDescription(editing.description);
      setContentType(editing.metadata?.contentType ?? 'achievement');
      setExternalUrl(editing.metadata?.externalUrl ?? '');
      setYear(editing.metadata?.year ? String(editing.metadata.year) : '');
      setTeamName(editing.metadata?.teamName ?? '');
      setImage(editing.image ?? { url: '' });
    } else {
      setCategory('content');
      setTitle('');
      setDescription('');
      setContentType('achievement');
      setExternalUrl('');
      setYear('');
      setTeamName('');
      setImage({ url: '' });
    }
  }, [open, editing]);

  const handleFormSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const metadata: RequestMetadata = {};
    if (category === 'content') {
      metadata.contentType = contentType;
      if (year.trim()) {
        const parsedYear = Number(year.trim());
        if (Number.isInteger(parsedYear)) {
          metadata.year = parsedYear;
        }
      }
      if (teamName.trim()) metadata.teamName = teamName.trim();
    }
    if (externalUrl.trim()) {
      metadata.externalUrl = externalUrl.trim();
    }

    const candidate = {
      category,
      title: title.trim(),
      description: description.trim(),
      image: image.url.trim() ? image : null,
      metadata,
    };

    const parsed = RequestThreadCreateSchema.safeParse(candidate);
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
      ? 'Ubah Request'
      : 'Edit request'
    : isMember
      ? 'Buat Request Baru'
      : 'New request';

  const dialogDescription = isMember
    ? 'Thread ini bersifat privat dan hanya bisa dibaca oleh kamu dan admin Zenith.'
    : 'Create or update a private member request thread.';

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
                  ? 'Kirim Request'
                  : 'Save'}
            </Button>
          </div>
        </div>
      }
    >
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(fieldErrors.category) || undefined}>
            <FieldLabel htmlFor="request-category">
              {isMember ? 'Kategori' : 'Category'}
            </FieldLabel>
            <Select
              value={category}
              onValueChange={(value) => setCategory(value as RequestCategory)}
            >
              <SelectTrigger
                id="request-category"
                className="w-full"
                aria-label={isMember ? 'Kategori' : 'Category'}
              >
                <SelectValue>{categoryLabels[category]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="content">{categoryLabels.content}</SelectItem>
                <SelectItem value="feedback">{categoryLabels.feedback}</SelectItem>
                <SelectItem value="help">{categoryLabels.help}</SelectItem>
                <SelectItem value="other">{categoryLabels.other}</SelectItem>
              </SelectContent>
            </Select>
            <FieldError>{fieldErrors.category}</FieldError>
          </Field>

          {category === 'content' ? (
            <Field>
              <FieldLabel htmlFor="request-content-type">
                {isMember ? 'Jenis Konten' : 'Content Type'}
              </FieldLabel>
              <Select
                value={contentType}
                onValueChange={(value) => setContentType(value as RequestContentType)}
              >
                <SelectTrigger
                  id="request-content-type"
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
            </Field>
          ) : (
            <TextField
              id="request-external-url"
              label={isMember ? 'Link Referensi (Opsional)' : 'Reference URL (Optional)'}
              placeholder="https://drive.google.com/..."
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              error={fieldErrors['metadata.externalUrl']}
            />
          )}
        </div>

        <TextField
          id="request-title"
          label={isMember ? 'Judul' : 'Subject'}
          placeholder={
            category === 'content'
              ? isMember
                ? 'Contoh: Juara 2 Gemastik Keamanan Siber 2026'
                : 'e.g., Gemastik Cyber Security Winner 2026'
              : isMember
                ? 'Tulis ringkasan topikmu'
                : 'Short thread subject'
          }
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={fieldErrors.title}
          required
        />

        {category === 'content' ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField
              id="request-team"
              label={isMember ? 'Nama Tim (Opsional)' : 'Team Name (Optional)'}
              placeholder="ZenithSec"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
            <TextField
              id="request-year"
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
            <TextField
              id="request-content-url"
              label={isMember ? 'Link Drive / Bukti (Opsional)' : 'Reference URL (Optional)'}
              placeholder="https://..."
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              error={fieldErrors['metadata.externalUrl']}
            />
          </div>
        ) : null}

        <TextAreaField
          id="request-description"
          label={isMember ? 'Detail Pesan' : 'Description'}
          placeholder={
            isMember
              ? 'Ceritakan detail request, saran, atau kendala yang kamu alami...'
              : 'Describe the request, feedback, or issue...'
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
