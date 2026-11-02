/** Pure UTC calendar; never uses server timezone for judicial dates. */
export type DateRule = 'fixed'|'business_after_hearing'|'business_from_date'|'calendar_after_hearing'|'calendar_from_date'|'hours_after_hearing'|'after_previous'|'future_notice'|'none';
export type Category = '1'|'4'|'6'|'7'|'8'|'9'|'OUTROS'|'ACORDO'|'AUDIENCIA'|'JULGAMENTO';
export interface Act {
 category:Category; title:string; quotes:string[]; applies_to_client:boolean;
 rule:DateRule; days:number|null; start_date:string|null; fixed_date:string|null;
 after_index:number|null; optional:boolean; event_description:string|null;
}
export interface Analysis {processo:string; reclamante:string; cliente:string; posicao:string; outras_partes:string; orgao:string; audiencia:string; resultado:string; atos:Act[]; observations:string[]}
const isoRE=/^\d{4}-\d{2}-\d{2}$/;
export function parseISO(s:string):Date { if(!isoRE.test(s))throw Error(`Data inválida: ${s}`);const d=new Date(`${s}T12:00:00.000Z`);if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==s) throw Error(`Data impossível: ${s}`);return d; }
export const iso=(d:Date)=>d.toISOString().slice(0,10);
export const br=(s:string)=>{const [y,m,d]=s.split('-');return `${d}/${m}/${y}`};
export function plusDays(s:string,n:number){const d=parseISO(s);d.setUTCDate(d.getUTCDate()+n);return iso(d)}
function easter(year:number){const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k+7)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),day=(h+l-7*m+114)%31+1;return iso(new Date(Date.UTC(year,month-1,day,12)));}
export function isHoliday(s:string){const [,m,d]=s.split('-');const md=`${m}-${d}`;const fixed=new Set(['01-01','04-21','05-01','09-07','10-12','11-02','11-15','11-20','12-25']);if(fixed.has(md))return true;return s===plusDays(easter(Number(s.slice(0,4))),-2);}
export function isBusinessDay(s:string){const w=parseISO(s).getUTCDay();return w!==0&&w!==6&&!isHoliday(s)}
export function nextBusiness(s:string){let x=plusDays(s,1);while(!isBusinessDay(x))x=plusDays(x,1);return x}
export function adjustBusiness(s:string){let x=s;while(!isBusinessDay(x))x=plusDays(x,1);return x}
export function advanceBusinessAfter(s:string,days:number){if(!Number.isInteger(days)||days<1||days>1500)throw Error('Quantidade inválida de dias úteis');let x=s;for(let i=0;i<days;i++)x=nextBusiness(x);return x}
export function advanceBusinessInclusive(s:string,days:number){if(!Number.isInteger(days)||days<1||days>1500)throw Error('Quantidade inválida de dias úteis');return advanceBusinessAfter(plusDays(adjustBusiness(s),-1),days)}
export function internalDate(category:Category, hearing:string){const start=nextBusiness(hearing);if(category==='7')return adjustBusiness(plusDays(start,1));if(category==='8')return adjustBusiness(plusDays(start,15));if(category==='9')return adjustBusiness(plusDays(start,20));return start}
export type ComputedAct=Act&{datePrazo:string|null;dateFatal:string|null;note:string|null};
export function computeAnalysis(a:Analysis){const alerts:string[]=[];const computed:ComputedAct[]=[];if(!a.audiencia)throw Error('Data da audiência ausente');parseISO(a.audiencia);for(let index=0;index<a.atos.length;index++){
 const act=a.atos[index];let fatal:string|null=null;let note:string|null=null;let datePrazo:string|null=null;
 const n=act.days;const start=act.start_date;const fixed=act.fixed_date;
 try {
  if(act.rule==='fixed'&&fixed){fatal=fixed;parseISO(fatal);if(!isBusinessDay(fatal))alerts.push(`${act.title}: data expressa ${br(fatal)} cai em dia não útil; conferir regra aplicável, sem alteração automática.`);}
  if(act.rule==='business_after_hearing'&&n)fatal=advanceBusinessAfter(a.audiencia,n);
  if(act.rule==='business_from_date'&&start&&n)fatal=advanceBusinessInclusive(start,n);
  if(act.rule==='calendar_after_hearing'&&n)fatal=plusDays(a.audiencia,n);
  if(act.rule==='calendar_from_date'&&start&&n)fatal=plusDays(start,n);
  if(act.rule==='hours_after_hearing'&&n){fatal=plusDays(a.audiencia,Math.ceil(n/24));note=`Prazo em ${n} horas; confirmar horário de vencimento e regra de contagem.`;}
  if(act.rule==='after_previous'&&n&&act.after_index!==null){const prev=computed[act.after_index];if(!prev?.dateFatal)throw Error('Prazo anterior sem data fatal');fatal=advanceBusinessAfter(prev.dateFatal,n);}
  if(act.rule==='future_notice')note='Aguardar efetiva intimação/evento futuro; sem lançamento antecipado.';
  if(act.rule==='none')note=act.event_description||'Sem prazo judicial definido.';
  if(act.rule!=='future_notice'&&act.rule!=='none'&&!fatal)note='Marco de contagem insuficiente; conferir no PJe.';
  if(fatal){datePrazo=internalDate(act.category,a.audiencia);if(act.category==='4'&&act.rule==='after_previous'&&act.after_index!==null){const prev=computed[act.after_index];if(prev?.dateFatal)datePrazo=nextBusiness(prev.dateFatal);}
   if(act.rule==='business_from_date'&&start)datePrazo=adjustBusiness(start);
   if(act.rule==='calendar_from_date'&&start&&act.category==='4')datePrazo=adjustBusiness(start);
   if(act.category==='9'&&act.rule==='fixed') {
    // Acompanhamento do laudo: comece no primeiro dia útil após o marco
    // anterior expresso (entrega de laudo, impugnação, esclarecimentos).
    
   const previous = computed
     .filter(
        (x) =>
          (x.category === "8" || x.category === "9") &&
           x.dateFatal !== null &&
           x.dateFatal < (fatal ?? "9999-12-31")
          )
          .sort((x, y) =>
            (x.dateFatal ?? "").localeCompare(y.dateFatal ?? "")
            )
      .at(-1);

    if(previous?.dateFatal)datePrazo=nextBusiness(previous.dateFatal);
    else if(act.start_date)datePrazo=adjustBusiness(act.start_date);
   }
   if(act.category==='8'&&act.start_date&&act.rule==='fixed') datePrazo=adjustBusiness(act.start_date);
   if(datePrazo>fatal){datePrazo=nextBusiness(a.audiencia);if(datePrazo>fatal){datePrazo=null;alerts.push(`${act.title}: vencimento antes da data de cadastro; revisar imediatamente.`);}else alerts.push(`${act.title}: controle antecipado para não ultrapassar o vencimento.`)}
  }
  // Quando a perícia foi designada sem vencimento próprio, o campo 6 usa
  // o prazo de entrega do laudo expressamente indicado na mesma ata.
  if(act.category==='6'&&act.rule==='none'){
    const laudo=a.atos.find(x=>x.category==='8'&&x.rule==='fixed'&&x.fixed_date);
    if(laudo?.fixed_date){fatal=laudo.fixed_date;datePrazo=nextBusiness(a.audiencia);note='entrega do laudo';}
  }
  if(act.rule==='fixed'&&fixed&&!fatal)throw Error('Data fixa inválida');
 }catch(e){note=`CONFERIR: ${e instanceof Error?e.message:'data inválida'}`;alerts.push(`${act.title}: ${note}`);fatal=null;datePrazo=null}
 computed.push({...act,dateFatal:fatal,datePrazo,note});
 }
 return {computed,alerts,dataInicio:nextBusiness(a.audiencia)};
}
