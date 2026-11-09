const assert=require('node:assert/strict');
const {reconcilePericia}=require('../.test-build/pericia.js');
const {renderReport}=require('../.test-build/report.js');
const quote='Diante da alegação de doença ocupacional, reputa-se imprescindível a realização da prova técnica, ficando desde já nomeado o perito Marcelo de Aguiar Batista Sapucaia, que deverá informar no prazo de 10 dias a data de realização da consulta médica pericial, e entregar o seu estudo técnico no prazo de 45 dias úteis após a diligência.';
const a={processo:'0000744-09.2026.5.05.0102',reclamante:'ADRIANA',cliente:'SODEXO',posicao:'Reclamada',outras_partes:'',orgao:'2ª VT Simões Filho',audiencia:'2026-11-04',resultado:'',observations:[],atos:[{category:'7',title:'Quesitos',quotes:['Concedo às partes o prazo de 10 dias úteis, a fluir de 09/11/2026, para apresentação de assistentes técnicos e quesitos.'],applies_to_client:true,rule:'business_from_date',days:10,start_date:'2026-11-09',fixed_date:null,after_index:null,optional:false,event_description:null}]};
const audit=reconcilePericia(a,quote);assert.deepEqual(audit.added,['6','8','9']);
const o=renderReport(a).resultado;for(const n of ['6','7','8','9'])assert(o.includes(`### ${n} -`));assert(o.includes('Data prazo: 23/11/2026 (acompanhar) - Data fatal: a apurar após a realização da perícia.'));
assert(o.includes('Data prazo: 06/11/2026 - Data fatal: 23/11/2026'));assert.deepEqual(reconcilePericia(a,quote).added,[]);
console.log('Teste pericial: OK');
