import { useState } from 'react';
import { Loader2, Trash2, X } from 'lucide-react';
import type {
  FeedbackCategory,
  FeedbackThreadCreate,
  FeedbackThreadSummary,
} from '@zenith/shared';
import { FeedbackThreadCreateSchema } from '@zenith/shared';
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
  ADMIN_FEEDBACK_CATEGORY_LABELS,
  MEMBER_FEEDBACK_CATEGORY_LABELS,
} from '@/features/feedback/api';

interface FeedbackFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: FeedbackThreadSummary | null;
  mode: 'member' | 'admin';
  saving: boolean;
  onDelete?: (thread: FeedbackThreadSummary) => void;
  onSubmit: (payload: FeedbackThreadCreate) => void;
}

function FeedbackFormDialogInner({
  open,
  onOpenChange,
  editing,
  mode,
  saving,
  onDelete,
  onSubmit,
}: FeedbackFormDialogProps) {
  const isMember = mode === 'member';
  const categoryLabels = isMember
    ? MEMBER_FEEDBACK_CATEGORY_LABELS
    : ADMIN_FEEDBACK_CATEGORY_LABELS;

  const [category, setCategory] = useState<FeedbackCategory>(editing?.category ?? 'feedback');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [externalUrl, setExternalUrl] = useState(editing?.externalUrl ?? '');
  const [image, setImage] = useState<ImageUploadValue>(editing?.image ?? { url: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleFormSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const candidate = {
      category,
      title: title.trim(),
      description: description.trim(),
      image: image.url.trim() ? image : null,
      externalUrl: externalUrl.trim() ? externalUrl.trim() : null,
    };

    const parsed = FeedbackThreadCreateSchema.safeParse(candidate);
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
      ? 'Ubah Feedback & Bantuan'
      : 'Edit feedback thread'
    : isMember
      ? 'Kirim Feedback atau Bantuan'
      : 'New feedback thread';

  const dialogDescription = isMember
    ? 'Thread ini bersifat privat dan hanya bisa dibaca oleh kamu dan admin Zenith.'
    : 'Create or update a private member feedback or help thread.';

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
                  ? 'Kirim Pesan'
                  : 'Save'}
            </Button>
          </div>
        </div>
      }
    >
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(fieldErrors.category) || undefined}>
            <FieldLabel htmlFor="feedback-category">
              {isMember ? 'Kategori' : 'Category'}
            </FieldLabel>
            <Select
              value={category}
              onValueChange={(value) => setCategory(value as FeedbackCategory)}
            >
              <SelectTrigger
                id="feedback-category"
                className="w-full"
                aria-label={isMember ? 'Kategori' : 'Category'}
              >
                <SelectValue>{categoryLabels[category]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="feedback">{categoryLabels.feedback}</SelectItem>
                <SelectItem value="help">{categoryLabels.help}</SelectItem>
                <SelectItem value="other">{categoryLabels.other}</SelectItem>
              </SelectContent>
            </Select>
            <FieldError>{fieldErrors.category}</FieldError>
          </Field>

          <TextField
            id="feedback-external-url"
            label={isMember ? 'Link Referensi (Opsional)' : 'Reference URL (Optional)'}
            placeholder="https://..."
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            error={fieldErrors.externalUrl}
          />
        </div>

        <TextField
          id="feedback-title"
          label={isMember ? 'Judul' : 'Subject'}
          placeholder={isMember ? 'Tulis ringkasan topikmu' : 'Short thread subject'}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={fieldErrors.title}
          required
        />

        <TextAreaField
          id="feedback-description"
          label={isMember ? 'Detail Pesan' : 'Description'}
          placeholder={
            isMember
              ? 'Ceritakan masukan, ide fitur, atau kendala yang kamu alami...'
              : 'Describe the feedback or help request...'
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

export function FeedbackFormDialog(props: FeedbackFormDialogProps) {
  const formKey = `${props.open ? 'open' : 'closed'}-${props.editing?.id ?? 'new'}`;
  return <FeedbackFormDialogInner key={formKey} {...props} />;
}
