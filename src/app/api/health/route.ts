import { NextResponse } from 'next/server';
import {
  getDataSourceMeta,
  loadCommercialData,
  loadPopulationData,
} from '@/lib/dataLoader';

function isConfigured(val: string | undefined, placeholderPrefix?: string): boolean {
  const trimmed = (val || '').trim();
  if (!trimmed) return false;
  if (placeholderPrefix && trimmed.startsWith(placeholderPrefix)) return false;
  return true;
}

export async function GET() {
  const stores = loadCommercialData();
  const populations = loadPopulationData();
  const meta = getDataSourceMeta(stores, populations);

  const geminiConfigured = isConfigured(
    process.env.GEMINI_API_KEY,
    'AQ.replace_with_'
  );
  const semasApiConfigured = isConfigured(
    process.env.DATA_GO_KR_API_KEY,
    'your_'
  );
  const kakaoApiConfigured = isConfigured(
    process.env.KAKAO_REST_API_KEY,
    'your_'
  );

  return NextResponse.json({
    status: 'ok',
    service: '한냥 LocalSpace (Hannyang LocalSpace)',
    timestamp: new Date().toISOString(),
    apis: {
      gemini: {
        configured: geminiConfigured,
        mode: geminiConfigured ? 'LIVE GEMINI AI' : 'SAFE FALLBACK',
        model: (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim(),
        authMethod: 'x-goog-api-key HTTP header (2026 AQ. key compatible)',
      },
      commercialOpenApi: {
        configured: semasApiConfigured,
        mode: semasApiConfigured ? 'LIVE DATA.GO.KR API' : 'LOCAL CSV INDEX',
      },
      geocodeApi: {
        configured: kakaoApiConfigured,
        mode: kakaoApiConfigured ? 'KAKAO LOCAL API' : 'OSM + BUILT-IN GEOCODER',
      },
    },
    dataset: meta,
  });
}
