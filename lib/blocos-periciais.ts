import { dataItem8 } from './datas';

/**
 * Pós-processamento determinístico. As ordens são obtidas do PDF, NÃO da narrativa
 * produzida pelo modelo. O modelo não pode omitir os controles periciais.
 */
const clean = (s: string) => s.replace(/<<<FIM_PAGINA>>>/g, '\n').replace(/\s+/g, ' ').trim();
const heading = (n: number) => new RegExp(`(?:^|\\n)#{1,6}\\s*${n}\\s*[-–—]\\s*`, 'im');
const esc = (s: string) => s.replace(/\*/g, '\\*').replace(/`/g, '\\`');
const quote = (s: string) => `"${esc(s.trim())}"`;

function orderSource(text: string) {
  const a = clean(text);
  // A frase começa na determinação e termina ao indicar prazo de laudo.
  // Não confiar em palavras do relatório de IA nem no cadastro da capa.
  const patterns = [
    /Diante da alegação de doença ocupacional,?[^.]{0,800}?após a diligência\./i,
    /Considerando-se o pedido de ADICIONAL DE INSALUBRIDADE,?[^.]{0,800}?(?:assistentes técnicos|assistentes tecnicos)[^.]{0,300}\./i,
    /Determina-se a realização (?:da |de )?perícia[^.]{0,850}?(?:\d{2}\/\d{2}\/20\d{2}|\d+ dias)[^.]{0,300}\./i,
    /Determina-se a realização da prova técnica[^.]{0,850}?(?:\d{2}\/\d{2}\/20\d{2}|\d+ dias)[^.]{0,300}\./i
  ];
  for (const p of patterns) { const m = a.match(p); if (m) return m[0]; }
  // Apenas se o PDF trouxer explicitamente nomeação + entrega de laudo.
  const start = a.search(/(?:ficando desde já nomeado o perito|nomeando como perito|perícia técnica, a cargo)/i);
  if (start < 0) return null;
  const fragment = a.slice(Math.max(0, start - 140), start + 1000);
  const m = fragment.match(/^[\s\S]{0,850}?(?:laudo|estudo técnico)[^.]{0,250}\./i);
  return m?.[0] ?? null;
}

function sourcePerito(text: string) {
  const p = text.match(/(?:nomeado o perito|nomeada a perita|a cargo do\(a\) expert|perito\(a\) do Juízo,? (?:o|a)?\s*|nomeando para tanto a Dra\.?|nomeando como perito\(a\) do Juízo,? (?:o|a)?\s*)\s+([A-ZÀ-Ü][A-Za-zÀ-ü\s.]{5,95}?)(?=,|\s+que deverá|\s*\(|\s*-\s*Tel)/i);
  return p?.[1]?.trim() ?? null;
}
function section(text: string, n: number) {
  const r = new RegExp(`(?:^|\\n)#{1,6}\\s*${n}\\s*[-–—]\\s*[^\\n]*\\n`, 'im');
  const m = r.exec(text);
  if (!m) return '';
  const start = m.index + m[0].length;
  const after = text.slice(start);
  const end = after.search(/(?:\n#{1,6}\s|\n---\s*\n)/);
  return end < 0 ? after : after.slice(0, end);
}
function insertBlock(text: string, number: number, content: string) {
  // Never insert after the final summary or before existing lower numbered headings.
  const candidates = [...text.matchAll(/(?:^|\n)#{1,6}\s*(\d+)\s*[-–—]/gm)]
    .filter(m => Number(m[1]) > number).map(m => m.index ?? text.length);
  const other = /(?:^|\n)#{1,6}\s*(?:OUTROS PRAZOS|DATA AUDIÊNCIA|RESUMO DOS AGENDAMENTOS|CONFERÊNCIA DOS AGENDAMENTOS|CONFERIR)\b/im.exec(text);
  if (other) candidates.push(other.index);
  const at = candidates.length ? Math.min(...candidates) : text.length;
  return text.slice(0, at).trimEnd() + '\n\n' + content.trim() + '\n\n' + text.slice(at).trimStart();
}
function pushSummary(text: string, label: string, deadline: string) {
  const h = /(?:^|\n)#{1,6}\s*(?:RESUMO DOS AGENDAMENTOS|CONFERÊNCIA DOS AGENDAMENTOS)\s*\n/im.exec(text);
  if (!h) return text;
  const start = h.index + h[0].length;
  const after = text.slice(start);
  const lines = after.split('\n');
  const header = lines.findIndex(s => /^\s*\|/.test(s));
  if (header < 0 || lines.some(s => s.includes(label))) return text;
  const cols = lines[header].split('|').filter(t => t.trim()).length;
  const separator = lines.findIndex((s,i)=>i>header&&/^\s*\|[\s:|\-]+\|\s*$/.test(s));
  if (separator < 0) return text;
  let index = separator+1;
  while(index<lines.length && /^\s*\|/.test(lines[index])) index++;
  lines.splice(index,0,cols>=3?`| ${label} | Acompanhar | ${deadline} |`:`| ${label} | ${deadline} |`);
  return text.slice(0,start)+lines.join('\n');
}

export function detectarPericia(ata: string) { return Boolean(orderSource(ata)); }

export function garantirBlocosPericiais(ata: string, markdown: string, inicio: string | null): string {
  const order = orderSource(ata);
  if (!order) return markdown;
  const a = clean(ata);
  const perito = sourcePerito(order);
  const title = perito ? `**Perito:** ${perito}  \n` : '';
  const wantsFutureIntimation = /(?:perito|perita)[^.]{0,190}(?:será|sera|deverá|devera) (?:ser )?intimad[oa][^.]{0,180}(?:entregar|apresentar)/i.test(order);
  const hasExplicitScheduling = /(?:deverá|devera) informar no prazo de (\d+) dias a data/i.exec(order);
  let report = markdown;

  if (!heading(6).test(report)) {
    const information = hasExplicitScheduling
      ? `**Prazo para o perito informar a data da consulta:** ${hasExplicitScheduling[1]} dias (marco inicial a conferir).` 
      : '**Data da diligência:** Não informada na ata.';
    const status = hasExplicitScheduling ? 'a apurar conforme início do prazo do perito' : 'a apurar (controle interno de três meses, se não houver prazo fixado)';
    report = insertBlock(report,6,`### 6 - AGENDAMENTO DE PERÍCIA\n\n${quote(order)}\n\n${title}${information}\n\n${inicio?`// Data prazo: ${inicio} - Data fatal: ${status}.`:'**DATA INÍCIO:** não identificada no PDF.'}`);
  }
  if (!heading(8).test(report)) {
    const fatalDate = order.match(/(?:até o dia|ate o dia)\s+(\d{2}\/\d{2}\/20\d{2})/i)?.[1];
    const fatal = fatalDate || (/após a diligência|após a perícia/i.test(order) ? 'a apurar após a realização da perícia' : 'a apurar após o evento indicado na ata');
    const date = inicio?dataItem8(inicio):null;
    const status = wantsFutureIntimation
      ? 'Obrigação dependente de futura intimação expressa do perito: sem data de acompanhamento antecipada.'
      : date ? `// Data prazo: ${date} (acompanhar) - Data fatal: ${fatal}.` : 'Data prazo: depende de identificação da DATA INÍCIO.';
    report = insertBlock(report,8,`### 8 - LAUDO - AO ANALISTA\n\n${quote(order)}\n\n**Obrigação:** o perito deverá apresentar o laudo.\n\n${status}`);
  }
  if (!heading(9).test(report)) {
    const future = a.match(/(?:após a juntada|após a apresentação) do laudo[^.]{0,240}intimad[oa]s?[^.]*\./i);
    report = insertBlock(report,9,future
      ? `### 9 - LAUDO - AO ADV\n\n${quote(future[0])}\n\n**Observação:** Manifestação sobre o laudo: depende de futura intimação; sem agendamento neste momento.`
      : `### 9 - LAUDO - AO ADV\n\n**Observação:** Manifestação sobre o laudo: a ata não fixa prazo para manifestação ou impugnação pelas partes. Acompanhar a juntada do laudo e eventual intimação para abertura de vista.`);
  }
  report = pushSummary(report,'Acompanhar agendamento da perícia','Data da consulta a confirmar');
  report = pushSummary(report,'Acompanhar entrega do laudo',/45 dias úteis após a diligência/i.test(order)?'45 dias úteis após a realização da perícia':'Conforme prazo de laudo na ata');
  return report;
}
