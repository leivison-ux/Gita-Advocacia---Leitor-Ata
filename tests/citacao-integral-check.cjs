const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {reconcilePericia}=require('../.test-build/pericia.js');
const {renderReport}=require('../.test-build/report.js');
const raw=fs.readFileSync(path.join(__dirname,'adriana-source.txt'),'utf8');
const short='nomeado o perito Marcelo de Aguiar Batista Sapucaia, que deverá informar no prazo de 10 dias a data de realização da consulta médica pericial, e entregar o seu estudo técnico no prazo de 45 dias úteis após a diligência.';
const base={processo:'0000744-09.2026.5.05.0102',reclamante:'ADRIANA FREIRE SANTOS NASCIMENTO',cliente:'SODEXO DO BRASIL COMERCIAL S.A.',posicao:'RECLAMADA',outras_partes:'',orgao:'2ª Vara do Trabalho de Simões Filho - TRT da 5ª Região',audiencia:'2026-11-04',resultado:'Inconciliados.',observations:[],atos:[]};
const act=(cat,q)=>({category:cat,title:cat==='6'?'Agendamento da perícia – Marcelo de Aguiar Batista Sapucaia':'Laudo pericial – Marcelo de Aguiar Batista Sapucaia',quotes:[q],applies_to_client:true,rule:'none',days:null,start_date:null,fixed_date:null,after_index:null,optional:false,event_description:cat==='8'?'Data fatal: a apurar após a realização da perícia.':'Prazo do perito sem marco inicial.'});
// A IA extrai apenas a frase a partir de 'nomeado o perito'.
for(const variant of [short,'“'+short.replace('45 dias úteis','45 dias uteis')+'”']) {
 const a=structuredClone(base);a.atos=[act('6',variant),act('8',variant)];
 reconcilePericia(a,raw);
 const full='Diante da alegação de doença ocupacional, reputa-se imprescindível a realização da prova técnica, ficando desde já nomeado o perito Marcelo de Aguiar Batista Sapucaia';
 for(const c of ['6','8'])assert(a.atos.find(x=>x.category===c).quotes[0].startsWith(full),`Trecho completo ausente no item ${c}`);
 const out=renderReport(a).resultado;
 for(const c of ['6','8']){const section=out.split(`### ${c} -`)[1].split('### ')[0];assert(section.includes(full),`O relatório não ampliou a citação no item ${c}`);}
 assert(out.includes('45 dias úteis após a realização da consulta médica pericial'));
 assert(out.includes('Data prazo: 23/11/2026 (acompanhar) - Data fatal: a apurar após a realização da perícia'));
}
// Não substituir uma citação de um perito diferente.
const different=structuredClone(base);different.atos=[act('6','nomeado o perito Roberto Silva Ferreira, que deverá apresentar laudo em 45 dias úteis após a diligência.')];
reconcilePericia(different,raw);
assert(different.atos[0].quotes[0].includes('Roberto Silva Ferreira'));
assert(!different.atos[0].quotes[0].includes('Diante da alegação'));
console.log('Teste de recuperação literal V5.4: OK');
