import { Analysis, Act } from './calendar';

/**
 * Reconciliacao com o documento-fonte. A extracao do modelo e uma proposta;
 * uma determinacao pericial comprovada no PDF nao pode desaparecer do relatorio.
 * Nao cria prazo judicial, nao inventa trechos e nao supoe data da diligencia.
 */
function normalize(source:string) { return source.replace(/\s+/g,' ').trim(); }
// Permite conferir uma citação abreviada mesmo quando o PDF ou a IA variam
// aspas, pontuação ou espaços. A transcrição final vem sempre do PDF.
function comparable(source:string) {
 return normalize(source).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR')
   .replace(/[“”"'‘’]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
}
function refersToSameOrder(short:string, full:string) {
 const a=comparable(short), b=comparable(full);
 if(a.length<38 || !b)return false;
 if(b.includes(a))return true;
 // Exige a identificação do mesmo perito e do mesmo prazo, quando presentes.
 const anchor=a.match(/(?:nomead[oa] (?:o|a) perit[oa]|perit[oa]) ([a-z ]{8,90}?)(?: que devera| que deve| informar| entregar| apresentar| no prazo| devera)/);
 if(!anchor || !b.includes(anchor[1].trim()))return false;
 const deadline=a.match(/(\d+) dias uteis/);
 if(deadline && !b.includes(deadline[0]))return false;
 return a.includes('perit') && (a.includes('laudo') || a.includes('estudo tecnico') || a.includes('consulta'));
}
function act(category: Act['category'], title:string, quotes:string[], event_description:string|null):Act {
 return {category,title,quotes,applies_to_client:true,rule:'none',days:null,start_date:null,fixed_date:null,after_index:null,optional:false,event_description};
}
export interface PericiaAudit { detected:boolean; added:string[]; source:string|null; expanded:string[]; pending:string[]; }
export function reconcilePericia(a:Analysis, raw:string):PericiaAudit {
 const src=normalize(raw);
 const hasOrder=/(?:determina-se|determino|determina|nomead[oa]|reputa-se imprescindível|designa-se)[^.!?]{0,400}(?:per[ií]cia|prova t[eé]cnica|perito|perita)|(?:per[ií]cia|prova t[eé]cnica)[^.!?]{0,400}(?:nomead[oa]|perito|perita)/i.test(src);
 if (!hasOrder) return {detected:false,added:[],source:null,expanded:[],pending:[]};
 // Capturar literalmente a frase determinativa incluindo a nomeacao e prazo do laudo.
 const patterns=[
  /Diante da alega[cç][aã]o de doen[cç]a ocupacional[^.!?]{0,1100}?(?:ap[oó]s a dilig[eê]ncia|ap[oó]s a per[ií]cia|(?:entregar|apresentar)[^.!?]{0,190}(?:laudo|estudo t[eé]cnico))\./i,
  /Considerando-se o pedido de[^.!?]{0,1100}?(?:per[ií]cia|perito|perita)[^.!?]{0,950}?\./i,
  /Determina-se a realiza[cç][aã]o d[ae] [^.!?]{0,1300}?(?:per[ií]cia|prova t[eé]cnica)[^.!?]{0,700}?\./i,
  /(?:nomead[oa]|per[ií]cia t[eé]cnica, a cargo)[^.!?]{0,900}?(?:laudo|estudo t[eé]cnico)[^.!?]{0,350}?\./i
 ];
 let quote:string|null=null;
 for(const p of patterns){const m=src.match(p);if(m){quote=m[0];break;}}
 if(!quote){
  // Fallback: procura a expressão "nomeado o perito" e retrocede até o início
  // da mesma ordem, inclusive quando o extrator de PDF muda a pontuação.
  const anchor=src.search(/nomead[oa]\s+(?:o|a)\s+perit[oa]\s+[^.]{8,110}?(?:dever[aá]|informar|apresentar|entregar)/i);
  if(anchor>=0){
    const prefix=src.slice(Math.max(0,anchor-500),anchor);
    const starts=[...prefix.matchAll(/(?:Diante|Considerando|Determino|Determina-se|Defiro|Nomeio|Designo)\b/gi)];
    const beginning=starts.length?anchor-prefix.length+starts[starts.length-1].index!:Math.max(0,src.lastIndexOf('.',anchor)+1);
    const end=src.indexOf('.',anchor);
    if(end>anchor && end-anchor<800)quote=src.slice(beginning,end+1).trim();
  }
 }
 if(!quote){
  const pos=src.search(/(?:per[ií]cia|prova t[eé]cnica)[^.!?]{0,180}?(?:perito|perita|nomead[oa])/i);
  if(pos>=0){const start=Math.max(0,src.lastIndexOf('.',pos)+1);const end=src.indexOf('.',pos);if(end>pos)quote=src.slice(start,end+1).trim();}
 }
 if(quote){
   const ix=src.indexOf(quote);
   if(ix>=0 && /^(?:nomead[oa]|per[ií]cia t[eé]cnica)/i.test(quote)){
     const before=src.slice(Math.max(0,ix-520),ix);
     const candidates=[...before.matchAll(/(?:Diante da|Considerando|Determino|Determina-se|Defiro|Nomeio|Designo)\b/gi)];
     if(candidates.length){
       const candidate=ix-before.length+candidates[candidates.length-1].index!;
       const prefix=src.slice(candidate,ix);
       // Apenas a mesma frase; nunca incorporar uma determinação anterior.
       if(!/[.!?]/.test(prefix) && /(?:prova t[eé]cnica|per[ií]cia|perito|perita)/i.test(prefix)){
         quote=src.slice(candidate,ix+quote.length).trim();
       }
     }
   }
 }
 if(!quote)return {detected:true,added:[],source:null,expanded:[],pending:[]};
 // A extração pode omitir o começo da determinação ou trazer espaços/quebras
 // de linha diferentes. A ordem integral deve vir do texto do próprio PDF.
 // Encontrada a ordem de origem, reconciliamos por identidade do perito e
 // do comando, sem depender de a frase curta ser substring idêntica.
 const existing=(n:string)=>a.atos.find(x=>x.category===n&&x.applies_to_client);
 const expanded:string[]=[];
 const pending:string[]=[];
 for(const cat of ['6','8'] as const) {
   const item=existing(cat);
   if(!item)continue;
   const full=comparable(quote);
   const alreadyFull=item.quotes.some(q=>comparable(q)===full);
   if(alreadyFull)continue;
   const isSame=(q:string)=>{
     if(refersToSameOrder(q,quote!))return true;
     const match=q.match(/nomead[oa] (?:o|a) perit[oa] ([\p{L} .'-]{7,85}?)(?:,| que )/iu);
     return !!match && comparable(q).includes('45 dias') && full.includes(comparable(match[1]));
   };
   const first=item.quotes.findIndex(isSame);
   if(first>=0){item.quotes[first]=quote;expanded.push(cat);}
   else pending.push(cat);
 }
 // A advertência sobre falta do reclamante integra o agendamento.
 const six=existing('6');
 if(six){
   const absence=src.match(/A aus[eê]ncia injustificada d[oa] reclamante[^.!?]*\./i);
   if(absence && !six.quotes.some(q=>normalize(q).includes(normalize(absence[0]))))six.quotes.push(absence[0]);
 }

 const already=(n:string)=>Boolean(existing(n));
 const added:string[]=[];
 const futureNotice=/(?:perito|perita)[^.!?]{0,180}(?:ser[aá]|dever[aá]) (?:ser )?intimad[oa][^.!?]{0,180}(?:apresentar|entregar)/i.test(quote);
 const scheduling=quote.match(/(?:informar|comunicar)[^.!?]{0,60}?(?:prazo de (\d+) dias|em (\d+) dias)[^.!?]{0,80}(?:data|dilig[eê]ncia|consulta)/i)
   ||quote.match(/prazo de (\d+) dias (?:a|para) (?:data|informar|comunicar)/i);
 const explicitDelivery=quote.match(/(?:at[eé] o dia|at[eé])\s*(\d{2}\/\d{2}\/\d{4})/i);
 const afterVisit=/(?:\d+ dias (?:[uú]teis )?ap[oó]s (?:a |o )?(?:dilig[eê]ncia|per[ií]cia|vistoria|consulta))|(?:a contar da realiza[cç][aã]o)/i.test(quote);
 const expert=quote.match(/(?:nomeado o perito|nomeada a perita|perito[a]? do Ju[ií]zo[, ]+|expert\s+)([\p{L} .'-]{7,85}?)(?=,\s*(?:que|o qual|a qual|com)|\s*\(|\s*-\s*Tel|\s+que dever[aá]|\.)/iu)?.[1]?.trim();
 const identification=expert?` – ${expert}`:'';
 if(!already('6')){
  const detail=scheduling?`Perito deve informar data da consulta em ${scheduling[1]||scheduling[2]} dias; marco inicial a conferir.`:'Data da diligência ainda não identificada; acompanhar a designação.';
  const six=act('6',`Agendamento da perícia${identification}`,[quote],detail);
  const absence=src.match(/A aus[eê]ncia injustificada d[oa] reclamante[^.!?]*\./i);
  if(absence)six.quotes.push(absence[0]);
  a.atos.push(six);added.push('6');
 }
 if(!already('8')){
  const d=explicitDelivery?.[1] ? `Apresentação do laudo prevista para ${explicitDelivery[1]}.` : afterVisit?'Data fatal: a apurar após a realização da perícia.':'Data fatal: a apurar conforme prazo/condição da ata.';
  const x=act('8',`Laudo pericial${identification}`,[quote],futureNotice?'Aguardar intimação futura do perito para início do prazo.':d);
  if(futureNotice)x.rule='future_notice';
  if(explicitDelivery&&!futureNotice){const [day,month,year]=explicitDelivery[1].split('/');x.rule='fixed';x.fixed_date=`${year}-${month}-${day}`;}
  a.atos.push(x);added.push('8');
 } else {
  const x=existing('8')!;
  if(x.rule==='none'&&!x.event_description)x.event_description=afterVisit?'Data fatal: a apurar após a realização da perícia.':'Data fatal: a apurar conforme prazo/condição da ata.';
 }
 if(!already('9')){
  const future=src.match(/(?:ap[oó]s (?:a juntada|a apresenta[cç][aã]o|conclus[aã]o) (?:do |de )?laudo[^.!?]{0,260}intimad[ao]s?[^.!?]*\.)/i);
  if(future){const x=act('9','Manifestação sobre o laudo',[future[0]],'Manifestação sobre o laudo: depende de futura intimação; sem agendamento neste momento.');x.rule='future_notice';a.atos.push(x);}
  else a.atos.push(act('9','Manifestação sobre o laudo – observação',[],'Manifestação sobre o laudo: a ata não fixa prazo para manifestação ou impugnação pelas partes. Acompanhar a juntada do laudo e eventual intimação para abertura de vista.'));
  added.push('9');
 }
 return {detected:true,added,source:quote,expanded,pending};
}
