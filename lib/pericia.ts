import { Analysis, Act } from './calendar';

/**
 * Reconciliacao com o documento-fonte. A extracao do modelo e uma proposta;
 * uma determinacao pericial comprovada no PDF nao pode desaparecer do relatorio.
 * Nao cria prazo judicial, nao inventa trechos e nao supoe data da diligencia.
 */
function normalize(source:string) { return source.replace(/\s+/g,' ').trim(); }
function act(category: Act['category'], title:string, quotes:string[], event_description:string|null):Act {
 return {category,title,quotes,applies_to_client:true,rule:'none',days:null,start_date:null,fixed_date:null,after_index:null,optional:false,event_description};
}
export interface PericiaAudit { detected:boolean; added:string[]; source:string|null; }
export function reconcilePericia(a:Analysis, raw:string):PericiaAudit {
 const src=normalize(raw);
 const hasOrder=/(?:determina-se|determino|determina|nomead[oa]|reputa-se imprescindível|designa-se)[^.!?]{0,400}(?:per[ií]cia|prova t[eé]cnica|perito|perita)|(?:per[ií]cia|prova t[eé]cnica)[^.!?]{0,400}(?:nomead[oa]|perito|perita)/i.test(src);
 if (!hasOrder) return {detected:false,added:[],source:null};
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
  const pos=src.search(/(?:per[ií]cia|prova t[eé]cnica)[^.!?]{0,180}?(?:perito|perita|nomead[oa])/i);
  if(pos>=0){const start=Math.max(0,src.lastIndexOf('.',pos)+1);const end=src.indexOf('.',pos);if(end>pos)quote=src.slice(start,end+1).trim();}
 }
 if(!quote)return {detected:true,added:[],source:null};
 // Para o mesmo laudo, completar transcrições abreviadas com a determinação integral.
 // Só ampliar se o trecho do modelo está contido na frase encontrada no PDF.
 const existing=(n:string)=>a.atos.find(x=>x.category===n&&x.applies_to_client);
 for (const cat of ['6','8'] as const) {
   const item=existing(cat);
   if(item && !item.quotes.some(q=>normalize(q)===quote)) {
     const short=item.quotes.find(q=>normalize(quote!).includes(normalize(q)));
     if(short) item.quotes=item.quotes.map(q=>q===short?quote!:q);
   }
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
 return {detected:true,added,source:quote};
}
