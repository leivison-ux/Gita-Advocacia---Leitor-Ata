import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import {EXTRACTION_PROMPT} from '../../../lib/extraction-prompt';
import {Analysis,Act,parseISO} from '../../../lib/calendar';
import {renderReport} from '../../../lib/report';
import {reconcilePericia} from '../../../lib/pericia';
export const runtime='nodejs';
export const maxDuration=60;
const MAX_BYTES=12*1024*1024;
function err(message:string,code=400){return NextResponse.json({error:message},{status:code});}
const categories=new Set(['1','4','6','7','8','9','OUTROS','ACORDO','AUDIENCIA','JULGAMENTO']);
const rules=new Set(['fixed','business_after_hearing','business_from_date','calendar_after_hearing','calendar_from_date','hours_after_hearing','after_previous','future_notice','none']);
function validate(raw:unknown):Analysis{
 if(typeof raw!=='object'||raw===null)throw Error('IA devolveu JSON não estruturado');const x=raw as Record<string,unknown>;
 if(typeof x.audiencia!=='string')throw Error('Data da audiência não identificada');parseISO(x.audiencia);
 if(!Array.isArray(x.atos)||x.atos.length>65)throw Error('Lista de atos inválida');
 const acts:Act[]=x.atos.map((v,index)=>{if(typeof v!=='object'||v===null)throw Error(`Ato ${index+1} inválido`);const o=v as Record<string,unknown>;
 if(!categories.has(String(o.category))||!rules.has(String(o.rule)))throw Error(`Categoria/regra inválida no ato ${index+1}`);
 if(!Array.isArray(o.quotes)||o.quotes.some(q=>typeof q!=='string')||o.quotes.length===0)throw Error(`Citação ausente no ato ${index+1}`);
 const fixed=typeof o.fixed_date==='string'?o.fixed_date:null;const start=typeof o.start_date==='string'?o.start_date:null;if(fixed)parseISO(fixed);if(start)parseISO(start);
 const days=typeof o.days==='number'?o.days:null;if(days!==null&&(!Number.isInteger(days)||days<1||days>1500))throw Error(`Prazo inválido no ato ${index+1}`);
 const prev=Number.isInteger(o.after_index)?Number(o.after_index):null;if(prev!==null&&(prev<0||prev>=index))throw Error('Prazo sucessivo sem antecedente válido');
 return {category:o.category as Act['category'],title:String(o.title||'Providência'),quotes:o.quotes as string[],applies_to_client:o.applies_to_client===true,rule:o.rule as Act['rule'],days,start_date:start,fixed_date:fixed,after_index:prev,optional:o.optional===true,event_description:typeof o.event_description==='string'?o.event_description:null};});
 return {processo:String(x.processo||''),reclamante:String(x.reclamante||''),cliente:String(x.cliente||''),posicao:String(x.posicao||''),outras_partes:String(x.outras_partes||''),orgao:String(x.orgao||''),audiencia:x.audiencia,resultado:String(x.resultado||''),atos:acts,observations:Array.isArray(x.observations)?x.observations.filter((s):s is string=>typeof s==='string').slice(0,15):[]};
}
export async function POST(req:NextRequest){
 if(!process.env.APP_ACCESS_KEY)return err('Configure APP_ACCESS_KEY na Vercel.',503);
 if(req.headers.get('x-app-access-key')!==process.env.APP_ACCESS_KEY)return err('Senha de acesso incorreta.',401);
 if(!process.env.OPENAI_API_KEY)return err('Configure OPENAI_API_KEY na Vercel.',503);
 const len=Number(req.headers.get('content-length')||0);if(len>MAX_BYTES+100000)return err('PDF acima de 12 MB.',413);
 try{const form=await req.formData();const pasted=String(form.get('texto')||'').trim();const f=form.get('arquivo');let ata='';
 if(f instanceof File&&f.size){if(f.size>MAX_BYTES)return err('PDF acima de 12 MB.',413);if(!f.name.toLowerCase().endsWith('.pdf'))return err('Envie somente arquivos PDF.');const b=Buffer.from(await f.arrayBuffer());if(b.subarray(0,5).toString()!=='%PDF-')return err('PDF inválido.');const parser=(await import('pdf-parse')).default;const parsed=await parser(b);ata=String(parsed.text||'').trim();if(ata.length<120&&!pasted)return err('PDF sem texto selecionável; cole o texto ou faça OCR.');}
 if(pasted)ata=ata?`${ata}\n\nTEXTO COMPLEMENTAR:\n${pasted}`:pasted;
 if(ata.length<80)return err('Inclua uma ata com pelo menos 80 caracteres.');if(ata.length>100000)return err('Envie uma ata por vez (máximo 100 mil caracteres).',413);
 const model=process.env.OPENAI_MODEL||'gpt-6.1-sol';const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY,timeout:52000,maxRetries:0});
 const response=await client.responses.create({model,instructions:EXTRACTION_PROMPT,input:[{role:'user',content:`Responda exclusivamente em formato JSON válido, conforme as instruções. EXTRAIA OS DADOS DA ATA ABAIXO, SEM CALCULAR DATAS:\n${ata}`}],max_output_tokens:8500,store:false,text:{format:{type:'json_object'}}});
 const result=response.output_text?.trim();if(!result)return err('A IA não retornou dados. Verifique limite de tokens e logs.',502);
 let parsed:unknown;try{parsed=JSON.parse(result);}catch{console.error('analisar: JSON inválido ou truncado');return err('A IA retornou dados incompletos. Refaça a análise ou altere o modelo.',502);}
 const analysis=validate(parsed);const auditoria=reconcilePericia(analysis,ata);if(auditoria.detected&&auditoria.added.length===0&&!analysis.atos.some(a=>a.category==='6'))return err('A perícia foi identificada, mas não foi possível validar a ordem no texto do PDF.',422);const report=renderReport(analysis);
 return NextResponse.json({...report,versao:'4.0.0-estruturado',auditoriaPericia:auditoria,modelo:model,usage:response.usage,avisos:[...report.avisos,'Atenção: conferir prazos e suspensões locais no PJe.']},{headers:{'Cache-Control':'no-store'}});
 }catch(e){const message=e instanceof Error?e.message:'Erro desconhecido';console.error('analisar:',message);
 if(/model_not_found|does not exist|access to model|unsupported model/i.test(message))return err('Modelo indisponível. Configure OPENAI_MODEL para um modelo habilitado.',422);
 if(/insufficient_quota|quota/i.test(message))return err('Sem crédito ou cota disponível na API.',429);
 if(/invalid_api_key|Incorrect API key|401/i.test(message))return err('OPENAI_API_KEY inválida.',401);
 if(/pdf|password protected|invalid pdf/i.test(message))return err('Falha ao extrair texto do PDF.',422);
 if(/Data inválida|Data impossível|Lista de atos|Ato |Categoria\/regra|Citação ausente|Prazo inválido|IA devolveu/i.test(message))return err(`Análise não validada: ${message}`,422);
 return err(`Falha na análise: ${message.slice(0,180)}`,500);
 }
}
