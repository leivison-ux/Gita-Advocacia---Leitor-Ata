import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gitaí | Leitor de Atas Trabalhistas',
  description: 'Análise de atas trabalhistas com prazos, perícias, audiências e agendamentos.'
};

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
