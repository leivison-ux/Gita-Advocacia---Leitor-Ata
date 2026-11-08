import type {Analysis} from '../lib/calendar.ts';
import assert from 'node:assert/strict';
import {nextBusiness,advanceBusinessAfter,advanceBusinessInclusive,internalDate,computeAnalysis} from '../lib/calendar.ts';
assert.equal(nextBusiness('2026-10-28'),'2026-10-29');
assert.equal(advanceBusinessAfter('2026-10-28',5),'2026-11-05'); // Finados 02/11
assert.equal(advanceBusinessAfter('2026-10-27',5),'2026-11-04');
assert.equal(advanceBusinessInclusive('2026-11-17',10),'2026-12-01'); // 20/11
assert.equal(internalDate('7','2026-10-28'),'2026-10-30');
assert.equal(internalDate('8','2026-10-28'),'2026-11-13');
assert.equal(internalDate('9','2026-10-28'),'2026-11-18');
const analysis:Analysis={processo:'teste',reclamante:'autora',cliente:'SODEXO',posicao:'ré',outras_partes:'',orgao:'TRT',audiencia:'2026-10-28',resultado:'',observations:[],atos:[{category:'4',title:'prazo reclamante',quotes:['razões'],applies_to_client:false,rule:'business_after_hearing',days:5,start_date:null,fixed_date:null,after_index:null,optional:false,event_description:null},{category:'4',title:'prazo SODEXO sucessivo',quotes:['razões sucessivas'],applies_to_client:true,rule:'after_previous',days:5,start_date:null,fixed_date:null,after_index:0,optional:false,event_description:null},{category:'9',title:'manifestação após intimação',quotes:['serão intimadas'],applies_to_client:true,rule:'future_notice',days:5,start_date:null,fixed_date:null,after_index:null,optional:false,event_description:null}]};
const calc=computeAnalysis(analysis);assert.equal(calc.computed[1].dateFatal,'2026-11-12');assert.equal(calc.computed[1].datePrazo,'2026-11-06');assert.equal(calc.computed[2].dateFatal,null);assert.equal(calc.computed[2].datePrazo,null);
console.log('Testes de datas: OK');
