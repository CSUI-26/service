import { z } from 'zod';

const optionalImageUrl = z
  .string()
  .refine(
    (value) => value === '' || /^(https?:\/\/|\/)/.test(value),
    'Image URL must start with http://, https://, or /',
  );

// Shared image transform configuration
export const ImageConfigSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number(),
  rotate: z.number().optional(),
  aspect: z.string(),
});

export const ImageFieldSchema = z.object({
  url: optionalImageUrl,
  config: ImageConfigSchema.optional(),
});

export const RequiredImageFieldSchema = z.object({
  url: optionalImageUrl.refine((val) => val.trim().length > 0, 'Image URL is required'),
  config: ImageConfigSchema.optional(),
});

// Program schemas
export const CourseSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1, 'Course name required'),
  code: z.string().optional(),
  sks: z.number().int().min(1).max(6),
  category: z.string().optional(),
  track: z.string().optional(),
  description: z.string().optional(),
  prerequisites: z.array(z.string()).optional(),
  unlocks: z.array(z.string()).optional(),
  materialUrl: z.string().url().optional().or(z.literal('')),
});

export const SemesterSchema = z.object({
  semester: z.union([z.number().int().positive(), z.string()]),
  courses: z.array(CourseSchema),
});

export const ProgramSchema = z.object({
  id: z.string().min(1, 'Program ID required'),
  name: z.string().min(1, 'Program name required'),
  slug: z.string().min(1),
  description: z.string(),
  careers: z.array(z.string()),
  courseMapUrl: z.string().url().or(z.literal('')),
  driveUrl: z.string().url().or(z.literal('')),
  semesters: z.array(SemesterSchema),
});

export const ProgramCreateSchema = ProgramSchema.extend({
  semesters: z.array(SemesterSchema).optional().default([]),
});
export const ProgramUpdateSchema = ProgramSchema.partial().omit({ id: true });

// Course CRUD schemas
export const CourseCreateSchema = z.object({
  programId: z.string().min(1),
  semester: z.union([z.number().int().positive(), z.string()]),
  course: CourseSchema,
});

export const CourseUpdateSchema = CourseSchema.partial().extend({
  programId: z.string().min(1).optional(),
  semester: z.union([z.number().int().positive(), z.string().trim().min(1)]).optional(),
});

// Member schemas
export const MemberFotoSchema = ImageFieldSchema;

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return false;
  }
  const todayIso = new Date().toISOString().slice(0, 10);
  return value <= todayIso;
}

export const DateOfBirthSchema = z
  .string()
  .refine(isValidIsoDate, 'Date of birth must be a valid YYYY-MM-DD date not in the future');

export const MemberSchema = z.object({
  npm: z.string().regex(/^\d{10}$/, 'NPM must be 10 digits'),
  email: z.string().email(),
  name: z.string().min(1),
  nama_panggilan: z.string().min(1),
  major: z.string().optional(),
  programId: z.string().min(1).optional(),
  dateOfBirth: DateOfBirthSchema.nullable().optional(),
  instagram: z.string(),
  line: z.string(),
  github: z.string(),
  linkedin: z.string(),
  deskripsi: z.string(),
  niche: z.string(),
  quotes: z.string(),
  foto: MemberFotoSchema,
  role: z.enum(['user', 'admin']).optional(),
});

export const MemberCreateSchema = MemberSchema;
export const MemberUpdateSchema = MemberSchema.partial().omit({ npm: true });

export const MemberRoleUpdateSchema = z.object({
  role: z.enum(['user', 'admin']),
});

// Achievement schemas
const AchievementFields = {
  id: z.string().min(1, 'Achievement ID required'),
  title: z.string().min(1, 'Title required'),
  award: z.string().optional(),
  year: z.number().int().min(1990).max(2100),
  isFeatured: z.boolean(),
  image: ImageFieldSchema.optional(),
  teamName: z.string().optional(),
  members: z.array(z.string()).optional(),
  description: z.string().optional(),
  showOverlay: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
};

export const AchievementSchema = z.object({
  id: z.string().min(1, 'Achievement ID required'),
  title: z.string().min(1, 'Title required'),
  award: z.string(),
  year: z.number().int().min(1990).max(2100),
  isFeatured: z.boolean(),
  image: ImageFieldSchema,
  teamName: z.string(),
  members: z.array(z.string()),
  description: z.string(),
  showOverlay: z.boolean(),
  position: z.number().int().min(0),
});

