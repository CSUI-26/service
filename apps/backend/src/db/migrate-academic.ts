import '../config/env.js';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq, inArray, sql as drizzleSql } from 'drizzle-orm';
import { z } from 'zod';
import { ProgramSchema, type Program } from '@zenith/shared';
import { db, sql } from './client.js';
import { courses, programs, semesters } from './schema.js';
import { invalidateCurriculumCache } from './repositories/programs.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_DIR = existsSync(join(__dirname, '../../../../data'))
  ? join(__dirname, '../../../../data')
  : join(__dirname, '../../../data');

function parseArgs(argv: string[]): { dryRun: boolean; filePath: string } {
  let dryRun = false;
  let filePath = process.env.ACADEMIC_FILE ?? join(DEFAULT_DATA_DIR, 'academic.json');

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--file' && argv[i + 1]) {
      filePath = resolve(argv[i + 1]);
      i += 1;
    } else if (arg.startsWith('--file=')) {
      filePath = resolve(arg.slice('--file='.length));
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: migrate-academic [--dry-run] [--file <path/to/academic.json>]');
      process.exit(0);
    }
  }

  return { dryRun, filePath };
}

function loadPrograms(filePath: string): Program[] {
  if (!existsSync(filePath)) {
    throw new Error(`Academic dataset not found at ${filePath}`);
  }
  const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
  const parsed = z.array(ProgramSchema).min(1).safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid academic.json schema: ${parsed.error.message}`);
  }
  return parsed.data;
}

async function main() {
  const { dryRun, filePath } = parseArgs(process.argv.slice(2));
  const programsData = loadPrograms(filePath);

  console.log(
    `${dryRun ? '[DRY RUN] ' : ''}Migrating academic curriculum from ${filePath} (${programsData.length} programs)...`,
  );

  try {
    const existingPrograms = await db.select({ id: programs.id, name: programs.name }).from(programs);
    const existingIds = new Set(existingPrograms.map((p) => p.id));

    const existingSemesters = await db
      .select({ id: semesters.id, programId: semesters.programId })
      .from(semesters);
    const semCountByProgram = new Map<string, number>();
    const semIdsByProgram = new Map<string, number[]>();
    for (const sem of existingSemesters) {
      semCountByProgram.set(sem.programId, (semCountByProgram.get(sem.programId) ?? 0) + 1);
      const list = semIdsByProgram.get(sem.programId) ?? [];
      list.push(sem.id);
      semIdsByProgram.set(sem.programId, list);
    }

    const existingCourses = await db
      .select({ semesterId: courses.semesterId })
      .from(courses);
    const courseCountBySemId = new Map<number, number>();
    for (const c of existingCourses) {
      courseCountBySemId.set(c.semesterId, (courseCountBySemId.get(c.semesterId) ?? 0) + 1);
    }

    const summaryRows = programsData.map((program) => {
      const prevSemIds = semIdsByProgram.get(program.id) ?? [];
      const prevCourses = prevSemIds.reduce((sum, id) => sum + (courseCountBySemId.get(id) ?? 0), 0);
      const nextCourses = program.semesters.reduce((sum, s) => sum + s.courses.length, 0);
      return {
        programId: program.id,
        action: existingIds.has(program.id) ? 'UPSERT (update)' : 'UPSERT (insert)',
        prevSemesters: prevSemIds.length,
        nextSemesters: program.semesters.length,
        prevCourses,
        nextCourses,
      };
    });

    console.table(summaryRows);

    if (dryRun) {
      console.log('[DRY RUN] Schema validated and plan computed. No database changes committed.');
      return;
    }

    await db.transaction(async (tx) => {
      for (const program of programsData) {
        if (existingIds.has(program.id)) {
          await tx
            .update(programs)
            .set({
              name: program.name,
              slug: program.slug,
              description: program.description,
              careers: program.careers,
              courseMapUrl: program.courseMapUrl,
              driveUrl: program.driveUrl,
              updatedAt: drizzleSql`extract(epoch from now())::int`,
            })
            .where(eq(programs.id, program.id));
        } else {
          await tx.insert(programs).values({
            id: program.id,
            name: program.name,
            slug: program.slug,
            description: program.description,
            careers: program.careers,
            courseMapUrl: program.courseMapUrl,
            driveUrl: program.driveUrl,
          });
        }

        const existingProgramSemesters = await tx
          .select({ id: semesters.id })
          .from(semesters)
          .where(eq(semesters.programId, program.id));
        const existingSemIds = existingProgramSemesters.map((s) => s.id);
        if (existingSemIds.length > 0) {
          await tx.delete(courses).where(inArray(courses.semesterId, existingSemIds));
          await tx.delete(semesters).where(eq(semesters.programId, program.id));
        }

        for (let semIdx = 0; semIdx < program.semesters.length; semIdx++) {
          const sem = program.semesters[semIdx];
          const [insertedSem] = await tx
            .insert(semesters)
            .values({
              programId: program.id,
              semester: String(sem.semester),
              position: semIdx,
            })
            .returning({ id: semesters.id });

          if (sem.courses.length > 0) {
            await tx.insert(courses).values(
              sem.courses.map((course, courseIdx) => ({
                semesterId: insertedSem.id,
                name: course.name,
                code: course.code || null,
                sks: course.sks,
                category: course.category || null,
                track: course.track || null,
                description: course.description || null,
                prerequisites: course.prerequisites ?? null,
                unlocks: course.unlocks ?? null,
                materialUrl: course.materialUrl || null,
                position: courseIdx,
              })),
            );
          }
        }
      }
    });

    invalidateCurriculumCache();
    console.log('Academic curriculum migration completed successfully.');
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error('Academic migration failed:', err);
  process.exit(1);
});
