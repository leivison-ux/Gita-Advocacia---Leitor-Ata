import type { Metadata } from 'next';
import './style.css';
export const metadata: Metadata = { title: 'Prazos de Atas Trabalhistas', description: 'Análise de atas e agendamento de prazos para clientes trabalhistas' };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="pt-BR"><body>{children}</body></html>; }
