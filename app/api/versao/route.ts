import {NextResponse} from 'next/server';
export function GET(){return NextResponse.json({versao:'5.0.0-dropzone-login',arquitetura:'extração JSON + cálculo determinístico + reconciliação pericial',modeloPadrao:process.env.OPENAI_MODEL||'gpt-6.1-sol'},{headers:{'Cache-Control':'no-store'}})}
