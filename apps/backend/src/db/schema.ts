import { sql } from 'drizzle-orm';
import { pgTable, text, serial, integer, boolean, jsonb, date, unique, index, check } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { ContentRequestMetadata, ImageConfig } from '@zenith/shared';

export const programs = pgTable('programs', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull(),
  careers: jsonb('careers').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  courseMapUrl: text('course_map_url').notNull(),
  driveUrl: text('drive_url').notNull(),
  createdAt: integer('created_at').notNull().default(sql`extract(epoch from now())::int`),
  updatedAt: integer('updated_at').notNull().default(sql`extract(epoch from now())::int`),
}, (table) => ({
  nameIdx: index('idx_programs_name').on(table.name),
}));

export const semesters = pgTable('semesters', {
  id: serial('id').primaryKey(),
  programId: text('program_id').notNull().references(() => programs.id, { onDelete: 'cascade' }),
  semester: text('semester').notNull(),
  position: integer('position').notNull().default(0),
}, (table) => ({
  programSemesterUnique: unique('semesters_program_semester_unique').on(table.programId, table.semester),
  programIdx: index('idx_semesters_program').on(table.programId),
}));

export const courses = pgTable('courses', {
  id: serial('id').primaryKey(),
  semesterId: integer('semester_id').notNull().references(() => semesters.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  code: text('code'),
  sks: integer('sks').notNull(),
  description: text('description'),
  prerequisites: jsonb('prerequisites').$type<string[] | null>(),
  materialUrl: text('material_url'),
  position: integer('position').notNull().default(0),
}, (table) => ({
  semesterIdx: index('idx_courses_semester').on(table.semesterId),
  codeIdx: index('idx_courses_code').on(table.code),
  sksCheck: check('courses_sks_check', sql`${table.sks} > 0 AND ${table.sks} <= 6`),
}));

export const members = pgTable('members', {
  npm: text('npm').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  namaPanggilan: text('nama_panggilan').notNull(),
  programId: text('program_id').notNull().references(() => programs.id, { onDelete: 'restrict' }),
  dateOfBirth: date('date_of_birth', { mode: 'string' }),
  instagram: text('instagram'),
  line: text('line'),
  github: text('github'),
  linkedin: text('linkedin'),
  deskripsi: text('deskripsi'),
  niche: text('niche'),
  quotes: text('quotes'),
  foto: jsonb('foto').$type<{ url: string; config?: ImageConfig }>().notNull(),
  role: text('role').notNull().default('user'),
  createdAt: integer('created_at').notNull().default(sql`extract(epoch from now())::int`),
  updatedAt: integer('updated_at').notNull().default(sql`extract(epoch from now())::int`),
}, (table) => ({
  programIdx: index('idx_members_program').on(table.programId),
  nameIdx: index('idx_members_name').on(table.name),
  roleIdx: index('idx_members_role').on(table.role),
}));

export const achievements = pgTable('achievements', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  award: text('award'),
  year: integer('year').notNull(),
  isFeatured: boolean('is_featured').notNull().default(false),
  image: jsonb('image').$type<{ url: string; config?: ImageConfig } | null>(),
  teamName: text('team_name'),
  members: jsonb('members').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  description: text('description'),
  showOverlay: boolean('show_overlay').notNull().default(true),
  position: integer('position').notNull().default(0),
  createdAt: integer('created_at').notNull().default(sql`extract(epoch from now())::int`),
  updatedAt: integer('updated_at').notNull().default(sql`extract(epoch from now())::int`),
}, (table) => ({
  yearIdx: index('idx_achievements_year').on(table.year),
  featuredIdx: index('idx_achievements_featured').on(table.isFeatured),
}));

export const galleryItems = pgTable('gallery_items', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  alt: text('alt').notNull(),
  category: text('category').notNull().default('photo'),
  isFeatured: boolean('is_featured').notNull().default(false),
  image: jsonb('image').$type<{ url: string; config?: ImageConfig }>().notNull(),
  position: integer('position').notNull().default(0),
  createdAt: integer('created_at').notNull().default(sql`extract(epoch from now())::int`),
  updatedAt: integer('updated_at').notNull().default(sql`extract(epoch from now())::int`),
}, (table) => ({
  categoryIdx: index('idx_gallery_items_category').on(table.category),
  featuredIdx: index('idx_gallery_items_featured').on(table.isFeatured),
  positionIdx: index('idx_gallery_items_position').on(table.position),
}));

export const activities = pgTable('activities', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  date: text('date'),
  description: text('description').notNull(),
  image: jsonb('image').$type<{ url: string; config?: ImageConfig }>().notNull(),
  position: integer('position').notNull().default(0),
  createdAt: integer('created_at').notNull().default(sql`extract(epoch from now())::int`),
  updatedAt: integer('updated_at').notNull().default(sql`extract(epoch from now())::int`),
}, (table) => ({
  positionIdx: index('idx_activities_position').on(table.position),
}));

export const programsRelations = relations(programs, ({ many }) => ({
  semesters: many(semesters),
  members: many(members),
}));

export const semestersRelations = relations(semesters, ({ one, many }) => ({
  program: one(programs, {
    fields: [semesters.programId],
    references: [programs.id],
  }),
  courses: many(courses),
}));

