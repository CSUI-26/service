import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { getTableColumns } from 'drizzle-orm';
import { z } from 'zod';
import { CourseSchema, ProgramSchema } from '@zenith/shared';
import { courses } from '../db/schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ACADEMIC_FILE = resolve(__dirname, '../../../../data/academic.json');

describe('Academic & CourseViz curriculum schemas', () => {
  it('accepts category, track, and unlocks in CourseSchema', () => {
    const parsed = CourseSchema.parse({
      name: 'Pemrosesan Bahasa Alami',
      code: 'CSCE604131',
      sks: 3,
      category: 'Pilihan',
      track: 'Pengolahan Informasi Cerdas',
      description: 'Natural language processing fundamentals.',
      prerequisites: ['Kecerdasan Artifisial & Sains Data Dasar'],
      unlocks: ['Topik Khusus Pemrosesan Bahasa Alami'],
    });
    expect(parsed.category).toBe('Pilihan');
    expect(parsed.track).toBe('Pengolahan Informasi Cerdas');
    expect(parsed.unlocks).toEqual(['Topik Khusus Pemrosesan Bahasa Alami']);
  });

  it('defines category, track, and unlocks columns on courses Drizzle table', () => {
    const cols = getTableColumns(courses);
    expect(Object.keys(cols)).toEqual(
      expect.arrayContaining(['category', 'track', 'unlocks']),
    );
    expect(cols.category.name).toBe('category');
    expect(cols.track.name).toBe('track');
    expect(cols.unlocks.name).toBe('unlocks');
  });

  it('validates data/academic.json against ProgramSchema and CourseViz invariants', () => {
    const raw = JSON.parse(readFileSync(ACADEMIC_FILE, 'utf-8'));
    const parsed = z.array(ProgramSchema).parse(raw);

    expect(parsed.map((p) => p.id)).toEqual([
      'ilmu-komputer',
      'sistem-informasi',
      'kecerdasan-artifisial',
      'ilmu-komputer-kki',
    ]);

    for (const program of parsed) {
      expect(program.semesters.length).toBeGreaterThan(0);
      for (const sem of program.semesters) {
        expect(typeof sem.semester === 'number' || sem.semester === 'Pilihan').toBe(true);
        for (const course of sem.courses) {
          expect(course.name.trim().length).toBeGreaterThan(0);
          expect(course.name).toBe(course.name.trim());
          expect(course.name).not.toMatch(/\(DDP\s*\d+\)$/);
          expect(course.sks).toBeGreaterThanOrEqual(1);
          expect(course.sks).toBeLessThanOrEqual(6);
          if (sem.semester === 'Pilihan') {
            expect(course.track).toBeTruthy();
          }
        }
      }
    }
  });
});
