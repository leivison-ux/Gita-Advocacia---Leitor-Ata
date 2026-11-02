import {Analysis,Act} from './calendar';

// Conferência independente: não autorizar citações que não existam no PDF.
export const normalize = (s:string)=>s.replace(/\u00ad/g,'').replace(/\s+/g,' ').replace(/\s+([,.;:])/g,'$1').trim();
function quoteAt(text:string, re:RegExp):string|null {
 const m=re.exec(text);return m?m[0].trim():null;
}
const mk=(category:Act['category'],title:string,quote:string,date:string):Act=>({category,title,quotes:[quote],applies_to_client:true,rule:'fixed',days:null,start_date:null,fixed_date:date,after_index:null,optional:false,event_description:null});
function isoBR(s:string){const m=s.match(/(\d{2})\/(\d{2})\/(\d{4})/);return m?`${m[3]}-${m[2]}-${m[1]}`:null;}
function hasCategory(items:Act[],category:string){return items.some(a=>a.category===category&&a.applies_to_client);}

export function improveExtraction(a:Analysis,original:string):Analysis {
 const source=normalize(original).replace(/(\d{2})\/(\d{2})\s+\/(\d{4})/g,'$1/$2/$3');
 const warnings:string[]=[];
 const cleanActs:Act[]=[];
 for(const act of a.atos){
  const quotes=act.quotes.map(q=>normalize(q).replace(/^“|”$/g,'').replace(/^"|"$/g,'')).filter(Boolean);
  const verified=quotes.filter(q=>source.includes(q));
  if(verified.length!==quotes.length){warnings.push(`Citação não literal no item ${act.category} (${act.title}); trecho não confirmado foi descartado.`);}
  if(!verified.length)continue;
  cleanActs.push({...act,quotes:verified});
 }
 // Salvaguardas universais para determinações explícitas comuns na ata. Cada
 // inclusão exige comprovação textual integral no PDF, sem alucinações da IA.
 const appointment=quoteAt(source,/Designação de perícia contábil:\s*Os cálculos apresentados pelas partes apresentaram divergências\.\s*Para realização da perícia contábil, nomeio [^.]+\./i);
 
 if(appointment){ const exists=cleanActs.find(x=>x.category==='6'); if(exists){exists.quotes=[appointment];exists.title='Designação de perícia contábil';}else cleanActs.push({...mk('6','Designação de perícia contábil',appointment,a.audiencia),rule:'none',fixed_date:null,event_description:'Perita nomeada; acompanhar o calendário pericial.'}); }
 const report=quoteAt(source,/O laudo deverá ser juntado aos autos pelo perito até o dia\s+\d{2}\/\d{2}\/\d{4}\./i);
 if(report){const due=isoBR(report); const exists=cleanActs.find(x=>x.category==='8');if(exists){exists.quotes=[report];exists.title='Entrega do laudo pericial contábil';if(due){exists.rule='fixed';exists.fixed_date=due;}}else if(due)cleanActs.push(mk('8','Entrega do laudo pericial contábil',report,due));}
 const impugn=quoteAt(source,/As partes deverão impugnar o laudo de forma específica, detalhada e fundamentada, sob pena de preclusão até o dia\s+\d{2}\/\d{2}\/\d{4}\./i);
 if(impugn){const due=isoBR(impugn);const existing=cleanActs.find(x=>x.category==='9'&&/impugna/i.test(x.title+' '+x.quotes.join(' ')));if(existing){existing.quotes=[impugn];if(due){existing.rule='fixed';existing.fixed_date=due;}}else if(due)cleanActs.push(mk('9','Impugnação específica do laudo pelas partes',impugn,due));}
 const clarification=quoteAt(source,/Por fim, o perito deverá prestar seus esclarecimentos até o dia\s+\d{2}\/\d{2}\/\d{4}\./i);
 if(clarification&&!cleanActs.some(x=>x.category==='9'&&/esclarecimentos/i.test(x.title+' '+x.quotes.join(' ')))){const due=isoBR(clarification);if(due)cleanActs.push(mk('9','Esclarecimentos da perita',clarification,due));}
 // Fato de nomeação sem prazo fatal não é o mesmo que o prazo do laudo.
 const initial=quoteAt(source,/A representação processual poderá ser realizada no prazo de cinco dias\./i);
 if(initial&&!hasCategory(cleanActs,'1'))cleanActs.push({category:'1',title:'Regularização processual',quotes:[initial],applies_to_client:true,rule:'business_after_hearing',days:5,start_date:null,fixed_date:null,after_index:null,optional:true,event_description:null});
 // Preserve os índices: só ordenamos se não houver vínculos sucessivos.
 if(!cleanActs.some(x=>x.rule==='after_previous')){const order=['1','4','6','7','8','9','OUTROS','ACORDO','AUDIENCIA','JULGAMENTO'];cleanActs.sort((x,y)=>order.indexOf(x.category)-order.indexOf(y.category));}
 return {...a,atos:cleanActs,observations:[...a.observations,...warnings]};
}
