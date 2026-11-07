import {Analysis,Act} from './calendar';

/** Reconstitui frases extraídas do PDF preservando o conteúdo, sem fabricar prazos. */
export const normalize=(s:string)=>s.replace(/\u00ad/g,'').replace(/[\u200b-\u200d\ufeff]/g,'').replace(/\s+/g,' ').replace(/\s+([,.;:])/g,'$1').trim();
const strip=(s:string)=>normalize(s).replace(/^["“”]+|["“”]+$/g,'').trim();
const cleanPDF=(s:string)=>normalize(s)
 .replace(/(\d{2}\/\d{2})\s*\/\s*(\d{4})/g,'$1/$2')
 .replace(/\baté o diasob pena de preclusão\s*(\d{2}\/\d{2}\/\d{4})/gi,'sob pena de preclusão até o dia $1')
 .replace(/\baté o dia\s+sob pena de preclusão\s*(\d{2}\/\d{2}\/\d{4})/gi,'sob pena de preclusão até o dia $1');
function isoBR(s:string){const m=s.match(/(\d{2})\s*\/\s*(\d{2})\s*\/\s*(\d{4})/);return m?`${m[3]}-${m[2]}-${m[1]}`:null;}
const mk=(category:Act['category'],title:string,quote:string,due:string|null,rule:Act['rule']='fixed'):Act=>({category,title,quotes:[quote],applies_to_client:true,rule:due?rule:'none',days:null,start_date:null,fixed_date:due,after_index:null,optional:false,event_description:null});
const linked=(s:string)=>s.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\d]/gu,'');
function findQuote(source:string,pattern:RegExp){return source.match(pattern)?.[0]?.trim()||null;}
/** Tries an exact excerpt, then a punctuation/whitespace-tolerant match in the source. */
function confirmQuote(source:string,quote:string):string|null{
 const q=strip(quote);if(source.includes(q))return q;
 const needle=linked(q);if(needle.length<18)return null;
 // Compare with windows of nearby original words; never return fabricated text.
 const words=q.split(/\s+/);const anchor=words.slice(0,Math.min(5,words.length)).map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('\\s*');
 try{const matches=[...source.matchAll(new RegExp(anchor,'gi'))].slice(0,10);for(const m of matches){const start=m.index||0;const fragment=source.slice(start,start+q.length+130);for(let width=Math.max(15,q.length-65);width<=Math.min(fragment.length,q.length+100);width+=4){const candidate=fragment.slice(0,width).trim();if(linked(candidate)===needle)return candidate;}}}catch{}
 return null;
}
const applies=(a:Act)=>a.applies_to_client;
const otherDuplicate=(a:Act,acts:Act[])=>a.category==='OUTROS'&&acts.some(x=>x!==a&&x.category!=='OUTROS'&&x.quotes.some(q=>a.quotes.some(p=>{const v=linked(p),w=linked(q);return v.length>18&&w.length>18&&(v===w||v.includes(w)||w.includes(v));}))); 
function upsert(items:Act[],cat:Act['category'],title:string,quote:string,due:string|null,match:(a:Act)=>boolean){
 const item=items.find(a=>a.category===cat&&match(a));
 if(item){item.quotes=[quote];item.title=title;item.applies_to_client=true;if(due){item.rule='fixed';item.fixed_date=due;item.days=null;item.start_date=null;}return;}
 items.push(mk(cat,title,quote,due));
}

