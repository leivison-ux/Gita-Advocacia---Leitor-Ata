/** Verificações estruturais mínimas, baseadas nas determinações presentes na ata. */
export type Pendencia = { campo: string; explicacao: string };

const normaliza = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
const temTitulo = (texto: string, numero: number) => new RegExp(`(?:^|\\n)#{1,4}\\s*${numero}\\s*[-–]\\s*`, 'i').test(texto);

export function validarAnalise(ata: string, resposta: string, dataItem8: string | null): Pendencia[] {
  const a = normaliza(ata);
  const r = normaliza(resposta);
  const pendencias: Pendencia[] = [];
  const pericia = /PERICIA|PERITO|PERITA|PROVA TECNICA/.test(a) && /LAUDO|CONSULTA MEDICA PERICIAL|VISTORIA|EXAME PERICIAL|DILIGENCIA/.test(a);
  const nomeacao = /NOMEAD[OA]|NOMEANDO|PERICIA.*A CARGO|DETERMINA.SE A REALIZACAO DE PERICIA|REALIZACAO DA PROVA TECNICA/.test(a);
  const haLaudo = /LAUDO|ESTUDO TECNICO/.test(a);
  const haQuesitos = /QUESITOS|ASSISTENTES TECNICOS|ASSISTENTE TECNICO/.test(a);
  if (pericia && nomeacao && !temTitulo(resposta,6)) pendencias.push({campo:'6',explicacao:'Foi determinada perícia, mas falta 6 - AGENDAMENTO DE PERÍCIA com perito, objeto, prazo para informar data e status da diligência.'});
  if (pericia && haQuesitos && !temTitulo(resposta,7)) pendencias.push({campo:'7',explicacao:'A ata traz prazo de quesitos/assistente técnico, mas falta 7 - PERÍCIA.'});
  if (pericia && haLaudo && !temTitulo(resposta,8)) pendencias.push({campo:'8',explicacao:'Foi determinado laudo pericial, mas falta 8 - LAUDO - AO ANALISTA.'});
  if (pericia && haLaudo && !temTitulo(resposta,9) && !/MANIFESTACAO SOBRE O LAUDO/.test(r)) pendencias.push({campo:'9',explicacao:'Falta 9 - LAUDO - AO ADV ou a observação expressa sobre manifestação, mesmo quando não há prazo.'});
  if (temTitulo(resposta,8) && dataItem8) {
    const secao = resposta.split(/(?:^|\n)#{1,4}\s*8\s*[-–]\s*LAUDO\s*[-–]\s*AO ANALISTA\s*/i)[1]?.split(/\n#{1,4}\s|\n---\s*\n/)[0] || '';
    // Quando não há gatilho expresso de intimação futura para o perito, a linha é indispensável.
    const dependeIntimacao = /(?:DEVERA|DEVERAO|SERA|SERAO)\s+INTIMAD[OA]S?\s+(?:PARA|A)\s+(?:APRESENTAR|ENTREGAR|JUNTAR)/i.test(secao);
    if (!dependeIntimacao && !new RegExp(`Data prazo:\\s*${dataItem8.replace(/\//g,'\\/')}\\s*\\(acompanhar\\)\\s*-\\s*Data fatal:`, 'i').test(secao)) pendencias.push({campo:'8-datas',explicacao:`Item 8 deve apresentar // Data prazo: ${dataItem8} (acompanhar) - Data fatal: [data ou gatilho concreto].`});
  }
  const audienciaFutura = /(?:FICA\s+DESIGNAD[AO]|FICA\s+REDESIGNAD[AO]|DESIGNE.SE|REINCLUSAO\s+DO\s+FEITO\s+EM\s+PAUTA|DESIGNA.SE\s+AUDIENCIA)/.test(a);
  if (audienciaFutura && !/DATA AUDIENCIA/.test(r)) pendencias.push({campo:'audiência', explicacao:'A ata menciona audiência futura ou reinclusão em pauta; informar o bloco DATA AUDIÊNCIA, mesmo se a data ainda não foi designada.'});
  if (!/CONFERENCIA DOS AGENDAMENTOS|RESUMO DOS AGENDAMENTOS/.test(r)) pendencias.push({campo:'resumo',explicacao:'A tabela de agendamentos não foi apresentada.'});
  return pendencias;
}