export const AchievementCreateSchema = z
  .object({
    id: AchievementFields.id,
    title: AchievementFields.title,
    award: z.string().default(''),
    year: AchievementFields.year,
    isFeatured: z.boolean().default(false),
    image: ImageFieldSchema.default({ url: '' }),
    teamName: z.string().default(''),
    members: z.array(z.string()).default([]),
    description: z.string().default(''),
    showOverlay: z.boolean().default(true),
    position: z.number().int().min(0).default(0),
  })
  .superRefine((data, ctx) => {
    if (!data.isFeatured) return;

    if (!data.award.trim()) {
      ctx.addIssue({ code: 'custom', path: ['award'], message: 'Award is required for featured achievements' });
    }
    if (!data.image.url.trim()) {
      ctx.addIssue({ code: 'custom', path: ['image', 'url'], message: 'Image URL is required for featured achievements' });
    }
    if (!data.teamName.trim()) {
      ctx.addIssue({ code: 'custom', path: ['teamName'], message: 'Team name is required for featured achievements' });
    }
    if (data.members.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['members'], message: 'At least one team member is required' });
    }
    if (!data.description.trim()) {
      ctx.addIssue({ code: 'custom', path: ['description'], message: 'Description is required for featured achievements' });
    }
  });

export const AchievementUpdateSchema = z.object(AchievementFields).omit({ id: true }).partial();

export const LatestAchievementSchema = z.object({
  id: z.string(),
  title: z.string(),
  award: z.string(),
  image: z.string(),
  imageConfig: ImageConfigSchema.optional(),
  teamName: z.string(),
  members: z.array(z.string()),
  description: z.string(),
  showOverlay: z.boolean().optional(),
});

export const YearlyAchievementSchema = z.object({
  id: z.string(),
  title: z.string(),
  award: z.string().optional(),
  year: z.number().int(),
  isFeatured: z.boolean().optional(),
  image: z.string().optional(),
  imageConfig: ImageConfigSchema.optional(),
  teamName: z.string().optional(),
  members: z.array(z.string()).optional(),
  description: z.string().optional(),
});

export const YearGroupSchema = z.object({
  year: z.number().int(),
  items: z.array(YearlyAchievementSchema),
});

export const PublicAchievementsResponseSchema = z.object({
  latestAchievements: z.array(LatestAchievementSchema),
  yearlyAchievementsByYear: z.array(YearGroupSchema),
});

// Gallery schemas
export const GalleryCategorySchema = z.enum(['photo', 'hero', 'highlight']);

export const GalleryItemSchema = z.object({
  id: z.string().min(1, 'Gallery item ID required'),
  title: z.string().min(1, 'Title required'),
  alt: z.string().min(1, 'Alt text required'),
  category: GalleryCategorySchema,
  isFeatured: z.boolean(),
  image: RequiredImageFieldSchema,
  position: z.number().int().min(0),
});

export const GalleryItemCreateSchema = z.object({
  id: z.string().min(1, 'Gallery item ID required'),
  title: z.string().min(1, 'Title required'),
  alt: z.string().min(1, 'Alt text required'),
  category: GalleryCategorySchema.default('photo'),
  isFeatured: z.boolean().default(false),
  image: RequiredImageFieldSchema,
  position: z.number().int().min(0).default(0),
});

export const GalleryItemUpdateSchema = z
  .object({
    title: z.string().min(1, 'Title required'),
    alt: z.string().min(1, 'Alt text required'),
    category: GalleryCategorySchema,
    isFeatured: z.boolean(),
    image: RequiredImageFieldSchema,
    position: z.number().int().min(0),
  })
  .partial();

export const PublicGalleryResponseSchema = z.object({
  photos: z.array(GalleryItemSchema),
  heroes: z.array(GalleryItemSchema),
  highlights: z.array(GalleryItemSchema),
  featuredPhoto: GalleryItemSchema.nullable(),
});

// Activity schemas
export const ActivitySchema = z.object({
  id: z.string().min(1, 'Activity ID required'),
  title: z.string().min(1, 'Activity title required'),
  date: z.string(),
  description: z.string().min(1, 'Description required'),
  image: RequiredImageFieldSchema,
  position: z.number().int().min(0),
});

export const ActivityCreateSchema = z.object({
  id: z.string().min(1, 'Activity ID required'),
  title: z.string().min(1, 'Activity title required'),
  date: z.string().default(''),
  description: z.string().min(1, 'Description required'),
  image: RequiredImageFieldSchema,
  position: z.number().int().min(0).default(0),
});

export const ActivityUpdateSchema = z
  .object({
    title: z.string().min(1, 'Activity title required'),
    date: z.string(),
    description: z.string().min(1, 'Description required'),
    image: RequiredImageFieldSchema,
    position: z.number().int().min(0),
  })
  .partial();

