import type { Metadata } from 'next';
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

export const metadata: Metadata = {
  title: '한냥 LocalSpace — 공공데이터·실매물 연계 창업 공간 비교 AI 플랫폼',
  description:
    '한냥(Hannyang) 시리즈 · 공공 상권·인구 통계와 실제 매물 조건, 현장 임장 메모를 한 화면에서 객관적으로 대조하고 임대인 확인 질문을 정리하는 예비 창업자 맞춤형 공간 비교 플랫폼',
  openGraph: {
    title: '한냥 LocalSpace — 창업 공간 비교 AI 플랫폼',
    description:
      '공공 상권·거주인구 데이터와 실매물 조건·현장 메모를 연결한 객관적 공간 비교 검증 대시보드',
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
