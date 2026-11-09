import {Analysis, Act, parseISO} from './calendar';

const categories=new Set(['1','4','6','7','8','9','OUTROS','ACORDO','AUDIENCIA','JULGAMENTO']);
const rules=new Set(['fixed','business_after_hearing','business_from_date','calendar_after_hearing','calendar_from_date','hours_after_hearing','after_previous','future_notice','none']);

/**
 * Valida os dados extraídos sem bloquear toda uma ata por ausência de citação
 * em um registro descritivo. Nunca cria uma citação nem substitui texto legal.
 * Atos materiais sem fundamentação textual são desconsiderados com aviso
 * explícito, em vez de serem tratados como prazos comprovados.
 */
export function validateExtracted(raw:unknown, _source:string):{analysis:Analysis;warnings:string[]}{
 if(typeof raw!=='object'||raw===null)throw Error('IA devolveu JSON não estruturado');
 const x=raw as Record<string,unknown>;
 if(typeof x.audiencia!=='string')throw Error('Data da audiência não identificada');
 parseISO(x.audiencia);
 if(!Array.isArray(x.atos)||x.atos.length>65)throw Error('Lista de atos inválida');
 const warnings:string[]=[];
 const acts:Act[]=[];
 const oldToNew=new Map<number,number>();
 x.atos.forEach((v,index)=>{
  if(typeof v!=='object'||v===null){warnings.push(`Ato ${index+1} não estruturado: revisar PDF.`);return;}
  const o=v as Record<string,unknown>;
  if(!categories.has(String(o.category))||!rules.has(String(o.rule))){warnings.push(`Categoria ou regra inválida no ato ${index+1}: conferir no PDF.`);return;}
  const category=o.category as Act['category'];
  const quotes=Array.isArray(o.quotes)?o.quotes.filter((q):q is string=>typeof q==='string'&&q.trim().length>0):[];
  if(!quotes.length&&category!=='9'){
    warnings.push(`Ato ${index+1} (${String(o.title||category)}): sem citação literal da ata. Não foi convertido em agendamento; conferir documento original.`);
    return;
  }
  const fixed=typeof o.fixed_date==='string'?o.fixed_date:null;
  const start=typeof o.start_date==='string'?o.start_date:null;
  try{if(fixed)parseISO(fixed);if(start)parseISO(start);}catch{warnings.push(`Ato ${index+1}: data inválida; conferir texto da ata.`);return;}
  const days=typeof o.days==='number'?o.days:null;
  if(days!==null&&(!Number.isInteger(days)||days<1||days>1500)){warnings.push(`Ato ${index+1}: prazo inválido; conferir ata.`);return;}
  const prev=Number.isInteger(o.after_index)?Number(o.after_index):null;
  if(prev!==null&&(prev<0||prev>=index)){warnings.push(`Ato ${index+1}: referência de prazo sucessivo inválida.`);return;}
  if(o.rule==='after_previous'&&prev!==null&&!oldToNew.has(prev)){
    warnings.push(`Ato ${index+1}: antecedente não confirmado; não foi gerado prazo sucessivo.`);return;
  }
  const act:Act={category,title:String(o.title||'Providência'),quotes,applies_to_client:o.applies_to_client===true,
    rule:o.rule as Act['rule'],days,start_date:start,fixed_date:fixed,after_index:prev===null?null:(oldToNew.get(prev)??null),
    optional:o.optional===true,event_description:typeof o.event_description==='string'?o.event_description:null};
  if(category==='9'&&!quotes.length){
    // É observação sobre laudo, não prazo com determinação literal.
    act.rule='none';act.days=null;act.fixed_date=null;act.start_date=null;
    act.event_description='Manifestação sobre o laudo: a ata não fixa prazo para manifestação ou impugnação pelas partes. Acompanhar a juntada do laudo e eventual intimação para abertura de vista.';
  }
  oldToNew.set(index,acts.length);acts.push(act);
 });
 return {analysis:{processo:String(x.processo||''),reclamante:String(x.reclamante||''),cliente:String(x.cliente||''),posicao:String(x.posicao||''),outras_partes:String(x.outras_partes||''),orgao:String(x.orgao||''),audiencia:x.audiencia,resultado:String(x.resultado||''),atos:acts,observations:Array.isArray(x.observations)?x.observations.filter((s):s is string=>typeof s==='string').slice(0,15):[]},warnings};
}
