/** Calendário nacional de referência; feriados locais e suspensões judiciais não são aplicados. */
const FIXOS = new Set(['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25']);
const pad = (n: number) => String(n).padStart(2, '0');
const isoToUTC = (s: string) => new Date(`${s}T12:00:00Z`);
const toIso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
const fmt = (d: Date) => `${pad(d.getUTCDate())}/${pad(d.getUTCMonth()+1)}/${d.getUTCFullYear()}`;
function plus(d: Date, n: number) { const c = new Date(d); c.setUTCDate(c.getUTCDate() + n); return c; }
function isBusiness(d: Date) {
  const dow = d.getUTCDay();
  const mmdd = `${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
  return dow !== 0 && dow !== 6 && !FIXOS.has(mmdd);
}
function nextBusiness(d: Date) { let x = new Date(d); while (!isBusiness(x)) x = plus(x, 1); return x; }
export function dateFromBR(s: string): Date | null {
  const m = s.match(/^(\d{2})\/(\d{2})\/(20\d{2})$/);
  if (!m) return null;
  const d = isoToUTC(`${m[3]}-${m[2]}-${m[1]}`);
  return Number.isNaN(d.getTime()) || fmt(d) !== s ? null : d;
}
export function dataInicio(audiencia: string) {
  const d = dateFromBR(audiencia);
  return d ? fmt(nextBusiness(plus(d, 1))) : null;
}
export function dataItem8(inicio: string) {
  const d = dateFromBR(inicio);
  return d ? fmt(nextBusiness(plus(d, 15))) : null;
}
export function prazoDiasUteis(inicio: string, dias: number) {
  const d = dateFromBR(inicio);
  if (!d || !Number.isInteger(dias) || dias < 1) return null;
  let x = nextBusiness(d);
  for(let i=1; i<dias; i++) x = nextBusiness(plus(x, 1));
  return fmt(x);
}
export function confereItem8(texto: string, inicio: string): string {
  const date = dataItem8(inicio);
  if (!date) return texto;
  // Revisa cada seção 8, sem alterar seu conteúdo jurídico nem criar laudos sem evidência.
  return texto.replace(/(#{2,4}\s*8\s*[-–]\s*LAUDO\s*[-–]\s*AO ANALISTA\b)([\s\S]*?)(?=\n#{2,4}\s|\n---\s*\n|$)/gi,
    (_whole, titulo: string, conteudo: string) => {
      const linha = /\/\/\s*Data prazo:\s*[^\n]*?(?:Data fatal:\s*[^\n]*)?/i;
      if (/obrigação condicionada à futura intimação|aguardar (?:a )?intimação do perito/i.test(conteudo)) return titulo + conteudo;
      if (linha.test(conteudo)) {
        return titulo + conteudo.replace(linha, (original: string) => {
          const fatal = original.match(/Data fatal:\s*(.+)$/i)?.[1]?.trim() || 'a apurar após a realização da perícia';
          return `// Data prazo: ${date} (acompanhar) - Data fatal: ${fatal}`;
        });
      }
      return `${titulo}${conteudo.trimEnd()}\n\n// Data prazo: ${date} (acompanhar) - Data fatal: a apurar após o evento indicado na ata.\n`;
    });
}