// Shared thread status, author & message input schemas
export const RequestStatusSchema = z.enum(['open', 'in_progress', 'resolved', 'closed']);

export const RequestAuthorSchema = z.object({
  npm: z.string(),
  name: z.string(),
  nama_panggilan: z.string(),
  foto: ImageFieldSchema.optional(),
});

const ThreadMessageCreateSchema = z.object({
  body: z.string().trim().min(1, 'Message body required').max(4000),
  image: ImageFieldSchema.nullable().optional(),
});

const ThreadMessageUpdateSchema = z
  .object({
    body: z.string().trim().min(1, 'Message body required').max(4000),
    image: ImageFieldSchema.nullable(),
  })
  .partial()
  .refine((data) => data.body !== undefined || data.image !== undefined, {
    message: 'At least one field (body or image) must be provided',
  });

// Content Request schemas
export const ContentRequestTypeSchema = z.enum(['achievement', 'gallery', 'activity', 'other']);

export const ContentRequestMessageSchema = z.object({
  id: z.number().int().positive(),
  requestId: z.number().int().positive(),
  authorNpm: z.string(),
  authorRole: z.enum(['user', 'admin']),
  author: RequestAuthorSchema.optional(),
  body: z.string().min(1, 'Message body required'),
  image: ImageFieldSchema.nullable().optional(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

export const ContentRequestMessageCreateSchema = ThreadMessageCreateSchema;
export const ContentRequestMessageUpdateSchema = ThreadMessageUpdateSchema;

export const ContentRequestSummarySchema = z.object({
  id: z.number().int().positive(),
  authorNpm: z.string(),
  author: RequestAuthorSchema.optional(),
  contentType: ContentRequestTypeSchema,
  title: z.string().min(1, 'Title required'),
  description: z.string().min(1, 'Description required'),
  status: RequestStatusSchema,
  image: ImageFieldSchema.nullable().optional(),
  messageCount: z.number().int().min(0),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

export const ContentRequestDetailSchema = ContentRequestSummarySchema.extend({
  messages: z.array(ContentRequestMessageSchema),
});

export const ContentRequestCreateSchema = z.object({
  contentType: ContentRequestTypeSchema.default('achievement'),
  title: z.string().trim().min(1, 'Title required').max(200),
  description: z.string().trim().min(1, 'Description required').max(5000),
  image: ImageFieldSchema.nullable().optional(),
});

export const ContentRequestUpdateSchema = z
  .object({
    contentType: ContentRequestTypeSchema,
    title: z.string().trim().min(1, 'Title required').max(200),
    description: z.string().trim().min(1, 'Description required').max(5000),
    status: RequestStatusSchema,
    image: ImageFieldSchema.nullable(),
  })
  .partial();

// Feedback & Help Thread schemas
export const FeedbackCategorySchema = z.enum(['feedback', 'help', 'other']);

const optionalFeedbackUrl = z.string().url().or(z.literal('')).nullable().optional();

export const FeedbackMessageSchema = z.object({
  id: z.number().int().positive(),
  threadId: z.number().int().positive(),
  authorNpm: z.string(),
  authorRole: z.enum(['user', 'admin']),
  author: RequestAuthorSchema.optional(),
  body: z.string().min(1, 'Message body required'),
  image: ImageFieldSchema.nullable().optional(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

export const FeedbackMessageCreateSchema = ThreadMessageCreateSchema;
export const FeedbackMessageUpdateSchema = ThreadMessageUpdateSchema;

export const FeedbackThreadSummarySchema = z.object({
  id: z.number().int().positive(),
  authorNpm: z.string(),
  author: RequestAuthorSchema.optional(),
  category: FeedbackCategorySchema,
  title: z.string().min(1, 'Title required'),
  description: z.string().min(1, 'Description required'),
  status: RequestStatusSchema,
  image: ImageFieldSchema.nullable().optional(),
  externalUrl: optionalFeedbackUrl,
  messageCount: z.number().int().min(0),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

export const FeedbackThreadDetailSchema = FeedbackThreadSummarySchema.extend({
  messages: z.array(FeedbackMessageSchema),
});

export const FeedbackThreadCreateSchema = z.object({
  category: FeedbackCategorySchema.default('feedback'),
  title: z.string().trim().min(1, 'Title required').max(200),
  description: z.string().trim().min(1, 'Description required').max(5000),
  image: ImageFieldSchema.nullable().optional(),
  externalUrl: optionalFeedbackUrl,
});

export const FeedbackThreadUpdateSchema = z
  .object({
    category: FeedbackCategorySchema,
    title: z.string().trim().min(1, 'Title required').max(200),
    description: z.string().trim().min(1, 'Description required').max(5000),
    status: RequestStatusSchema,
    image: ImageFieldSchema.nullable(),
    externalUrl: optionalFeedbackUrl,
  })
  .partial();

// Admin Hub summary stats schema
export const AdminStatsSchema = z.object({
  programs: z.number().int().min(0),
  courses: z.number().int().min(0),
  members: z.number().int().min(0),
  achievements: z.number().int().min(0),
  galleryItems: z.number().int().min(0),
  activities: z.number().int().min(0),
  openContentRequests: z.number().int().min(0),
  openFeedbackThreads: z.number().int().min(0),
});

// Types
export type ImageConfig = z.infer<typeof ImageConfigSchema>;
export type ImageField = z.infer<typeof ImageFieldSchema>;
export type Course = z.infer<typeof CourseSchema>;
export type Semester = z.infer<typeof SemesterSchema>;
export type Program = z.infer<typeof ProgramSchema>;
export type Member = z.infer<typeof MemberSchema>;
export type CourseCreate = z.infer<typeof CourseCreateSchema>;
export type CourseUpdate = z.infer<typeof CourseUpdateSchema>;
export type ProgramCreate = z.infer<typeof ProgramCreateSchema>;
export type ProgramUpdate = z.infer<typeof ProgramUpdateSchema>;
export type MemberCreate = z.infer<typeof MemberCreateSchema>;
export type MemberUpdate = z.infer<typeof MemberUpdateSchema>;
export type Achievement = z.infer<typeof AchievementSchema>;
export type AchievementCreate = z.infer<typeof AchievementCreateSchema>;
export type AchievementUpdate = z.infer<typeof AchievementUpdateSchema>;
export type LatestAchievement = z.infer<typeof LatestAchievementSchema>;
export type YearlyAchievement = z.infer<typeof YearlyAchievementSchema>;
export type YearGroup = z.infer<typeof YearGroupSchema>;
export type PublicAchievementsResponse = z.infer<typeof PublicAchievementsResponseSchema>;
export type GalleryCategory = z.infer<typeof GalleryCategorySchema>;
export type GalleryItem = z.infer<typeof GalleryItemSchema>;
export type GalleryItemCreate = z.infer<typeof GalleryItemCreateSchema>;
export type GalleryItemUpdate = z.infer<typeof GalleryItemUpdateSchema>;
export type PublicGalleryResponse = z.infer<typeof PublicGalleryResponseSchema>;
export type Activity = z.infer<typeof ActivitySchema>;
export type ActivityCreate = z.infer<typeof ActivityCreateSchema>;
export type ActivityUpdate = z.infer<typeof ActivityUpdateSchema>;
export type RequestStatus = z.infer<typeof RequestStatusSchema>;
export type RequestAuthor = z.infer<typeof RequestAuthorSchema>;
export type ContentRequestType = z.infer<typeof ContentRequestTypeSchema>;
export type ContentRequestMessage = z.infer<typeof ContentRequestMessageSchema>;
export type ContentRequestMessageCreate = z.infer<typeof ContentRequestMessageCreateSchema>;
export type ContentRequestMessageUpdate = z.infer<typeof ContentRequestMessageUpdateSchema>;
export type ContentRequestSummary = z.infer<typeof ContentRequestSummarySchema>;
export type ContentRequestDetail = z.infer<typeof ContentRequestDetailSchema>;
export type ContentRequestCreate = z.infer<typeof ContentRequestCreateSchema>;
export type ContentRequestUpdate = z.infer<typeof ContentRequestUpdateSchema>;
export type FeedbackCategory = z.infer<typeof FeedbackCategorySchema>;
export type FeedbackMessage = z.infer<typeof FeedbackMessageSchema>;
export type FeedbackMessageCreate = z.infer<typeof FeedbackMessageCreateSchema>;
export type FeedbackMessageUpdate = z.infer<typeof FeedbackMessageUpdateSchema>;
export type FeedbackThreadSummary = z.infer<typeof FeedbackThreadSummarySchema>;
export type FeedbackThreadDetail = z.infer<typeof FeedbackThreadDetailSchema>;
export type FeedbackThreadCreate = z.infer<typeof FeedbackThreadCreateSchema>;
export type FeedbackThreadUpdate = z.infer<typeof FeedbackThreadUpdateSchema>;
export type AdminStats = z.infer<typeof AdminStatsSchema>;
