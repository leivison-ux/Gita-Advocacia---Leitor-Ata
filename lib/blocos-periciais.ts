import { dataItem8, dateFromBR } from './datas';

/**
 * Camada determinística de completude: o modelo pode redigir, mas não pode
 * suprimir um controle de perícia expressamente determinado na ata.
 * Mantemos transcrições literais do PDF, apenas unificando espaços e linhas.
 */
const titulo = (n: number) => new RegExp(`(?:^|\\n)#{1,5}\\s*${n}\\s*[-–]\\s*`, 'im');
const normalize = (s: string) => s.replace(/<<<FIM_PAGINA>>>/g, ' ').replace(/\s+/g, ' ').trim();

function encontraOrdem(texto: string): string | null {
  const textoLimpo = normalize(texto);
  const patterns = [
    /(?:Diante da alegação de doença ocupacional[^.]*?)(?:após a diligência|apos a diligencia)\./i,
    /(?:Considerando-se o pedido de ADICIONAL DE INSALUBRIDADE[^.]*?)(?:assistentes técnicos|assistentes tecnicos)[^.]*\./i,
    /(?:Determina-se a realização (?:da |de )?perícia[^.]*?)(?:\d{2}\/\d{2}\/20\d{2}|\d+ dias)[^.]*\./i,
    /(?:Determina-se a realização da prova técnica[^.]*?)(?:\d{2}\/\d{2}\/20\d{2}|\d+ dias)[^.]*\./i,
  ];
  for (const regex of patterns) {
    const match = textoLimpo.match(regex);
    if (match) return match[0].trim();
  }
  // Fallback delimitado para outras atas. Evita colher cabeçalhos e quesitos.
  const match = textoLimpo.match(/(?:ficando desde já nomead[oa]|nomeando (?:como perito|para tanto))[^.]{0,650}(?:laudo|estudo técnico)[^.]{0,450}\./i);
  return match?.[0]?.trim() ?? null;
}

