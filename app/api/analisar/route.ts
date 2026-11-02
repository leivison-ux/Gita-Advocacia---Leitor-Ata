import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { SYSTEM_PROMPT } from '../../../lib/prompt';
export const runtime = 'nodejs';
export const maxDuration = 60;
const MAX_BYTES = 12 * 1024 * 1024;
function err(message:string,code=400){return NextResponse.json({error:message},{status:code});}
export async function POST(req:NextRequest){
 if(!process.env.APP_ACCESS_KEY) return err('Configure APP_ACCESS_KEY na Vercel.',503);
 if(req.headers.get('x-app-access-key')!==process.env.APP_ACCESS_KEY) return err('Senha de acesso incorreta.',401);
 if(!process.env.OPENAI_API_KEY) return err('Configure OPENAI_API_KEY na Vercel.',503);
 const len=Number(req.headers.get('content-length')||'0');if(len>MAX_BYTES+100000) return err('Arquivo acima de 12 MB.',413);
 let ata='';
 try{const form=await req.formData();const pasted=String(form.get('texto')||'').trim();const f=form.get('arquivo');
 if(f instanceof File && f.size){if(f.size>MAX_BYTES)return err('PDF acima de 12 MB.',413);if(!f.name.toLowerCase().endsWith('.pdf'))return err('Envie somente arquivos PDF.',400);const b=Buffer.from(await f.arrayBuffer());if(b.subarray(0,5).toString()!=='%PDF-')return err('Arquivo não é um PDF válido.');
 // pdf-parse v1 é importado dinamicamente para evitar execução no build.
 const pdfParser = (await import('pdf-parse')).default;
 const parsed = await pdfParser(b,{max:0});ata=String(parsed.text||'').trim();
 if(ata.length<120 && !pasted)return err('PDF sem texto extraível. Utilize OCR antes do envio ou cole o texto da ata.');
 }
 if(pasted)ata=ata?`${ata}\n\nTEXTO COMPLEMENTAR FORNECIDO PELO USUÁRIO:\n${pasted}`:pasted;
 if(ata.length<80)return err('Inclua uma ata com pelo menos 80 caracteres.');
 if(ata.length>100000)return err('Texto muito extenso: limite de 100.000 caracteres (envie uma ata por vez).',413);
 const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY,timeout:52000,maxRetries:1});
 const model=process.env.OPENAI_MODEL||'gpt-6-luna';
 const response=await client.responses.create({model,instructions:SYSTEM_PROMPT,input:[{role:'user',content:`Analise apenas a ata abaixo, registrando todas as obrigações aplicáveis às empresas clientes. Data atual (referência): ${new Date().toISOString().slice(0,10)}.\n\nINÍCIO DO DOCUMENTO:\n${ata}\nFIM DO DOCUMENTO.`}],max_output_tokens:4200,store:false});
 const resultado=response.output_text?.trim();if(!resultado)return err('A IA não retornou relatório. Tente novamente ou aumente max_output_tokens.',502);
 return NextResponse.json({resultado,modelo:model,usage:response.usage,avisos:['Prazos calculados automaticamente devem ser conferidos no PJe e no calendário oficial do TRT.','PDFs digitalizados sem camada de texto precisam de OCR antes do envio.']},{headers:{'Cache-Control':'no-store'}});
 }catch(e){const message=e instanceof Error?e.message:'Erro desconhecido';console.error('analisar:',message);if(/pdf|password|invalid/i.test(message))return err('Não foi possível ler o PDF. Verifique se está protegido ou digitalizado.');if(/model_not_found|does not exist|access to model/i.test(message))return err('Modelo indisponível nesta conta. Configure OPENAI_MODEL para um modelo habilitado, como gpt-5-mini.',422);if(/insufficient_quota|quota/i.test(message))return err('Sem saldo/cota disponível na API OpenAI.',429);return err('Falha na análise. Confira a chave da API, modelo e logs da Vercel.',500);}
}
