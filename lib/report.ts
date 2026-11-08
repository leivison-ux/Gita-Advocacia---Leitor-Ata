import {Analysis,ComputedAct,br,computeAnalysis} from './calendar';
const cats=['1','4','6','7','8','9','OUTROS','ACORDO','AUDIENCIA','JULGAMENTO'] as const;
const names:Record<string,string>={'1':'1 - REGULARIZAÇÃO PROCESSUAL','4':'4 - RAZÕES FINAIS','6':'6 - AGENDAMENTO DE PERÍCIA','7':'7 - PERÍCIA','8':'8 - LAUDO - AO ANALISTA','9':'9 - LAUDO - AO ADV','OUTROS':'OUTROS PRAZOS','ACORDO':'ACORDO/CONCILIAÇÃO ENTRE AS PARTES','AUDIENCIA':'DATA AUDIÊNCIA','JULGAMENTO':'INTIMAÇÃO APÓS O JULGAMENTO'};
function lines(act:ComputedAct){const q=act.quotes.map(x=>`"${x.trim().replace(/^"|"$/g,'')}\"`).join('\n\n');
 if(act.category==='9'&&!act.quotes.length)return `**Observação:** ${act.event_description||'Manifestação sobre o laudo: a ata não fixa prazo.'}`;
 if(act.rule==='future_notice')return `${act.title}\n${q}`;
 const prefix=act.category==='8'||act.category==='9'?' (acompanhar)':'';
 if(act.datePrazo&&act.dateFatal)return `${act.title}${act.optional?' (FACULTATIVO)':''}\n${q}\n// Data prazo: ${br(act.datePrazo)}${prefix} - Data fatal: ${br(act.dateFatal)}${act.note?`\nCONFERIR: ${act.note}`:''}`;
 if(act.category==='8'&&act.datePrazo){return `${act.title}\n${q}\n// Data prazo: ${br(act.datePrazo)} (acompanhar) - ${act.event_description||'Data fatal: a apurar.'}`;}
 if(act.category==='6'&&act.datePrazo){return `${act.title}\n${q}\n// Data prazo: ${br(act.datePrazo)} - ${act.event_description||'Controle interno: acompanhar designação.'}`;}
 return `${act.title}${act.optional?' (FACULTATIVO)':''}\n${q}${act.note?`\n${act.note}`:''}`;
}
export function renderReport(a:Analysis){const {computed,alerts,dataInicio}=computeAnalysis(a);const result=[`# ATA DE AUDIÊNCIA`,`**PROCESSO:** ${a.processo}`,`**RECLAMANTE:** ${a.reclamante}`,`**CLIENTE:** ${a.cliente}`,`**POSIÇÃO:** ${a.posicao}`,`**DEMAIS PARTES:** ${a.outras_partes}`,`**ÓRGÃO:** ${a.orgao}`,`**DATA DA AUDIÊNCIA:** ${br(a.audiencia)}`,`**DATA INÍCIO:** ${br(dataInicio)}`,`**RESULTADO:** ${a.resultado}`];
 for(const cat of cats){const group=computed.filter(x=>x.category===cat&&(x.applies_to_client||x.category==='4'&&x.rule!=='after_previous'));if(!group.length)continue;if(cat==='AUDIENCIA')result.push('---');result.push(`### ${names[cat]}`);for(const act of group)result.push(lines(act));}
 result.push('### RESUMO DOS AGENDAMENTOS');result.push('| Agendamento | Data fatal / compromisso |','|---|---|');for(const x of computed.filter(x=>x.applies_to_client&&!(x.category==='9'&&!x.quotes.length))){const tail=x.dateFatal?br(x.dateFatal):x.rule==='future_notice'?'Aguardar intimação':x.event_description||'Sem data definida';result.push(`| ${x.title.replace(/\|/g,'/')} | ${tail.replace(/\|/g,'/')} |`)};
 const allAlerts=[...a.observations,...alerts];if(allAlerts.length)result.push('### CONFERIR',...allAlerts.map(s=>`- ${s}`));result.push('**Atenção:** Datas calculadas excluem sábados, domingos e feriados nacionais. Suspensões locais ou específicas do TRT precisam de conferência no PJe.');return {resultado:result.join('\n\n'),avisos:allAlerts,acts:computed};}
