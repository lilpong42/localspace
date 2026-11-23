import fs from 'node:fs';
import path from 'node:path';
import {
  BUSINESS_CATEGORIES,
  type BusinessCategory,
  type DataSourceMeta,
  type PopulationRecord,
  type StoreRecord,
} from './types';

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeCategory(raw: string): BusinessCategory {
  if ((BUSINESS_CATEGORIES as readonly string[]).includes(raw)) {
    return raw as BusinessCategory;
  }
  if (raw.includes('카페') || raw.includes('커피') || raw.includes('비알코올')) return '카페';
  if (raw.includes('음식') || raw.includes('한식') || raw.includes('식당')) return '소형 음식점';
  if (raw.includes('소매') || raw.includes('편의점') || raw.includes('마트')) return '소매점';
  if (raw.includes('교육') || raw.includes('학원')) return '교육·학원';
  if (raw.includes('의료') || raw.includes('의원') || raw.includes('약국')) return '의료·건강';
  return '생활서비스';
}

export function loadCommercialData(): StoreRecord[] {
  const filePath = path.join(process.cwd(), 'data', 'commercial_sample.csv');
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '').trim();
  const lines = raw.split(/\r?\n/);
  if (lines.length < 2) return [];

  const records: StoreRecord[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = parseCsvLine(line);
    if (cols.length < 13) continue;

    const lng = Number.parseFloat(cols[11]);
    const lat = Number.parseFloat(cols[12]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    records.push({
      id: cols[0],
      name: cols[1],
      largeCategory: cols[2],
      midCategory: cols[3],
      smallCategory: cols[4],
      standardCategory: normalizeCategory(cols[5] || cols[4] || cols[2]),
      ksicName: cols[6],
      sido: cols[7],
      sigungu: cols[8],
      adminDong: cols[9],
      roadAddress: cols[10],
      lng,
      lat,
    });
  }
  return records;
}

export function loadPopulationData(): PopulationRecord[] {
  const filePath = path.join(process.cwd(), 'data', 'population_sample.csv');
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '').trim();
  const lines = raw.split(/\r?\n/);
  if (lines.length < 2) return [];

  const records: PopulationRecord[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = parseCsvLine(line);
    if (cols.length < 15) continue;

    const sido = cols[1];
    const sigungu = cols[2];
    const adminDong = cols[3];

    records.push({
      adminCode: cols[0],
      sido,
      sigungu,
      adminDong,
      key: `${sido} ${sigungu} ${adminDong}`,
      referenceDate: cols[4],
      totalPopulation: Number.parseInt(cols[5], 10) || 0,
      households: Number.parseInt(cols[6], 10) || 0,
      age20Count: Number.parseInt(cols[7], 10) || 0,
      age30Count: Number.parseInt(cols[8], 10) || 0,
      age40Count: Number.parseInt(cols[9], 10) || 0,
      age50PlusCount: Number.parseInt(cols[10], 10) || 0,
      age20Pct: Number.parseFloat(cols[11]) || 0,
      age30Pct: Number.parseFloat(cols[12]) || 0,
      age40Pct: Number.parseFloat(cols[13]) || 0,
      age50PlusPct: Number.parseFloat(cols[14]) || 0,
    });
  }
  return records;
}

export function loadVerificationArtifacts(): {
  rScript: string;
  dataCsv: string;
} {
  const rPath = path.join(process.cwd(), 'public', 'analysis.R');
  const csvPath = path.join(process.cwd(), 'public', 'data.csv');
  return {
    rScript: fs.existsSync(rPath) ? fs.readFileSync(rPath, 'utf8') : '',
    dataCsv: fs.existsSync(csvPath) ? fs.readFileSync(csvPath, 'utf8') : '',
  };
}

export function getDataSourceMeta(
  stores: StoreRecord[],
  populations: PopulationRecord[]
): DataSourceMeta {
  return {
    commercialSource: '소상공인시장진흥공단 상가(상권)정보 CSV 구조 (샘플 인덱스)',
    commercialReferenceDate: '2026-06 기준',
    populationSource: '행정안전부 주민등록인구·연령별 인구 자료 구조',
    populationReferenceDate: populations[0]?.referenceDate
      ? `${populations[0].referenceDate} 기준`
      : '2026-06 기준',
    totalCommercialRows: stores.length,
    totalAdminDongs: populations.length,
  };
}
