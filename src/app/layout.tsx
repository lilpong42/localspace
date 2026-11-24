import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono, Noto_Sans_KR } from 'next/font/google';
import './globals.css';

const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sans-kr',
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#0B0F17',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: '한냥 LocalSpace — 창업 공간 비교 AI 앱',
  description:
    '한냥(Hannyang) 시리즈 · 공공 상권·인구 통계와 실제 매물 조건, 현장 임장 메모를 지도와 함께 한눈에 비교하고 임대인 확인 질문을 정리하는 예비 창업자 맞춤형 공간 비교 앱',
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: '한냥 LocalSpace — 창업 공간 비교 AI 앱',
    description:
      '지도 기반 후보 A·B 실시간 비교, 공공 상권·거주인구 대조, 근거 기반 AI 임대인 체크리스트',
    locale: 'ko_KR',
    type: 'website',
  },
  icons: {
    apple: '/icons/icon-192.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${notoSansKr.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#F2F4F8] text-slate-900 selection:bg-amber-100 selection:text-amber-950">
        {children}
      </body>
    </html>
  );
}
