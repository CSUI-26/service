import { useEffect, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Trash2 } from 'lucide-react';
import type { Activity } from '@zenith/shared';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { FormDialog } from '@/components/patterns/FormDialog';
import { ImageUploadEditor, type ImageUploadValue } from '@/components/patterns/ImageUploadEditor';
import { TextAreaField, TextField } from '@/components/patterns/TextField';
import { activitiesApi } from '@/features/activities/api';
import {
  activityFormSchema,
  slugifyActivityId,
  type ActivityFormValues,
} from '@/features/activities/schema';
import { normalizeSocialLink } from '@/features/members/socialLinks';

function createEmptyValues(): ActivityFormValues {
  return {
    id: '',
    title: '',
    date: '',
    description: '',
    position: 0,
    imageUrl: '',
    imageConfig: undefined,
  };
}

function toFormValues(activity: Activity | null): ActivityFormValues {
  if (!activity) return createEmptyValues();
  return {
    id: activity.id,
    title: activity.title,
    date: activity.date ?? '',
    description: activity.description,
    position: activity.position,
    imageUrl: activity.image?.url ?? '',
    imageConfig: activity.image?.config,
  };
}

interface ActivityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Activity | null;
  saving: boolean;
  onDelete?: (activity: Activity) => void;
  onImageSaved?: () => void;
  onSubmit: (values: ActivityFormValues) => void;
}

export function ActivityFormDialog({
  open,
  onOpenChange,
  editing,
  saving,
  onDelete,
  onImageSaved,
  onSubmit,
}: ActivityFormDialogProps) {
  const idTouchedRef = useRef(false);

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
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

  const slugId = useWatch({ control, name: 'id' });
  const imageUrl = useWatch({ control, name: 'imageUrl' });
  const imageConfig = useWatch({ control, name: 'imageConfig' });

  useEffect(() => {
    if (open) {
      reset(toFormValues(editing));
      idTouchedRef.current = Boolean(editing);
    }
  }, [open, editing, reset]);

  const titleField = register('title');
  const idField = register('id');

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? 'Edit activity' : 'Add activity'}
      description="Manage cohort activities shown on the homepage."
      onSubmit={handleSubmit(onSubmit)}
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
                Delete
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
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      }
    >
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="activity-title"
            label="Title"
            placeholder="PSAF"
            error={errors.title?.message}
            {...titleField}
            onChange={(event) => {
              void titleField.onChange(event);
              if (!editing && !idTouchedRef.current) {
                setValue('id', slugifyActivityId(event.target.value), { shouldValidate: false });
              }
            }}
          />
          <TextField
            id="activity-id"
            label="Slug ID"
            placeholder="psaf"
            disabled={Boolean(editing)}
            className="font-mono"
            hint={editing ? 'Primary ID cannot be changed.' : 'Unique identifier slug.'}
            error={errors.id?.message}
            {...idField}
            onChange={(event) => {
              idTouchedRef.current = true;
              void idField.onChange(event);
            }}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="activity-date"
            label="Date label (optional)"
            placeholder="11-13 Agustus 2026"
            error={errors.date?.message}
            {...register('date')}
          />
          <TextField
            id="activity-position"
            label="Position"
            type="number"
            min={0}
            className="font-mono tabular-nums"
            error={errors.position?.message}
            {...register('position', { valueAsNumber: true })}
          />
        </div>

        <TextAreaField
          id="activity-description"
          label="Description"
          placeholder="Summary of the cohort activity."
          rows={3}
          error={errors.description?.message}
          {...register('description')}
        />

        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
          <ImageUploadEditor
            endpoint="/upload/activity"
            uploadParams={slugId?.trim() ? { id: slugId.trim() } : undefined}
            defaultAspect="16:9"
            label="Activity image (16:9)"
            value={{ url: imageUrl ?? '', config: imageConfig }}
            onChange={({ url, config }) => {
              setValue('imageUrl', url, { shouldValidate: true });
              setValue('imageConfig', config);
            }}
            onCommit={
              editing
                ? async (next: ImageUploadValue) => {
                    const image: ImageUploadValue = {
                      url: normalizeSocialLink('photo', next.url),
                      config: next.config,
                    };
                    const res = await activitiesApi.update(editing.id, { image });
                    setValue('imageUrl', res.data.image?.url ?? image.url, { shouldValidate: true });
                    setValue('imageConfig', res.data.image?.config ?? image.config);
                    onImageSaved?.();
                    toast.success('Activity image saved');
                  }
                : undefined
            }
          />
          {errors.imageUrl?.message ? (
            <p role="alert" className="text-xs text-destructive">
              {errors.imageUrl.message}
            </p>
          ) : null}
        </div>
      </FieldGroup>
    </FormDialog>
  );
}
