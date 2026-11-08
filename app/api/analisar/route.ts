import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { PROMPT } from '@/lib/prompt';
import { confereItem8, dataInicio, dataItem8 } from '@/lib/datas';
import { validarAnalise } from '@/lib/validacao';
import { garantirBlocosPericiais } from '@/lib/blocos-periciais';

export const runtime = 'nodejs';
export const maxDuration = 60;
const MAX_SIZE = 12 * 1024 * 1024;

function detectaAudiencia(texto: string): string | null {
  const trecho = texto.split('<<<FIM_PAGINA>>>')[1] || texto;
  const m = trecho.match(/Em\s+(\d{1,2})\s+de\s+(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(20\d{2})/i);
  if (!m) return null;
  const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const mes = meses.indexOf(m[2].toLowerCase().replace('marco', 'março')) + 1;
  return `${m[1].padStart(2,'0')}/${String(mes).padStart(2,'0')}/${m[3]}`;
}

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({error:'OPENAI_API_KEY não configurada no servidor.'},{status:503});
  try {
    const form = await req.formData();
    const file = form.get('arquivo');
    if (!(file instanceof File)) return NextResponse.json({error:'Selecione um PDF.'},{status:400});
    if (!file.name.toLowerCase().endsWith('.pdf') || file.type && file.type !== 'application/pdf') return NextResponse.json({error:'O arquivo deve ser PDF.'},{status:400});
    if (file.size > MAX_SIZE) return NextResponse.json({error:'Arquivo acima de 12 MB. Divida o PDF ou reduza o tamanho.'},{status:413});
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.toString('latin1',0,5) !== '%PDF-') return NextResponse.json({error:'PDF inválido.'},{status:400});
    // pdf-parse v1 é CommonJS; evita falha de tipagem no build Next.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require('pdf-parse') as (b: Buffer, options?: any)=>Promise<{text:string;numpages:number}>;
    const result = await pdfParse(buffer, {
      pagerender: async (pageData: any) => {
        const content = await pageData.getTextContent();
        let previousY: number | undefined;
        const parts: string[] = [];
        for (const item of content.items) {
          const y = item.transform?.[5];
          if (previousY !== undefined && y !== previousY) parts.push('\n');
          parts.push(String(item.str || '') + ' ');
          previousY = y;
        }
        return parts.join('') + '\n<<<FIM_PAGINA>>>\n';
      }
    });
    const extraido = result.text.trim();
    if (extraido.length < 140) return NextResponse.json({error:'Não foi possível extrair texto suficiente. O PDF pode ser uma imagem digitalizada. Use uma versão com OCR.'},{status:422});
    // Limite de entrada contra PDFs muito longos; atas normais são curtas.
    if (extraido.length > 90000) return NextResponse.json({error:'PDF excede o limite de texto da análise. Separe a ata do restante do processo.'},{status:422});
    const audiencia = detectaAudiencia(extraido);
    const inicio = audiencia ? dataInicio(audiencia) : null;
    const calculo = inicio ? `\nDATA DA AUDIÊNCIA IDENTIFICADA NO PDF: ${audiencia}. DATA INÍCIO CALCULADA: ${inicio}. DATA PRAZO OBRIGATÓRIA ITEM 8 (15 dias corridos após DATA INÍCIO, próximo dia útil): ${dataItem8(inicio)}.` : '\nATENÇÃO: não foi possível detectar com certeza a data da audiência. Evite inventar datas.';
    const client = new OpenAI({apiKey:process.env.OPENAI_API_KEY, timeout:52000, maxRetries:1});
    const chat = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-6.1-sol',
      temperature: 0,
      messages:[{role:'system',content:PROMPT + calculo},{role:'user',content:`Analise a ATA COMPLETA abaixo. Preserve todas as determinações e seus prazos.\n\n${extraido}`}]
    });
    let resposta = chat.choices[0]?.message?.content?.trim();
    if (!resposta) return NextResponse.json({error:'O modelo não retornou uma análise.'},{status:502});
    // Pós-validação: nunca publicar silenciosamente uma análise que omita
    // perícia, laudo, quesitos, manifestação sobre laudo ou audiência futura.
    resposta = garantirBlocosPericiais(extraido, resposta, inicio);
    if (inicio) resposta = confereItem8(resposta, inicio);
    let pendencias = validarAnalise(extraido, resposta, inicio ? dataItem8(inicio) : null);
    if (pendencias.length) {
      const reparo = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-6.1-sol',
        temperature: 0,
        messages: [
          { role: 'system', content: PROMPT + calculo },
          { role: 'user', content: `A primeira análise OMITIU itens obrigatórios. Refaça o relatório COMPLETO, mantendo todos os dados corretos e corrigindo as omissões. NÃO elimine os demais itens.

FALHAS DETECTADAS:
${pendencias.map(p=>'- '+p.explicacao).join('\n')}

ATA ORIGINAL COMPLETA:
${extraido}

ANÁLISE ANTERIOR (INCOMPLETA):
${resposta}` }
        ]
      });
      const corrigida = reparo.choices[0]?.message?.content?.trim();
      if (corrigida) {
        resposta = garantirBlocosPericiais(extraido, corrigida, inicio);
        if (inicio) resposta = confereItem8(resposta, inicio);
      }
      pendencias = validarAnalise(extraido, resposta, inicio ? dataItem8(inicio) : null);
    }
    if (pendencias.length) return NextResponse.json({
      error: `A análise automática permaneceu incompleta (${pendencias.map(p=>p.campo).join(', ')}). Nenhum relatório parcial foi exibido. Revise o PDF e tente novamente.`,
      detalhes: pendencias
    }, {status:422});
    return NextResponse.json({markdown:resposta,paginas:result.numpages,arquivo:file.name,audiencia,inicio,modelo:process.env.OPENAI_MODEL || 'gpt-6.1-sol'});
  } catch(e:any) {
    const status = e?.status === 429 ? 429 : 500;
    return NextResponse.json({error:status===429?'Limite da API atingido. Tente novamente mais tarde.':`Falha na análise: ${e?.message || 'erro desconhecido'}`},{status});
  }
}
