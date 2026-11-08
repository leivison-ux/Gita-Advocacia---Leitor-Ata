# Gitaí — Leitor de Atas Trabalhistas V2

Projeto independente para publicação na Vercel com interface de upload PDF e análise no padrão do plugin **Prazos de Atas Trabalhistas**.

## Como publicar na Vercel

1. Crie um repositório GitHub com os arquivos desta pasta e importe-o em [vercel.com/new](https://vercel.com/new).
2. Em **Settings > Environment Variables**, configure `OPENAI_API_KEY` e opcionalmente `OPENAI_MODEL` (padrão `gpt-4.1-mini`). Não coloque a chave no código.
3. Selecione **Framework Preset: Next.js** e implante. O PDF é enviado apenas à rota protegida no servidor da sua aplicação; o texto é enviado à API da OpenAI para análise.
4. Para testar localmente: `npm install`, crie `.env.local` a partir de `.env.example`, e execute `npm run dev`.

## Arquitetura

- `/app/page.tsx`: interface e visualização em Markdown, cópia e exportação do relatório.
- `/app/api/analisar/route.ts`: valida PDF, extrai texto integral com separador de páginas, identifica data da audiência e chama a OpenAI.
- `/lib/prompt.ts`: regras de análise operacional de atas, itens 1/4/6/7/8/9, audiência, acordo, Sum 197, resumo.
- `/lib/datas.ts`: cálculo determinístico do item 8. `DATA INÍCIO + 15 dias corridos`, ajustada ao próximo dia útil, com `(acompanhar)` obrigatório.

## Limites e cuidados

- Não é uma cópia do código do site existente, porque o acesso ao repositório-fonte não foi fornecido.
- Textos PDF digitalizados sem camada de texto precisam de OCR (não incluído nesta versão).
- Os feriados nacionais fixos estão em `lib/datas.ts`; **não há consulta automática a calendários de suspensão do tribunal**. Ajuste para calendários oficiais antes de usar os resultados como prazo fatal.
- O modelo pode errar interpretação jurídica; a conferência humana do PDF e do PJe é obrigatória. A pós-validação automatizada do item 8 protege sua **Data prazo**, mas a data fatal deve ser conferida na ata.
- As regras completas do plugin instalado podem evoluir; para sincronizar exatamente, substitua ou atualize `lib/prompt.ts` conforme as versões posteriores do plugin.
- Não há banco de dados, conta de usuário ou armazenamento permanente de arquivos nesta versão.

## Teste mínimo recomendado

Ata 0000744-09.2026.5.05.0102, audiência em 04/11/2026: a **DATA INÍCIO** deve ser 05/11/2026, e o **item 8** deve ter `// Data prazo: 23/11/2026 (acompanhar) - Data fatal: a apurar após a realização da perícia.`. O evento que condiciona a data fatal é a realização da perícia médica.
