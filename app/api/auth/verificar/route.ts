import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  const expected = process.env.APP_ACCESS_KEY;
  if (!expected) return NextResponse.json({ error: 'Configure APP_ACCESS_KEY na Vercel.' }, { status: 503 });
  const supplied = request.headers.get('x-app-access-key') || '';
  const a = Buffer.from(supplied, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  const valid = a.length === b.length && timingSafeEqual(a, b);
  if (!valid) return NextResponse.json({ error: 'Senha de acesso incorreta.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  return NextResponse.json({ autorizado: true }, { headers: { 'Cache-Control': 'no-store' } });
}
