import {Analysis,ComputedAct,br,computeAnalysis} from './calendar';
const cats=['1','4','6','7','8','9','OUTROS','ACORDO','AUDIENCIA','JULGAMENTO'] as const;
const names:Record<string,string>={'1':'1 - REGULARIZAÇÃO PROCESSUAL','4':'4 - RAZÕES FINAIS','6':'6 - AGENDAMENTO DE PERÍCIA','7':'7 - PERÍCIA','8':'8 - LAUDO - AO ANALISTA','9':'9 - LAUDO - AO ADV','OUTROS':'OUTROS PRAZOS','ACORDO':'ACORDO/CONCILIAÇÃO ENTRE AS PARTES','AUDIENCIA':'DATA AUDIÊNCIA','JULGAMENTO':'INTIMAÇÃO APÓS O JULGAMENTO'};
function lines(act:ComputedAct){
 const quotes=act.quotes.map(x=>`"${x.trim().replace(/^"|"$/g,'')}"`).join('\n\n');
 if(act.rule==='future_notice')return quotes;
 let text=quotes;
 if(act.category==='9'){
  const t=(act.title+' '+act.quotes.join(' ')).toLowerCase();
  if(/esclarecimento/.test(t) && /perit[oa]|expert/.test(t) && !/manifesta[cç][aã]o.*esclarecimento|partes poder[aã]o apresentar/.test(t))text=`**ESCLARECIMENTOS DO PERITO**\n\n${quotes}`;
  else if(/impugna|manifesta[cç][aã]o/.test(t))text=`**MANIFESTAÇÃO SOBRE O LAUDO PERICIAL**\n\n${quotes}`;
 }
 const suffix=act.category==='8'||act.category==='9'?' (acompanhar)':'';
 if(act.datePrazo&&act.dateFatal){
  const note=act.category==='6'&&act.note==='entrega do laudo'?' (entrega do laudo)':act.category==='9'&&/esclarecimento/i.test(act.title)?' (obrigação do perito)':'';
  return `${text}\n\n// Data prazo: ${br(act.datePrazo)}${suffix} - Data fatal: ${br(act.dateFatal)}${note}.`;
 }
 return `${text}${act.note?`\n\n${act.note}`:''}`;
}
export function renderReport(a:Analysis){const {computed,alerts,dataInicio}=computeAnalysis(a);const result=[`# ATA DE AUDIÊNCIA`,`**PROCESSO:** ${a.processo}`,`**RECLAMANTE:** ${a.reclamante}`,`**CLIENTE:** ${a.cliente}`,`**POSIÇÃO:** ${a.posicao}`,...(a.outras_partes?[`**DEMAIS PARTES:** ${a.outras_partes}`]:[]),`**ÓRGÃO:** ${a.orgao}`,`**DATA DA AUDIÊNCIA:** ${br(a.audiencia)}`,`**DATA INÍCIO:** ${br(dataInicio)}`,`**RESULTADO:** ${a.resultado}`];
 for(const cat of cats){const group=computed.filter(x=>x.category===cat&&(x.applies_to_client||x.category==='4'&&x.rule!=='after_previous'));if(!group.length)continue;if(cat==='AUDIENCIA'||cat==='JULGAMENTO')result.push('---');result.push(`### ${names[cat]}`);for(const act of group)result.push(lines(act));}
 const allAlerts=[...a.observations,...alerts].filter(Boolean); if(allAlerts.length)result.push('**CONFERIR:** '+allAlerts.join(' '));return {resultado:result.join('\n\n'),avisos:allAlerts,acts:computed};}