export const coursesRelations = relations(courses, ({ one }) => ({
  semester: one(semesters, {
    fields: [courses.semesterId],
    references: [semesters.id],
  }),
}));

export const membersRelations = relations(members, ({ one }) => ({
  program: one(programs, {
    fields: [members.programId],
    references: [programs.id],
  }),
}));

export const contentRequests = pgTable('content_requests', {
  id: serial('id').primaryKey(),
  authorNpm: text('author_npm').notNull().references(() => members.npm, { onDelete: 'cascade' }),
  contentType: text('content_type').notNull().default('achievement'),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull().default('open'),
  image: jsonb('image').$type<{ url: string; config?: ImageConfig } | null>(),
  metadata: jsonb('metadata').$type<ContentRequestMetadata>().notNull().default(sql`'{}'::jsonb`),
  createdAt: integer('created_at').notNull().default(sql`extract(epoch from now())::int`),
  updatedAt: integer('updated_at').notNull().default(sql`extract(epoch from now())::int`),
}, (table) => ({
  authorIdx: index('idx_content_requests_author').on(table.authorNpm),
  statusIdx: index('idx_content_requests_status').on(table.status),
  typeIdx: index('idx_content_requests_type').on(table.contentType),
  updatedAtIdx: index('idx_content_requests_updated_at').on(table.updatedAt),
}));

export const contentRequestMessages = pgTable('content_request_messages', {
  id: serial('id').primaryKey(),
  requestId: integer('request_id').notNull().references(() => contentRequests.id, { onDelete: 'cascade' }),
  authorNpm: text('author_npm').notNull().references(() => members.npm, { onDelete: 'cascade' }),
  authorRole: text('author_role').notNull().default('user'),
  body: text('body').notNull(),
  image: jsonb('image').$type<{ url: string; config?: ImageConfig } | null>(),
  createdAt: integer('created_at').notNull().default(sql`extract(epoch from now())::int`),
  updatedAt: integer('updated_at').notNull().default(sql`extract(epoch from now())::int`),
}, (table) => ({
  requestIdx: index('idx_content_request_messages_request').on(table.requestId, table.createdAt),
  authorIdx: index('idx_content_request_messages_author').on(table.authorNpm),
}));

export const feedbackThreads = pgTable('feedback_threads', {
  id: serial('id').primaryKey(),
  authorNpm: text('author_npm').notNull().references(() => members.npm, { onDelete: 'cascade' }),
  category: text('category').notNull().default('feedback'),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull().default('open'),
  image: jsonb('image').$type<{ url: string; config?: ImageConfig } | null>(),
  externalUrl: text('external_url'),
  createdAt: integer('created_at').notNull().default(sql`extract(epoch from now())::int`),
  updatedAt: integer('updated_at').notNull().default(sql`extract(epoch from now())::int`),
}, (table) => ({
  authorIdx: index('idx_feedback_threads_author').on(table.authorNpm),
  statusIdx: index('idx_feedback_threads_status').on(table.status),
  categoryIdx: index('idx_feedback_threads_category').on(table.category),
  updatedAtIdx: index('idx_feedback_threads_updated_at').on(table.updatedAt),
}));

export const feedbackMessages = pgTable('feedback_messages', {
  id: serial('id').primaryKey(),
  threadId: integer('thread_id').notNull().references(() => feedbackThreads.id, { onDelete: 'cascade' }),
  authorNpm: text('author_npm').notNull().references(() => members.npm, { onDelete: 'cascade' }),
  authorRole: text('author_role').notNull().default('user'),
  body: text('body').notNull(),
  image: jsonb('image').$type<{ url: string; config?: ImageConfig } | null>(),
  createdAt: integer('created_at').notNull().default(sql`extract(epoch from now())::int`),
  updatedAt: integer('updated_at').notNull().default(sql`extract(epoch from now())::int`),
}, (table) => ({
  threadIdx: index('idx_feedback_messages_thread').on(table.threadId, table.createdAt),
  authorIdx: index('idx_feedback_messages_author').on(table.authorNpm),
}));

export const contentRequestsRelations = relations(contentRequests, ({ one, many }) => ({
  author: one(members, {
    fields: [contentRequests.authorNpm],
    references: [members.npm],
  }),
  messages: many(contentRequestMessages),
}));

export const contentRequestMessagesRelations = relations(contentRequestMessages, ({ one }) => ({
  request: one(contentRequests, {
    fields: [contentRequestMessages.requestId],
    references: [contentRequests.id],
  }),
  author: one(members, {
    fields: [contentRequestMessages.authorNpm],
    references: [members.npm],
  }),
}));

export const feedbackThreadsRelations = relations(feedbackThreads, ({ one, many }) => ({
  author: one(members, {
    fields: [feedbackThreads.authorNpm],
    references: [members.npm],
  }),
  messages: many(feedbackMessages),
}));

export const feedbackMessagesRelations = relations(feedbackMessages, ({ one }) => ({
  thread: one(feedbackThreads, {
    fields: [feedbackMessages.threadId],
    references: [feedbackThreads.id],
  }),
  author: one(members, {
    fields: [feedbackMessages.authorNpm],
    references: [members.npm],
  }),
}));