import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Star, Trash2 } from 'lucide-react';
import type { Achievement } from '@zenith/shared';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { FormDialog } from '@/components/patterns/FormDialog';
import {
  ImageUploadEditor,
  type ImageUploadEditorHandle,
} from '@/components/patterns/ImageUploadEditor';
import { TextAreaField, TextField } from '@/components/patterns/TextField';
import {
  achievementFormSchema,
  type AchievementFormValues,
} from '@/features/achievements/schema';

function createEmptyValues(): AchievementFormValues {
  return {
    id: '',
    title: '',
    year: new Date().getFullYear(),
    isFeatured: false,
    award: '',
    teamName: '',
    membersText: '',
    description: '',
    showOverlay: true,
    imageUrl: '',
    imageConfig: { x: 50, y: 50, zoom: 1, rotate: 0, aspect: '16:9' },
  };
}

function toFormValues(achievement: Achievement | null): AchievementFormValues {
  if (!achievement) return createEmptyValues();
  return {
    id: achievement.id,
    title: achievement.title,
    year: achievement.year,
    isFeatured: achievement.isFeatured,
    award: achievement.award ?? '',
    teamName: achievement.teamName ?? '',
    membersText: (achievement.members ?? []).join(', '),
    description: achievement.description ?? '',
    showOverlay: achievement.showOverlay ?? true,
    imageUrl: achievement.image?.url ?? '',
    imageConfig: achievement.image?.config
      ? { ...achievement.image.config, aspect: '16:9' }
      : { x: 50, y: 50, zoom: 1, rotate: 0, aspect: '16:9' },
  };
}

interface AchievementFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Achievement | null;
  saving: boolean;
  onDelete?: (achievement: Achievement) => void;
  onSubmit: (values: AchievementFormValues) => void;
}

export function AchievementFormDialog({
  open,
  onOpenChange,
  editing,
  saving,
  onDelete,
  onSubmit,
}: AchievementFormDialogProps) {
  const imageEditorRef = useRef<ImageUploadEditorHandle | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const form = useForm<AchievementFormValues>({
    resolver: zodResolver(achievementFormSchema),
    defaultValues: toFormValues(editing),
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = form;

  const isFeatured = useWatch({ control, name: 'isFeatured' });
  const slugId = useWatch({ control, name: 'id' });
  const imageUrl = useWatch({ control, name: 'imageUrl' });
  const imageConfig = useWatch({ control, name: 'imageConfig' });

  useEffect(() => {
    if (open) reset(toFormValues(editing));
  }, [open, editing, reset]);

  const busy = saving || uploadingImage;

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (imageEditorRef.current?.hasPendingFile()) {
      setUploadingImage(true);
      try {
        const uploaded = await imageEditorRef.current.commitUpload();
        if (uploaded) {
          setValue('imageUrl', uploaded.url, { shouldValidate: true });
          setValue('imageConfig', uploaded.config);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to upload image');
        setUploadingImage(false);
        return;
      } finally {
        setUploadingImage(false);
      }
    }

    await handleSubmit(onSubmit)(event);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? 'Edit achievement' : 'Add achievement'}
      description="All achievements use 16:9 images and save automatically when you click Save."
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
                disabled={busy}
              >
                <Trash2 aria-hidden="true" />
                Delete
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              {uploadingImage ? 'Uploading...' : saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      }
    >
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="achievement-id"
            label="ID"
            placeholder="icpc-2025"
            disabled={Boolean(editing)}
            hint={editing ? 'Primary ID cannot be changed.' : 'Unique identifier slug.'}
            error={errors.id?.message}
            {...register('id')}
          />
          <TextField
            id="achievement-year"
            label="Year"
            type="number"
            min={1990}
            max={2100}
            className="font-mono tabular-nums"
            error={errors.year?.message}
            {...register('year', { valueAsNumber: true })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="achievement-title"
            label="Title"
            placeholder="ICPC Asia Jakarta Regional"
            error={errors.title?.message}
            {...register('title')}
          />
          <TextField
            id="achievement-award"
            label={isFeatured ? 'Award' : 'Award (optional)'}
            placeholder="JUARA 1"
            error={errors.award?.message}
            {...register('award')}
          />
        </div>

        <div
          className={
            isFeatured
              ? 'space-y-3 rounded-lg border border-primary/40 bg-primary/5 p-3.5'
              : 'space-y-3 rounded-lg border border-border bg-muted/30 p-3.5'
          }
        >
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              className="size-4 rounded border-border accent-primary"
              {...register('isFeatured')}
            />
            <Star
              className={isFeatured ? 'size-4 fill-primary text-primary' : 'size-4 text-muted-foreground'}
              aria-hidden="true"
            />
            <span>Featured Showcase item</span>
          </label>

          {isFeatured ? (
            <label className="flex cursor-pointer items-center gap-2 pl-6 text-xs text-muted-foreground">
              <input
                type="checkbox"
                className="size-3.5 rounded border-border accent-primary"
                {...register('showOverlay')}
              />
              <span>Show typography overlay on showcase banner</span>
            </label>
          ) : null}
        </div>

        <div className="space-y-2">
          <ImageUploadEditor
            editorRef={imageEditorRef}
            deferUpload
            defaultAspect="16:9"
            endpoint="/upload/achievement"
            uploadParams={slugId?.trim() ? { id: slugId.trim() } : undefined}
            label={isFeatured ? 'Achievement image (16:9)' : 'Achievement image (16:9, optional)'}
            value={{ url: imageUrl ?? '', config: imageConfig }}
            onChange={({ url, config }) => {
              setValue('imageUrl', url, { shouldValidate: true });
              setValue('imageConfig', config ? { ...config, aspect: '16:9' } : undefined);
            }}
          />
          {errors.imageUrl?.message ? (
            <p role="alert" className="text-xs text-destructive">
              {errors.imageUrl.message}
            </p>
          ) : null}
        </div>

        <TextField
          id="achievement-team"
          label={isFeatured ? 'Team name' : 'Team name (optional)'}
          placeholder="Team Zenith"
          error={errors.teamName?.message}
          {...register('teamName')}
        />

        <TextAreaField
          id="achievement-members"
          label={isFeatured ? 'Team members' : 'Team members (optional)'}
          placeholder="Alice IK'24, Bob SI'24"
          hint="Separate member names with commas or new lines."
          rows={3}
          error={errors.membersText?.message}
          {...register('membersText')}
        />

        <TextAreaField
          id="achievement-description"
          label={isFeatured ? 'Description' : 'Description (optional)'}
          placeholder="Summary of the competition and result."
          rows={3}
          error={errors.description?.message}
          {...register('description')}
        />
      </FieldGroup>
    </FormDialog>
  );
}
