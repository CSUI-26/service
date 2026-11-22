import { inArray, sql } from 'drizzle-orm';
import type { AdminStats } from '../../schemas/index.js';
import { db } from '../client.js';
import {
  achievements,
  activities,
  contentRequests,
  courses,
  feedbackThreads,
  galleryItems,
  members,
  programs,
} from '../schema.js';

export async function getAdminStats(): Promise<AdminStats> {
  const [
    programsRows,
    coursesRows,
    membersRows,
    achievementsRows,
    galleryRows,
    activitiesRows,
    openContentRows,
    openFeedbackRows,
  ] = await Promise.all([
    db.select({ total: sql<number>`count(*)::int` }).from(programs),
    db.select({ total: sql<number>`count(*)::int` }).from(courses),
    db.select({ total: sql<number>`count(*)::int` }).from(members),
    db.select({ total: sql<number>`count(*)::int` }).from(achievements),
    db.select({ total: sql<number>`count(*)::int` }).from(galleryItems),
    db.select({ total: sql<number>`count(*)::int` }).from(activities),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(contentRequests)
      .where(inArray(contentRequests.status, ['open', 'in_progress'])),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(feedbackThreads)
      .where(inArray(feedbackThreads.status, ['open', 'in_progress'])),
  ]);

  return {
    programs: Number(programsRows[0]?.total ?? 0),
    courses: Number(coursesRows[0]?.total ?? 0),
    members: Number(membersRows[0]?.total ?? 0),
    achievements: Number(achievementsRows[0]?.total ?? 0),
    galleryItems: Number(galleryRows[0]?.total ?? 0),
    activities: Number(activitiesRows[0]?.total ?? 0),
    openContentRequests: Number(openContentRows[0]?.total ?? 0),
    openFeedbackThreads: Number(openFeedbackRows[0]?.total ?? 0),
  };
}
