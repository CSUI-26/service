#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');
const ACADEMIC_FILE = resolve(ROOT_DIR, 'data/academic.json');
const BASE_URL = 'https://course.csui.dev';

const PRODI_CONFIG = [
  { key: 'CS', varName: 'o', programId: 'ilmu-komputer' },
  { key: 'IS', varName: 'c', programId: 'sistem-informasi' },
  { key: 'AI', varName: 'u', programId: 'kecerdasan-artifisial' },
  { key: 'CS_KKI', varName: 'h', programId: 'ilmu-komputer-kki' },
];

const TRACK_MAP = {
  1: 'Matematika & Komputasi Ilmiah',
  2: 'Pemrograman & Rekayasa Perangkat Lunak',
  3: 'Pengolahan Informasi Cerdas',
  4: 'Komputasi & Algoritma',
  5: 'Arsitektur & Infrastruktur',
  6: 'Sistem Perusahaan',
  7: 'Teknologi Informasi',
  8: 'Sistem Informasi & Aplikasi',
  9: 'Kepribadian & Keterampilan Berkarya',
};

function unescapeJsString(raw, quote) {
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch !== '\\') {
      out += ch;
      continue;
    }
    i += 1;
    if (i >= raw.length) break;
    const esc = raw[i];
    switch (esc) {
      case '\\':
        out += '\\';
        break;
      case "'":
        out += "'";
        break;
      case '"':
        out += '"';
        break;
      case 'n':
        out += '\n';
        break;
      case 'r':
        out += '\r';
        break;
      case 't':
        out += '\t';
        break;
      case 'b':
        out += '\b';
        break;
      case 'f':
        out += '\f';
        break;
      case 'v':
        out += '\v';
        break;
      case '0':
        out += '\0';
        break;
      case 'x': {
        const hex = raw.slice(i + 1, i + 3);
        if (/^[0-9a-fA-F]{2}$/.test(hex)) {
          out += String.fromCharCode(parseInt(hex, 16));
          i += 2;
        } else {
          out += 'x';
        }
        break;
      }
      case 'u': {
        if (raw[i + 1] === '{') {
          const endBrace = raw.indexOf('}', i + 2);
          if (endBrace !== -1) {
            const hex = raw.slice(i + 2, endBrace);
            out += String.fromCodePoint(parseInt(hex, 16));
            i = endBrace;
            break;
          }
        }
        const hex = raw.slice(i + 1, i + 5);
        if (/^[0-9a-fA-F]{4}$/.test(hex)) {
          out += String.fromCharCode(parseInt(hex, 16));
          i += 4;
        } else {
          out += 'u';
        }
        break;
      }
      default:
        out += esc === quote ? quote : esc;
        break;
    }
  }
  return out;
}

function readJsQuotedLiteral(source, startIndex) {
  const quote = source[startIndex];
  if (quote !== "'" && quote !== '"') {
    throw new Error(`Expected string literal at offset ${startIndex}, found ${quote}`);
  }
  let i = startIndex + 1;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '\\') {
      i += 2;
      continue;
    }
    if (ch === quote) {
      const raw = source.slice(startIndex + 1, i);
      return { value: unescapeJsString(raw, quote), endIndex: i + 1 };
    }
    i += 1;
  }
  throw new Error(`Unterminated string literal at offset ${startIndex}`);
}

function decodeCipherJsonAt(source, jsonParseOffset) {
  const openParen = source.indexOf('(', jsonParseOffset);
  if (openParen === -1) throw new Error('Missing JSON.parse(');

  let pos = openParen + 1;
  while (pos < source.length && /\s/.test(source[pos])) pos += 1;
  const payload = readJsQuotedLiteral(source, pos);

  const replaceIdx = source.indexOf('.replace(', payload.endIndex);
  if (replaceIdx === -1 || replaceIdx - payload.endIndex > 20) {
    throw new Error('Missing .replace() cipher call after JSON.parse payload');
  }

  const arrowIdx = source.indexOf('=>', replaceIdx);
  if (arrowIdx === -1 || arrowIdx - replaceIdx > 80) {
    throw new Error('Missing arrow function in cipher decoder');
  }

  let alphaPos = arrowIdx + 2;
  while (alphaPos < source.length && /[\s(]/.test(source[alphaPos])) alphaPos += 1;
  const alphabet = readJsQuotedLiteral(source, alphaPos);
  if (alphabet.value.length !== 95) {
    throw new Error(`Unexpected substitution alphabet length: ${alphabet.value.length}`);
  }

  const decoded = payload.value.replace(/[ -~]/g, (ch) => alphabet.value[ch.charCodeAt(0) - 32]);
  return JSON.parse(decoded);
}

function extractDatasetFromPageJs(pageJs, varName) {
  const regex = new RegExp(`(?:var|let|const|,)\\s*${varName}\\s*=\\s*JSON\\.parse\\(`);
  const match = regex.exec(pageJs);
  if (!match) {
    throw new Error(`Could not locate dataset variable "${varName}" in page bundle`);
  }
  const parseIdx = pageJs.indexOf('JSON.parse(', match.index);
  return decodeCipherJsonAt(pageJs, parseIdx);
}

function extractDetailChunkIds(pageJs) {
  const jBlockMatch = pageJs.match(/\{CS:\(\)=>[a-zA-Z0-9_$]+\.e\((\d+)\)[^}]+\}/);
  if (!jBlockMatch) {
    throw new Error('Could not locate detail chunk map in page bundle');
  }
  const block = jBlockMatch[0];
  const result = {};
  for (const match of block.matchAll(/([A-Z_]+):\(\)=>[a-zA-Z0-9_$]+\.e\((\d+)\)/g)) {
    result[match[1]] = match[2];
  }
  return result;
}