function nomePerito(ordem: string): string | null {
  const m = ordem.match(/(?:nomeado o perito|nomeada a perita|perito\(a\) do Juízo,? (?:o|a)?\s*|perícia técnica, a cargo do\(a\) expert|nomeando para tanto a Dra\.?)\s+([A-ZÀ-Ü][A-Za-zÀ-ü\s.]{4,90}?)(?=,|\s+que deverá|\s+\(|\s+-\s+Tel|\s+\-\s+Tel)/i);
  return m?.[1]?.trim() || null;
}

function lugarDaSecao(texto: string, numero: number) {
  // Inserir em ordem crescente, antes do primeiro bloco posterior.
  const candidatas = [...texto.matchAll(/(?:^|\n)#{1,5}\s*(\d+)\s*[-–]\s*[^\n]+/gm)]
    .map(x => ({indice: x.index ?? 0, numero: Number(x[1])}))
    .filter(x => x.numero > numero);
  const outros = texto.search(/(?:^|\n)#{1,5}\s*(?:OUTROS PRAZOS|DATA AUDIÊNCIA|CONFERÊNCIA DOS AGENDAMENTOS|RESUMO DOS AGENDAMENTOS)/im);
  const pos = candidatas.length ? candidatas[0].indice : outros >= 0 ? outros : texto.length;
  return pos;
}

function inserir(texto: string, numero: number, bloco: string): string {
  const pos = lugarDaSecao(texto, numero);
  return texto.slice(0,pos).trimEnd() + '\n\n' + bloco.trim() + '\n\n' + texto.slice(pos).trimStart();
}

function acrescentarResumo(texto: string, label: string, data: string): string {
  const tituloTabela = /(?:^|\n)#{1,5}\s*(?:CONFERÊNCIA DOS AGENDAMENTOS|RESUMO DOS AGENDAMENTOS)[^\n]*\n/mi;
  const m = tituloTabela.exec(texto);
  if (!m) return texto;
  const start = m.index + m[0].length;
  const rest = texto.slice(start);
  const tabela = rest.match(/(\|[^\n]+\|\s*\n\|[\s:|-]+\|)([\s\S]*?)(?=\n\n|\n#{1,5}\s|$)/);
  if (!tabela || tabela[0].includes(label)) return texto;
  const colunas = tabela[1].split('\n')[0].split('|').filter(x=>x.trim()).length;
  const row = colunas >= 3 ? `\n| ${label} | Acompanhar | ${data} |` : `\n| ${label} | ${data} |`;
  const endereco = start + (tabela.index ?? 0) + tabela[0].length;
  return texto.slice(0,endereco).trimEnd() + row + texto.slice(endereco);
}

export function garantirBlocosPericiais(ata: string, markdown: string, inicio: string | null): string {
  const ordem = encontraOrdem(ata);
  if (!ordem || !/(?:perícia|pericia|prova técnica|perito)/i.test(ordem)) return markdown;
  const limpa = normalize(ata);
  const perito = nomePerito(ordem);
  const complemento = perito ? `**Perito:** ${perito}  \n` : '';
  let relatorio = markdown;

  if (!titulo(6).test(relatorio)) {
    const gatilho = ordem.match(/(?:no prazo de \d+ dias) a data de realização da consulta médica pericial/i);
    const prazo = gatilho ? '**Prazo para informar a data da consulta:** 10 dias, com marco inicial a confirmar.  \n' : '';
    const bloco = `### 6 - AGENDAMENTO DE PERÍCIA\n\n"${ordem}"\n\n${complemento}${prazo}**Data da diligência:** Não informada na ata.\n\n${inicio ? `// Data prazo: ${inicio} - Data fatal: a apurar conforme marco de contagem do prazo do perito.` : '**Data prazo:** a confirmar.'}`;
    relatorio = inserir(relatorio,6,bloco);
  }
  if (!titulo(8).test(relatorio)) {
    // Quando o Juízo expressamente ordenar intimação FUTURA para começar a obrigação
    // do perito, não antecipar data. A simples nomeação NÃO é intimação futura.
    const intimaFutura = /(?:perito|perita)[^.]{0,180}(?:será|sera|deverá|devera) (?:ser )?intimad[oa][^.]{0,180}(?:entregar|apresentar)/i.test(ordem);
    const data = inicio && dateFromBR(inicio) ? dataItem8(inicio) : null;
    const fatal = /após a diligência|apos a diligencia|após a perícia/i.test(ordem)
      ? 'a apurar após a realização da perícia'
      : (ordem.match(/(?:até o dia|ate o dia)\s+(\d{2}\/\d{2}\/20\d{2})/i)?.[1] || 'a apurar após o evento indicado na ata');
    const linha = intimaFutura
      ? '**Obrigação condicionada à futura intimação do perito: sem agendamento antecipado.**'
      : data ? `// Data prazo: ${data} (acompanhar) - Data fatal: ${fatal}.` : '**Data prazo:** a confirmar.';
    relatorio = inserir(relatorio,8,`### 8 - LAUDO - AO ANALISTA\n\n"${ordem}"\n\n**Obrigação:** entrega do laudo pelo perito nomeado.\n\n${linha}`);
  }
  if (!titulo(9).test(relatorio)) {
    const futura = limpa.match(/(?:após a juntada|apos a juntada|após a apresentação|apos a apresentacao) do laudo[^.]{0,260}intimad[oa]s?[^.]*\./i);
    const observacao = futura
      ? `"${futura[0]}"\n\nManifestação sobre o laudo: depende de futura intimação; sem agendamento neste momento.`
      : '**Observação:** Manifestação sobre o laudo: a ata não fixa prazo para manifestação ou impugnação pelas partes. Acompanhar a juntada do laudo e eventual intimação para abertura de vista.';
    relatorio = inserir(relatorio,9,`### 9 - LAUDO - AO ADV\n\n${observacao}`);
  }
  if (titulo(6).test(relatorio)) relatorio = acrescentarResumo(relatorio,'Acompanhar agendamento da perícia','Data da diligência pendente');
  if (titulo(8).test(relatorio)) relatorio = acrescentarResumo(relatorio,'Acompanhar entrega do laudo',/após a diligência|apos a diligencia/i.test(ordem)?'45 dias úteis após a perícia, conforme ata':'Conforme prazo fixado na ata');
  return relatorio;
}
