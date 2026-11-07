import { NextRequest, NextResponse } from 'next/server';
export const runtime='nodejs';
export async function POST(req:NextRequest){
 if(!process.env.APP_ACCESS_KEY)return NextResponse.json({ok:false,error:'Configure APP_ACCESS_KEY na Vercel.'},{status:503});
 let senha:unknown;
 try{senha=(await req.json()).senha;}catch{return NextResponse.json({ok:false,error:'Requisição inválida.'},{status:400});}
 if(typeof senha!=='string'||senha!==process.env.APP_ACCESS_KEY)return NextResponse.json({ok:false,error:'Senha de acesso incorreta.'},{status:401,headers:{'Cache-Control':'no-store'}});
 return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
}