function extractChunkHashes(webpackJs) {
  const mapMatch = webpackJs.match(/\{(?:\d+:"[a-f0-9]+",?)+\}/);
  if (!mapMatch) {
    throw new Error('Could not locate webpack chunk hash map');
  }
  const hashes = {};
  for (const match of mapMatch[0].matchAll(/(\d+):"([a-f0-9]+)"/g)) {
    hashes[match[1]] = match[2];
  }
  return hashes;
}

function assignSemester(course, prodi) {
  if (course.state === 'Pilihan' || course.state === 'Elective') {
    return 'Pilihan';
  }

  const code = course.code;
  if (prodi === 'AI') {
    if (['CSAM601011', 'CSAM601010', 'CSAM601012', 'CSGE601020', 'UIGE600004', 'UIGE600003'].includes(code)) return 1;
    if (['UIGE600007', 'CSAM601014', 'CSGE602040', 'CSAM601022', 'CSGE601021'].includes(code)) return 2;
    if (['CSAM602013', 'CSAM602131', 'CSAM602130', 'CSAM602150', 'CSGE602070'].includes(code)) return 3;
    if (['CSAM602241', 'CSAM602233', 'CSAM602232', 'CSAM602251', 'CSAM602271'].includes(code)) return 4;
    if (['CSGE603091', 'CSAM603090', 'CSAM603134', 'CSAM603135', 'CSAM603152'].includes(code)) return 5;
    if (['CSAM603223'].includes(code)) return 6;
    if (['CSGE604097', 'CSGE614093'].includes(code)) return 7;
    if (['CSGE604099', 'CSGE604098'].includes(code)) return 8;
    return 'Pilihan';
  }

  if (prodi === 'CS_KKI') {
    if (['CSGE601012', 'CSGE601010', 'CSGE602012', 'CSGE601020', 'CSCM601150'].includes(code)) return 1;
    if (['CSCM601213', 'CSGE601011', 'CSGE601021', 'CSGE602040', 'CSCM601252'].includes(code)) return 2;
    if (['CSGE602022', 'CSCM602241', 'CSCM602013', 'CSGE602070', 'CSCM602055'].includes(code)) return 3;
    if (['CSCM603142', 'CSCM602223', 'CSCM603125', 'CSCM603154', 'CSGE603130'].includes(code)) return 4;
    if (['CSGE602024', 'CSGE603091', 'CSCM603117', 'CSCM603228', 'CSGE614093'].includes(code)) return 5;
    return 'Pilihan';
  }

  const name = course.name.toLowerCase().trim();
  if (prodi === 'CS') {
    if ((name.includes('mpk') && name.includes('agama')) || (name.includes('mpk') && name.includes('inggris')) || name.includes('kalkulus 1') || name.includes('matematika diskret 1') || name.includes('dasar-dasar pemrograman 1') || name.includes('sistem digital')) return 1;
    if ((name.includes('mpk') && name.includes('terintegrasi')) || name.includes('matematika diskret 2') || name.includes('dasar-dasar pemrograman 2') || name.includes('organisasi komputer') || name.includes('pengantar organisasi komputer') || name.includes('kalkulus 2')) return 2;
    if (name.includes('pemrograman berbasis platform') || name.includes('struktur data') || name.includes('aljabar linier') || name.includes('aljabar linear') || name.includes('sistem operasi') || name.includes('statistika & probabilitas') || name.includes('statistika dan probabilitas')) return 3;
    if (name.includes('basis data') || name.includes('sistem interaksi') || name.includes('keamanan perangkat lunak') || name.includes('pengantar keamanan perangkat lunak') || name.includes('bahasa & automata') || name.includes('bahasa dan automata') || name.includes('pemrograman lanjut')) return 4;
    if (name.includes('sains data dasar') || name.includes('kecerdasan artifisial') || name.includes('jaringan komputer') || name.includes('analisis numerik') || name.includes('desain & analisis algoritma') || name.includes('desain dan analisis algoritma') || name.includes('rekayasa perangkat lunak')) return 5;
    if (name.includes('metodologi penelitian') || name.includes('proyek perangkat lunak')) return 6;
    if (name.includes('komputer & masyarakat') || name.includes('komputer dan masyarakat') || name.includes('kerja praktik')) return 7;
    if (name.includes('tugas akhir') || name.includes('individu') || name.includes('kelompok')) return 8;
    return 'Pilihan';
  }

  if ((name.includes('mpk') && name.includes('agama')) || (name.includes('mpk') && name.includes('inggris')) || name.includes('kalkulus') || name.includes('matematika diskret 1') || name.includes('dasar-dasar pemrograman 1') || name.includes('manajemen bisnis') || name.includes('komunikasi bisnis')) return 1;
  if ((name.includes('mpk') && name.includes('terintegrasi')) || name.includes('mpkt') || name.includes('terintegrasi') || name.includes('dasar-dasar pemrograman 2') || name.includes('matematika diskret 2') || name.includes('arsitektur komputer') || name.includes('dasar-dasar arsitektur komputer') || name.includes('prinsip-prinsip sistem informasi') || name.includes('prinsip sistem informasi')) return 2;
  if (name.includes('pemrograman berbasis platform') || name.includes('struktur data') || name.includes('aljabar linier') || name.includes('aljabar linear') || name.includes('sistem operasi') || name.includes('pengantar sistem operasi') || name.includes('statistika') || name.includes('stat') || name.includes('pengantar statistika')) return 3;
  if (name.includes('keamanan perangkat lunak') || name.includes('pengantar keamanan perangkat lunak') || name.includes('sistem interaksi') || name.includes('basis data') || name.includes('perusahaan dan akuntansi') || name.includes('sipa') || name.includes('manajemen proyek')) return 4;
  if (name.includes('pemrograman aplikasi perusahaan') || name.includes('apap') || name.includes('analisis dan perancangan') || name.includes('manajemen sistem informasi') || name.includes('jaringan komunikasi')) return 5;
  if (name.includes('proyek pengembangan') || name.includes('propensi') || name.includes('metodologi penelitian') || name.includes('sains data dasar') || name.includes('kecerdasan artifisial')) return 6;
  if (name.includes('komputer dan masyarakat') || name.includes('komputer & masyarakat') || name.includes('kerja praktik')) return 7;
  if (name.includes('tugas akhir') || name.includes('penelitian') || name.includes('kelompok')) return 8;
  return 'Pilihan';
}