export function improveExtraction(a:Analysis,original:string):Analysis{
 const source=cleanPDF(original);
 const acts:Act[]=[];
 const warnings:string[]=[];
 for(const act of a.atos){
  if(act.category==='OUTROS'&&/concilia[cç][aã]o rejeitada|n[aã]o apresenta proposta|inconciliad/i.test(act.title+' '+act.quotes.join(' ')))continue;
  const quotes=act.quotes.map(q=>confirmQuote(source,q)).filter((q):q is string=>!!q);
  if(!quotes.length){warnings.push(`Ato ${act.category} (${act.title}): transcrição não confirmada; conferir o PDF.`);continue;}
  acts.push({...act,quotes});
 }
 // A fonte PDF é a autoridade: esses detectores não dependem do modelo mini.
 // A extração é exigida apenas quando há texto suficiente para atribuir o ato.
 const regular=findQuote(source,/A representação processual poderá ser realizada no prazo de (?:\w+|\d+) dias\./i);
 if(regular){
  const current=acts.find(x=>x.category==='1');
  if(current){current.quotes=[regular];current.applies_to_client=true;}
  else {const n=regular.match(/prazo de (\d+|cinco|dez|quinze|oito) dias/i)?.[1]?.toLowerCase();const days=n==='cinco'?5:n==='dez'?10:n==='quinze'?15:n==='oito'?8:Number(n);if(days>0)acts.push({...mk('1','Regularização processual',regular,null),rule:'business_after_hearing',days});}
 }
 const appointment=findQuote(source,/Designa[cç][aã]o de per[ií]cia cont[aá]bil\s*:\s*Os c[aá]lculos apresentados pelas partes apresentaram diverg[eê]ncias\s*\.\s*Para realiza[cç][aã]o da per[ií]cia cont[aá]bil\s*,\s*nomeio\s+[^.]{5,180}\./i)
   ||findQuote(source,/(?:Designa[cç][aã]o|determino|defiro|realiza[cç][aã]o)\s+(?:de|da|a)\s+per[ií]cia\s+(?:cont[aá]bil|t[eé]cnica|m[eé]dica)[^.!?]{0,250}(?:\.|$)/i)
   ||findQuote(source,/(?:nomeio|designo)\s+(?:o|a)?\s*(?:perito|perita|expert)?\s*[A-ZÁÉÍÓÚÂÊÔÃÕÇ][^.!?]{8,150}(?:\.|$)/i);
 if(appointment)upsert(acts,'6','Designação de perícia',appointment,null,x=>/per[ií]cia|nomea[cç][aã]o|perito/i.test(x.title+' '+x.quotes.join(' ')));
 const report=findQuote(source,/(?:O\s+)?laudo\s+(?:pericial\s+)?dever[aá]\s+ser\s+juntado\s+aos\s+autos\s+(?:pelo\s+perito\s+)?at[eé]\s+o\s+dia\s+\d{2}\/\d{2}\/\d{4}\s*\.?/i)
  ||findQuote(source,/(?:perito|perita|expert)[^.!?]{0,120}(?:apresentar|juntar|entregar)[^.!?]{0,150}(?:laudo)[^.!?]{0,90}\d{2}\/\d{2}\/\d{4}\.?/i);
 if(report)upsert(acts,'8','Entrega do laudo pericial',report,isoBR(report),()=>true);
 const impugn=findQuote(source,/(?:As partes|partes)\s+dever[aã]o\s+impugnar\s+o\s+laudo[^.!?]{0,270}\d{2}\/\d{2}\/\d{4}\s*\.?/i)
 ||findQuote(source,/As partes[^.!?]{0,220}(?:impugna[cç][aã]o|manifesta[cç][aã]o)[^.!?]{0,140}\d{2}\/\d{2}\/\d{4}\s*\.?/i);
 if(impugn)upsert(acts,'9','Impugnação ao laudo contábil',impugn,isoBR(impugn),x=>/impugna|manifesta[cç][aã]o/i.test(x.title+' '+x.quotes.join(' ')));
 const clarification=findQuote(source,/(?:Por fim,?\s*)?(?:o|a)\s+perit[oa]\s+dever[aá]\s+prestar\s+(?:seus|seus respectivos)?\s*esclarecimentos[^.!?]{0,150}\d{2}\/\d{2}\/\d{4}\s*\.?/i)
 ||findQuote(source,/(?:perito|perita|expert)[^.!?]{0,150}(?:esclarecimentos)[^.!?]{0,150}\d{2}\/\d{2}\/\d{4}\s*\.?/i);
 if(clarification)upsert(acts,'9','Esclarecimentos da perita',clarification,isoBR(clarification),x=>/esclarecimentos/i.test(x.title+' '+x.quotes.join(' ')));

 // Os quadros de PRAZOS frequentemente trazem duas datas. A final é a SEGUNDA.
 // Recuperação defensiva dos trechos de laudo, vista e esclarecimentos, não
 // dependendo da inferência do modelo em um trecho longo do PDF.
 const intervalPatterns: {category:Act['category']; title:string; pattern:RegExp}[]=[
  {category:'8',title:'Entrega do laudo pericial',pattern:/c\)\s*Prazo\s+para\s+o\(a\)\s+perito\(a\)\s+realizar\s+a\s+per[ií]cia\s+e\s+apresentar\s+o\s+laudo\s*:\s*de\s*\d{2}\/\d{2}\/\d{4}\s+a\s+\d{2}\/\d{2}\/\d{4}\s*;?/i},
  {category:'9',title:'Manifestação sobre o laudo pericial',pattern:/d\)\s*Prazo\s+comum\s+[aà]s\s+partes\s+para\s+se\s+manifestarem\s+a\s+respeito\s+do\s+laudo\s+pericial\s+e\s+honor[aá]rios\s+periciais\s*:\s*de\s*\d{2}\/\d{2}\/\d{4}\s+a\s+\d{2}\/\d{2}\/\d{4}\s*;?/i},
  {category:'9',title:'Esclarecimentos do perito',pattern:/e\)\s*Prazo\s+para\s+esclarecimentos\s+do\(a\)\s+perito\(a\)\s+ser[aá]\s+de\s+\d+\s+dias\s*:\s*\d{2}\/\d{2}\/\d{4}\s+a\s+\d{2}\/\d{2}\/\d{4}\s*\.?/i}
 ];
 for(const rule of intervalPatterns){
  const quote=findQuote(source,rule.pattern);if(!quote)continue;
  const dates=[...quote.matchAll(/\d{2}\/\d{2}\/\d{4}/g)].map(m=>m[0]);
  if(dates.length<2)continue;
  const due=isoBR(dates.at(-1)!);
  upsert(acts,rule.category,rule.title,quote,due,x=>rule.category==='8'||(rule.title.startsWith('Esclarecimentos')?/esclareciment/i.test(x.title):/manifesta|impugna/i.test(x.title)));
  const a0=acts.find(x=>x.category===rule.category&&x.title===rule.title);
  if(a0)a0.start_date=isoBR(dates[0]);
 }
 // A nomeação da prova pericial é um ato autônomo mesmo com laudo futuro.
 const engineer=findQuote(source,/Nomeio\s+o\(a\)\s+perito\(a\)\s+engenheiro\(a\)\s+[^.]{8,210}\./i);
 if(engineer)upsert(acts,'6','Designação de perícia',engineer,null,x=>true);
 // Proteção contra vencimento igual ao INÍCIO do intervalo temporal.
 for(const act of acts){
  const q=act.quotes.join(' ');
  const period=q.match(/\bde\s+(\d{2}\/\d{2}\/\d{4})\s+a\s+(\d{2}\/\d{2}\/\d{4})\b/i);
  if(period && (act.category==='8'||act.category==='9')){
   act.rule='fixed';act.start_date=isoBR(period[1]);act.fixed_date=isoBR(period[2]);act.days=null;
  }
 }

 // Sem vinculação ao cliente nem obrigação judicial, nenhuma entrada em OUTROS.
 const unique:Act[]=[];const keys=new Set<string>();
 for(const act of acts){
  if(otherDuplicate(act,acts))continue;
  if(act.category==='OUTROS'&&act.rule==='none'&&!/arquivamento|encerramento|testemunha|documentos|comprovante/i.test(act.title+' '+act.quotes.join(' ')))continue;
  const key=act.category+'|'+act.quotes.map(linked).join('|');if(keys.has(key))continue;keys.add(key);unique.push(act);
 }
 // Pós-processamento da IA pode ter deixado 9 antes de 8.
 // Ordenação cronológica por categoria, e dentre os 9 por data expressa.
 if(!unique.some(x=>x.rule==='after_previous')){
  const order=['1','4','6','7','8','9','OUTROS','ACORDO','AUDIENCIA','JULGAMENTO'];
  unique.sort((x,y)=>{const n=order.indexOf(x.category)-order.indexOf(y.category);return n||((x.category==='9'&&y.category==='9')?(x.fixed_date||'').localeCompare(y.fixed_date||''):0);});
 }
 return {...a,atos:unique,observations:a.observations.filter(s=>!/(?:tipogr[aá]fico|quebra de linha|espaçamento atípico|citação não literal|cita[cç][aã]o n[aã]o literal|nomea[cç][aã]o.*literal|concilia[cç][aã]o rejeitada)/i.test(s)).concat(warnings.filter(s=>/conferir o PDF/.test(s)&&!unique.some(x=>x.category==='6'||x.category==='8')))};
}
