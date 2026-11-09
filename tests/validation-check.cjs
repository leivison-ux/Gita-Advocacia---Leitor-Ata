const assert=require('node:assert/strict');
const {validateExtracted}=require('../.test-build/validation.js');
const {renderReport}=require('../.test-build/report.js');
const base={processo:'0000744-09.2026.5.05.0102',reclamante:'ADRIANA',cliente:'SODEXO',posicao:'Reclamada',outras_partes:'',orgao:'2ª VT',audiencia:'2026-11-04',resultado:'',observations:[]};
const empty={applies_to_client:true,days:null,start_date:null,fixed_date:null,after_index:null,optional:false,event_description:null};
const quote='Diante da alegação de doença ocupacional, reputa-se imprescindível a realização da prova técnica, ficando desde já nomeado o perito Marcelo de Aguiar Batista Sapucaia, que deverá informar no prazo de 10 dias a data de realização da consulta médica pericial, e entregar o seu estudo técnico no prazo de 45 dias úteis após a diligência.';
const raw={...base,atos:[
 {...empty,category:'6',title:'Agendamento da perícia',quotes:[quote],rule:'none'},
 {...empty,category:'7',title:'Quesitos',quotes:['Concedo às partes o prazo de 10 dias úteis, a fluir de 09/11/2026, para apresentação de assistentes técnicos e quesitos.'],rule:'business_from_date',days:10,start_date:'2026-11-09'},
 {...empty,category:'8',title:'Laudo',quotes:[quote],rule:'none',event_description:'Data fatal: a apurar após a realização da perícia.'},
 {...empty,category:'OUTROS',title:'Manifestação',quotes:['Concede-se prazo de 05 dias úteis, a partir de 26/11/2026, para a reclamada se manifestar acerca de documentos eventualmente juntados com a réplica.'],rule:'business_from_date',days:5,start_date:'2026-11-26'},
 {...empty,category:'9',title:'Observação sobre laudo',quotes:[],rule:'none'}]};
const {analysis,warnings}=validateExtracted(raw,quote);assert.equal(analysis.atos.length,5);assert.equal(warnings.length,0);const report=renderReport(analysis).resultado;
for(const n of ['6','7','8','9'])assert.ok(report.includes(`### ${n} -`));
assert.ok(report.includes('Data prazo: 23/11/2026 (acompanhar) - Data fatal: a apurar após a realização da perícia.'));
const invalid=JSON.parse(JSON.stringify(raw));invalid.atos.push({...empty,category:'OUTROS',title:'Obrigação sem citação',quotes:[],rule:'fixed',fixed_date:'2026-12-01'});
const checked=validateExtracted(invalid,quote);assert.equal(checked.analysis.atos.length,5);assert.equal(checked.warnings.length,1);
console.log('Teste de citação ausente: OK');