function getElectiveTrack(code) {
  if (typeof code !== 'string' || code.length !== 10) return 'Lainnya';
  return TRACK_MAP[code.charAt(8)] ?? 'Lainnya';
}

function dedupe(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }
  return res.text();
}

async function main() {
  if (!existsSync(ACADEMIC_FILE)) {
    throw new Error(`Existing ${ACADEMIC_FILE} not found`);
  }
  const existingPrograms = JSON.parse(readFileSync(ACADEMIC_FILE, 'utf-8'));
  const existingById = new Map(existingPrograms.map((p) => [p.id, p]));

  console.log(`Fetching ${BASE_URL}/?prodi=CS ...`);
  const html = await fetchText(`${BASE_URL}/?prodi=CS`);
  const scripts = [...html.matchAll(/\/_next\/static\/chunks\/[^"'\s]+\.js/g)].map((m) => m[0]);

  const pagePath = scripts.find((s) => /\/chunks\/app\/page-/.test(s));
  const webpackPath = scripts.find((s) => /\/chunks\/webpack-/.test(s));
  if (!pagePath || !webpackPath) {
    throw new Error('Could not locate CourseViz page or webpack bundle scripts');
  }

  const [pageJs, webpackJs] = await Promise.all([
    fetchText(`${BASE_URL}${pagePath}`),
    fetchText(`${BASE_URL}${webpackPath}`),
  ]);

  const detailChunkIds = extractDetailChunkIds(pageJs);
  const chunkHashes = extractChunkHashes(webpackJs);

  const outputPrograms = [];
  const summary = [];

  for (const cfg of PRODI_CONFIG) {
    const baseProgram = existingById.get(cfg.programId);
    if (!baseProgram) {
      throw new Error(`Program "${cfg.programId}" missing from existing academic.json`);
    }

    const dataset = extractDatasetFromPageJs(pageJs, cfg.varName);
    const chunkId = detailChunkIds[cfg.key];
    const chunkHash = chunkHashes[chunkId];
    if (!chunkId || !chunkHash) {
      throw new Error(`Missing detail chunk metadata for ${cfg.key} (chunkId=${chunkId})`);
    }
    const detailJs = await fetchText(`${BASE_URL}/_next/static/chunks/${chunkId}.${chunkHash}.js`);
    const detailParseIdx = detailJs.indexOf('JSON.parse(');
    if (detailParseIdx === -1) {
      throw new Error(`Missing JSON.parse in detail chunk ${chunkId}.${chunkHash}.js`);
    }
    const details = decodeCipherJsonAt(detailJs, detailParseIdx);

    const courseList = Object.values(dataset);

    // Build reverse unlocks map from course-to-course prerequisites
    const unlocksMap = new Map();
    for (const raw of courseList) {
      unlocksMap.set(raw.code, []);
    }
    for (const raw of courseList) {
      for (const req of raw.prerequisites ?? []) {
        if (dataset[req]) {
          unlocksMap.get(req)?.push(raw.name.trim().replace(/\s+/g, ' '));
        }
      }
    }

    const semesterBuckets = new Map();
    let missingDescCount = 0;
    let totalUnlocksCount = 0;
    const states = new Set();

    for (const raw of courseList) {
      const code = String(raw.code ?? '').trim();
      const name = String(raw.name ?? '').trim().replace(/\s+/g, ' ');
      const sks = Number(raw.credits);
      if (!Number.isInteger(sks) || sks < 1 || sks > 6) {
        throw new Error(`Invalid SKS (${raw.credits}) on ${cfg.key} ${code} ${name}`);
      }

      const semKey = assignSemester(raw, cfg.key);
      const category = raw.state ? String(raw.state).trim() : undefined;
      if (category) states.add(category);

      const track = semKey === 'Pilihan' ? getElectiveTrack(code) : undefined;
      const detail = details[code];
      const description = detail?.description ? String(detail.description).trim() : '';
      if (!description) missingDescCount += 1;

      const prerequisites = dedupe(
        (raw.prerequisites ?? []).map((req) => (dataset[req] ? dataset[req].name.replace(/\s+/g, ' ') : String(req))),
      );
      const unlocks = dedupe(unlocksMap.get(code) ?? []);
      if (unlocks.length > 0) totalUnlocksCount += 1;

      const mapped = {
        name,
        code,
        sks,
        ...(category ? { category } : {}),
        ...(track ? { track } : {}),
        description,
        prerequisites,
        unlocks,
        materialUrl: '',
      };

      const bucket = semesterBuckets.get(semKey) ?? [];
      bucket.push(mapped);
      semesterBuckets.set(semKey, bucket);
    }

    const semesters = [];
    for (let semNum = 1; semNum <= 8; semNum++) {
      const bucket = semesterBuckets.get(semNum);
      if (bucket && bucket.length > 0) {
        semesters.push({ semester: semNum, courses: bucket });
      }
    }

    const pilihanCourses = semesterBuckets.get('Pilihan') ?? [];
    if (pilihanCourses.length > 0) {
      pilihanCourses.sort((a, b) => a.name.localeCompare(b.name, 'id'));
      semesters.push({ semester: 'Pilihan', courses: pilihanCourses });
    }

    outputPrograms.push({
      id: baseProgram.id,
      name: baseProgram.name,
      slug: baseProgram.slug,
      description: baseProgram.description,
      careers: baseProgram.careers,
      courseMapUrl: `${BASE_URL}/?prodi=${cfg.key}`,
      driveUrl: baseProgram.driveUrl,
      semesters,
    });

    summary.push({
      program: baseProgram.id,
      prodiKey: cfg.key,
      totalCourses: courseList.length,
      mandatoryCourses: courseList.length - pilihanCourses.length,
      electiveCourses: pilihanCourses.length,
      semesters: semesters.map((s) => `${s.semester}:${s.courses.length}`).join(', '),
      missingDescriptions: missingDescCount,
      coursesWithUnlocks: totalUnlocksCount,
      categories: [...states].join(', '),
    });
  }

  writeFileSync(ACADEMIC_FILE, `${JSON.stringify(outputPrograms, null, 2)}\n`, 'utf-8');
  console.log(`\nUpdated ${ACADEMIC_FILE}`);
  console.table(summary);
}

main().catch((err) => {
  console.error('Scrape failed:', err);
  process.exit(1);
});
