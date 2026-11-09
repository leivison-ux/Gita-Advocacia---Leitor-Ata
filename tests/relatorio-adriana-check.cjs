const assert=require('node:assert/strict');
const fs=require('node:fs');
const {reconcilePericia}=require('../.test-build/pericia.js');
const {renderReport}=require('../.test-build/report.js');
const source=fs.readFileSync(__dirname+'/adriana-source.txt','utf8');
const sentence='Diante da alegação de doença ocupacional, reputa-se imprescindível a realização da prova técnica, ficando desde já nomeado o perito Marcelo de Aguiar Batista Sapucaia, que deverá informar no prazo de 10 dias a data de realização da consulta médica pericial, e entregar o seu estudo técnico no prazo de 45 dias úteis após a diligência.';
const quoteShort='nomeado o perito Marcelo de Aguiar Batista Sapucaia, que deverá informar no prazo de 10 dias a data de realização da consulta médica pericial, e entregar o seu estudo técnico no prazo de 45 dias úteis após a diligência.';
const hearing='O processo permanecerá FORA DE PAUTA até que se conclua a produção de prova pericial. PARTES CIENTES. Quando da reinclusão do feito em pauta as partes serão notificadas, por meio de seus patronos, com advertência de que deverão comparecer para depor sob pena de confissão e de que trarão suas testemunhas, independente de notificação, sob pena de preclusão.';
const empty={days:null,start_date:null,fixed_date:null,after_index:null,optional:false,applies_to_client:true};
const a={processo:'0000744-09.2026.5.05.0102',reclamante:'ADRIANA FREIRE SANTOS NASCIMENTO',cliente:'SODEXO DO BRASIL COMERCIAL S.A.',posicao:'RECLAMADA',outras_partes:'',orgao:'2ª Vara do Trabalho de Simões Filho — TRT da 5ª Região',audiencia:'2026-11-04',resultado:'Inconciliados. Determinada perícia médica.',observations:[],atos:[
 {category:'7',title:'Apresentação de assistentes técnicos e quesitos',quotes:['Concedo às partes o prazo de 10 dias úteis, a fluir de 09/11/2026, para apresentação de assistentes técnicos e quesitos. As partes foram advertidas de que deverão esgotar a quesitação sobre os pontos que merecem elucidação por parte do perito, não se admitindo quesitos complementares sobre aspecto já conhecido da controvérsia.','Nesse sentido, somente pontos suscitados pelo perito além dos quesitos formulados pelas partes e pelo Juízo poderão ser objeto de quesitos suplementares.'],...empty,rule:'business_from_date',days:10,start_date:'2026-11-09'},
 {category:'OUTROS',title:'Manifestação da reclamada sobre documentos eventualmente juntados com a réplica',quotes:['Concede-se prazo de 05 dias úteis, a partir de 26/11/2026, para a reclamada se manifestar acerca de documentos eventualmente juntados com a réplica.'],...empty,rule:'business_from_date',days:5,start_date:'2026-11-26'},
 {category:'AUDIENCIA',title:'Comparecimento após reinclusão em pauta',quotes:[hearing],...empty,rule:'future_notice',event_description:null},
 {category:'OUTROS',title:'Levar testemunhas à audiência futura independentemente de notificação',quotes:[hearing],...empty,rule:'none',event_description:'Aguardar intimação'},
 {category:'6',title:'Agendamento da perícia – Marcelo de Aguiar Batista Sapucaia',quotes:[quoteShort],...empty,rule:'none',event_description:'Perito deve informar data da consulta em 10 dias; marco inicial a conferir.'},
 {category:'8',title:'Laudo pericial – Marcelo de Aguiar Batista Sapucaia',quotes:[quoteShort],...empty,rule:'none',event_description:'Data fatal: a apurar após a realização da perícia.'},
 {category:'9',title:'Laudo ao advogado',quotes:[],...empty,rule:'none',event_description:'Manifestação sobre o laudo: a ata não fixa prazo para manifestação ou impugnação pelas partes. Acompanhar a juntada do laudo e eventual intimação para abertura de vista.'},
]};
const audit=reconcilePericia(a,source);assert(audit.detected,'Perícia detectada');
const {resultado:r}=renderReport(a);
assert(r.includes(sentence),'6 e 8 precisam de trecho inteiro');
assert(r.includes('Data prazo: 23/11/2026 (acompanhar) - Data fatal: a apurar após a realização da perícia.'));
assert(r.includes('Data prazo: 06/11/2026 - Data fatal: 23/11/2026'));
assert(r.includes('Data prazo: 26/11/2026 - Data fatal: 02/12/2026'));
assert(r.includes('| Providência | Data prazo | Data fatal |'));
assert(!r.includes('### OUTROS PRAZOS\n\n"'+hearing),'Não duplicar testemunhas em OUTROS');
assert(!r.includes('| Levar testemunhas à audiência futura'),'Não duplicar testemunhas no resumo');
assert(r.indexOf('### 6 -')<r.indexOf('### 7 -')&&r.indexOf('### 7 -')<r.indexOf('### 8 -'));
fs.writeFileSync(__dirname+'/resultado-adriana-v53.md',r);
console.log('Regressão Adriana / V5.3: OK');
assert(r.includes('**Obrigação do perito:** Apresentar o laudo pericial no prazo de 45 dias úteis após a realização da consulta médica pericial.'),'Prazo do laudo explícito');
assert(r.includes('**Atenção:** As partes deverão comparecer para depoimento pessoal, sob pena de confissão, e levar suas testemunhas independentemente de intimação, sob pena de preclusão.'),'Alerta de testemunhas e confissão');
assert(r.includes('"A ausência injustificada do reclamante importará na desistência da produção da prova pericial."'),'Advertência da ausência incluída no item 6');
