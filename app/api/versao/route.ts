import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  return NextResponse.json({aplicacao:'Gitaí Leitor de Atas',versao:'3.0.0-estrutura-validada',modelo:process.env.OPENAI_MODEL || 'gpt-6.1-sol',validacaoPericial:true},{headers:{'Cache-Control':'no-store, max-age=0'}});
}
