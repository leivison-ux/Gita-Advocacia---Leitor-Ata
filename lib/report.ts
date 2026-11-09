import { Analysis, ComputedAct, br, computeAnalysis } from './calendar';

// Ordenacao e apresentacao deterministicas. O modelo nao monta o relatorio final.
const cats = ['1','4','6','7','8','9','ACORDO','OUTROS','AUDIENCIA','JULGAMENTO'] as const;
const names: Record<string,string> = {
 '1':'1 - REGULARIZAÇÃO PROCESSUAL',
 '4':'4 - RAZÕES FINAIS',
 '6':'6 - AGENDAMENTO DE PERÍCIA',
 '7':'7 - PERÍCIA',
 '8':'8 - LAUDO - AO ANALISTA',
 '9':'9 - LAUDO - AO ADV',
 'OUTROS':'OUTROS PRAZOS',
 'ACORDO':'ACORDO/CONCILIAÇÃO ENTRE AS PARTES',
 'AUDIENCIA':'DATA AUDIÊNCIA',
 'JULGAMENTO':'INTIMAÇÃO APÓS O JULGAMENTO',
};
const clean=(s:string)=>s.trim().replace(/^"|"$/g,'');
const cited=(x:ComputedAct)=>x.quotes.map(q=>`"${clean(q)}"`).join('\n\n');
const observation=(x:ComputedAct)=>x.event_description||'Manifestação sobre o laudo: a ata não fixa prazo para manifestação ou impugnação pelas partes. Acompanhar a juntada do laudo e eventual intimação para abertura de vista.';
const condition=(x:ComputedAct)=>{
 const raw=(x.event_description||'').replace(/^Data fatal:\s*/i,'').replace(/\.$/,'').trim();
 if(/a apurar|ap[oó]s a realiza[cç][aã]o|ap[oó]s a dilig[eê]ncia/i.test(raw))return raw.toLowerCase().startsWith('a apurar')?raw:`a apurar ${raw}`;
 return 'a apurar após a definição do marco inicial do prazo do perito';
};
function isWitnessOnly(x:ComputedAct):boolean {
 return x.category==='OUTROS' && x.rule==='none' && /(?:testemunha|rol de testemunhas)/i.test(x.title+' '+x.quotes.join(' ')) &&
 /(?:audi[eê]ncia futura|reinclus[aã]o|comparecer|levar testemunhas|independente de notifica[cç][aã]o)/i.test(x.title+' '+x.quotes.join(' '));
}
function renderAct(x:ComputedAct):string {
 const paragraphs:string[]=[];
 // A transcricao da ordem judicial aparece antes de qualquer explicacao interna.
 const quotes=cited(x);
 if(quotes)paragraphs.push(quotes);
 if(x.category==='9'&&!x.quotes.length)return `**Observação:** ${observation(x)}\n\nSem agendamento neste momento.`;
 if(x.category==='9'&&x.rule==='future_notice')return `${quotes}`;
 if(x.category==='6') {
   const expert=x.title.match(/(?:perícia|pericia)\s*[–-]\s*(.+)$/i)?.[1];
   if(expert)paragraphs.push(`**Perito:** ${expert}`);
   if(!/(?:data da (?:consulta|vistoria|perícia)|(?:agendada|designada) para)\s*:?\s*\d{2}\/\d{2}\/\d{4}/i.test(x.quotes.join(' ')))paragraphs.push('**Data da perícia:** Ainda não informada.');
   paragraphs.push('**Providência:** Acompanhar a comunicação da data da diligência.');
 }
 if(x.category==='8'){
   const fullText=x.quotes.join(' ');
   const deadline=fullText.match(/(?:no prazo de|em)\s+(\d+)\s+dias\s+(úteis|uteis|corridos)\s+após\s+(?:a|o)\s+([^.,;]+)/i);
   if(deadline){
     const days=deadline[1],unit=deadline[2].toLowerCase()==='uteis'?'úteis':deadline[2].toLowerCase();
     const event=deadline[3];
     const wording=/dilig[eê]ncia|consulta|per[ií]cia/i.test(event)?'a realização da consulta médica pericial':`o evento: ${event.trim()}`;
     paragraphs.push(`**Obrigação do perito:** Apresentar o laudo pericial no prazo de ${days} dias ${unit} após ${wording}.`);
   }else{
     paragraphs.push('**Obrigação do perito:** Apresentar o laudo conforme a condição e o prazo estabelecidos na ata.');
   }
 }
 if(x.category==='AUDIENCIA') {
   if(x.rule==='future_notice'||x.rule==='none')paragraphs.push('**Data:** Ainda não designada.\n**Providência:** Acompanhar futura inclusão em pauta e intimação.');
   else if(x.dateFatal)paragraphs.push(`**Data:** ${br(x.dateFatal)}.`);
   const hearingText=x.quotes.join(' ');
   if(/depor\s+sob pena de confiss[aã]o/i.test(hearingText)&&/testemunhas/i.test(hearingText)&&/(?:independente(?:mente)? de notifica[cç][aã]o|sem intima[cç][aã]o)/i.test(hearingText)){
     paragraphs.push('**Atenção:** As partes deverão comparecer para depoimento pessoal, sob pena de confissão, e levar suas testemunhas independentemente de intimação, sob pena de preclusão.');
   }
 }
 if(x.rule==='future_notice')return paragraphs.join('\n\n');
 const follow=x.category==='8'||x.category==='9'?' (acompanhar)':'';
 if(x.datePrazo&&x.dateFatal)paragraphs.push(`// Data prazo: ${br(x.datePrazo)}${follow} - Data fatal: ${br(x.dateFatal)}.`);
 else if(x.category==='8'&&x.datePrazo)paragraphs.push(`// Data prazo: ${br(x.datePrazo)} (acompanhar) - Data fatal: ${condition(x)}.`);
 else if(x.category==='6'&&x.datePrazo)paragraphs.push(`// Data prazo: ${br(x.datePrazo)} - Data fatal: ${condition(x)}.`);
 else if(x.category!=='AUDIENCIA'&&x.event_description)paragraphs.push(`**Observação:** ${x.event_description}`);
 if(x.note&&x.rule!=='none')paragraphs.push(`**CONFERIR:** ${x.note}`);
 return paragraphs.join('\n\n');
}
const safeCell=(s:string)=>s.replace(/\|/g,'/').replace(/\n/g,' ').trim();
function taskTitle(x:ComputedAct):string {
 if(x.category==='9')return '9 – Laudo ao advogado';
 if(x.category==='8')return '8 – Laudo ao analista';
 if(x.category==='6')return '6 – Agendamento de perícia';
 if(x.category==='7')return `7 – ${x.title}`;
 if(x.category==='AUDIENCIA')return 'Audiência futura';
 return x.title;
}
function timeline(x:ComputedAct):[string,string] {
 const prazo=x.datePrazo?`${br(x.datePrazo)}${x.category==='8'?' (acompanhar)':''}`:
   x.category==='9'?'Aguardar laudo/intimação':x.category==='AUDIENCIA'?'Aguardar designação':x.rule==='future_notice'?'Aguardar intimação':'—';
 const fatal=x.dateFatal?br(x.dateFatal):x.category==='9'?'Sem prazo fixado':
   x.category==='AUDIENCIA'?'Sem data':x.rule==='future_notice'?'A apurar após intimação':
   x.category==='8'?'Após a realização da perícia':x.category==='6'?'A apurar':x.event_description||'Sem prazo definido';
 return [prazo,fatal];
}
export function renderReport(a:Analysis) {
 const {computed,alerts,dataInicio}=computeAnalysis(a);
 const applicable=computed.filter(x=>x.applies_to_client);
 // Um comando genérico para testemunhas da futura audiência não deve virar
 // segundo prazo em OUTROS. Se houver prazo autônomo (rol/intimação), preservá-lo.
 const filtered=applicable.filter(x=>!isWitnessOnly(x));
 const parts=[
 '# ATA DE AUDIÊNCIA',
 `**PROCESSO:** ${a.processo}`,
 `**RECLAMANTE:** ${a.reclamante}`,
 `**CLIENTE:** ${a.cliente}`,
 `**POSIÇÃO:** ${a.posicao}`,
 ...(a.outras_partes.trim()?[`**DEMAIS PARTES:** ${a.outras_partes}`]:[]),
 `**ÓRGÃO:** ${a.orgao}`,
 `**DATA DA AUDIÊNCIA:** ${br(a.audiencia)}`,
 `**DATA INÍCIO:** ${br(dataInicio)}`,
 `**RESULTADO:** ${a.resultado}`,
 ];
 for(const cat of cats){
   const group=filtered.filter(x=>x.category===cat);
   if(!group.length)continue;
   if(cat==='AUDIENCIA')parts.push('---');
   parts.push(`### ${names[cat]}`);
   for(const item of group)parts.push(renderAct(item));
 }
 parts.push('### RESUMO DOS AGENDAMENTOS');
 const table=['| Providência | Data prazo | Data fatal |','|---|---|---|'];
 for(const cat of cats)for(const item of filtered.filter(x=>x.category===cat)){
   const [prazo,fatal]=timeline(item);
   table.push(`| ${safeCell(taskTitle(item))} | ${safeCell(prazo)} | ${safeCell(fatal)} |`);
 }
 parts.push(table.join('\n'));
 const allAlerts=[...a.observations,...alerts];
 if(allAlerts.length)parts.push('### CONFERIR',...allAlerts.map(s=>`- ${s}`));
 parts.push('**Atenção:** Datas calculadas excluem sábados, domingos e feriados nacionais. Suspensões locais ou específicas do TRT precisam de conferência no PJe.');
 return {resultado:parts.join('\n\n'),avisos:allAlerts,acts:filtered};
}
