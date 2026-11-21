import { useEffect, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Trash2 } from 'lucide-react';
import type { GalleryCategory, GalleryItem } from '@zenith/shared';
import { toast } from 'sonner';
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
import { galleryApi } from '@/features/gallery/api';
import {
  defaultAspectForGalleryCategory,
  galleryFormSchema,
  slugifyGalleryId,
  type GalleryFormValues,
} from '@/features/gallery/schema';
import { normalizeSocialLink } from '@/features/members/socialLinks';

const CATEGORY_LABELS: Record<GalleryCategory, string> = {
  photo: 'Cohort Photo',
  hero: 'Mascot Hero',
  highlight: 'Homepage Highlight',
};

function createEmptyValues(): GalleryFormValues {
  return {
    id: '',
    title: '',
    alt: '',
    category: 'photo',
    isFeatured: false,
    position: 0,
    imageUrl: '',
    imageConfig: undefined,
  };
}

function toFormValues(item: GalleryItem | null): GalleryFormValues {
  if (!item) return createEmptyValues();
  return {
    id: item.id,
    title: item.title,
    alt: item.alt,
    category: item.category,
    isFeatured: item.isFeatured,
    position: item.position,
    imageUrl: item.image?.url ?? '',
    imageConfig: item.image?.config,
  };
}

interface GalleryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: GalleryItem | null;
  saving: boolean;
  onDelete?: (item: GalleryItem) => void;
  onImageSaved?: () => void;
  onSubmit: (values: GalleryFormValues) => void;
}

export function GalleryFormDialog({
  open,
  onOpenChange,
  editing,
  saving,
  onDelete,
  onImageSaved,
  onSubmit,
}: GalleryFormDialogProps) {
  const idTouchedRef = useRef(false);

  const form = useForm<GalleryFormValues>({
    resolver: zodResolver(galleryFormSchema),
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

  const category = useWatch({ control, name: 'category' }) ?? 'photo';
  const isFeatured = useWatch({ control, name: 'isFeatured' }) ?? false;
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
  const targetAspect = defaultAspectForGalleryCategory(category, isFeatured);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? 'Edit gallery item' : 'Add gallery item'}
      description="Manage cohort photos, mascot illustrations, and homepage highlights."
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
            id="gallery-title"
            label="Title"
            placeholder="Foto Angkatan 1"
            error={errors.title?.message}
            {...titleField}
            onChange={(event) => {
              void titleField.onChange(event);
              if (!editing && !idTouchedRef.current) {
                setValue('id', slugifyGalleryId(event.target.value), { shouldValidate: false });
              }
            }}
          />
          <TextField
            id="gallery-id"
            label="Slug ID"
            placeholder="foto-angkatan-1"
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
          <Field data-invalid={Boolean(errors.category) || undefined}>
            <FieldLabel htmlFor="gallery-category">Category</FieldLabel>
            <Select
              value={category}
              onValueChange={(value) => {
                const next = value as GalleryCategory;
                setValue('category', next, { shouldValidate: true });
                if (next !== 'photo') {
                  setValue('isFeatured', false, { shouldValidate: true });
                }
              }}
            >
              <SelectTrigger id="gallery-category" className="w-full" aria-label="Category">
                <SelectValue>{CATEGORY_LABELS[category]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="photo">Cohort Photo</SelectItem>
                <SelectItem value="hero">Mascot Hero</SelectItem>
                <SelectItem value="highlight">Homepage Highlight</SelectItem>
              </SelectContent>
            </Select>
            <FieldError>{errors.category?.message}</FieldError>
          </Field>

          <TextField
            id="gallery-position"
            label="Position"
            type="number"
            min={0}
            className="font-mono tabular-nums"
            error={errors.position?.message}
            {...register('position', { valueAsNumber: true })}
          />
        </div>

        {category === 'photo' ? (
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              className="size-4 rounded border-border accent-primary"
              {...register('isFeatured')}
            />
            <span>Featured wide banner on Gallery page</span>
          </label>
        ) : null}

        <TextAreaField
          id="gallery-alt"
          label="Alt text"
          placeholder="Mahasiswa CSUI 2026 berfoto bersama di depan gedung Rektorat UI."
          rows={2}
          error={errors.alt?.message}
          {...register('alt')}
        />

        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
          <ImageUploadEditor
            endpoint="/upload/gallery"
            uploadParams={slugId?.trim() ? { id: slugId.trim() } : undefined}
            defaultAspect={targetAspect}
            label={`Image (${targetAspect})`}
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
                    const res = await galleryApi.update(editing.id, { image });
                    setValue('imageUrl', res.data.image?.url ?? image.url, { shouldValidate: true });
                    setValue('imageConfig', res.data.image?.config ?? image.config);
                    onImageSaved?.();
                    toast.success('Gallery image saved');
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
