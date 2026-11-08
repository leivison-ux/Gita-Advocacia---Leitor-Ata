# Gitaí — Leitor de Atas Trabalhistas V2.2

Projeto independente para publicação na Vercel com interface de upload PDF e análise no padrão do plugin **Prazos de Atas Trabalhistas**.

## Como publicar na Vercel

1. Crie um repositório GitHub com os arquivos desta pasta e importe-o em [vercel.com/new](https://vercel.com/new).
2. Em **Settings > Environment Variables**, configure `OPENAI_API_KEY` e opcionalmente `OPENAI_MODEL` (padrão `gpt-6.1-sol`). Não coloque a chave no código.
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

## O que foi corrigido na V2.1

A versão anterior podia omitir os itens **6 – AGENDAMENTO DE PERÍCIA**, **8 – LAUDO - AO ANALISTA** e **9 – LAUDO - AO ADV**, embora estivessem no prompt. Esta atualização inclui `lib/validacao.ts`, que examina as determinações da ata e verifica se os blocos obrigatórios aparecem no relatório. Se faltar algum, o servidor pede uma **revisão completa** à IA com a ata original, sem apagar os demais itens. Se persistir uma omissão, retorna erro explicativo em vez de exibir um relatório incompleto.

**Teste de referência:** processo `0000744-09.2026.5.05.0102`: devem aparecer 6, 7, 8, 9, OUTROS PRAZOS, DATA AUDIÊNCIA e tabela. O item 8 deve trazer `23/11/2026 (acompanhar)` e a data fatal condicionada à realização da perícia.

O bloqueio é uma verificação estrutural, não uma garantia de que todo cálculo e toda conclusão jurídica estejam corretos. É indispensável a revisão profissional.


## Versão 2.2 — modelo Sol e blocos de perícia

O modelo padrão da API é `gpt-6.1-sol`, configurável por `OPENAI_MODEL`. A geração de blocos 6, 8 e 9 recebe uma camada de completude determinística (lib/blocos-periciais.ts), para evitar que a IA os omita mesmo na segunda tentativa. O item 8 tem controle +15 dias corridos conforme as instruções, quando não houver gatilho expresso de intimação futura do perito. Confira a fidelidade jurídica antes de utilizar em peticionamento ou lançar prazos.


## Como verificar que a Vercel publicou realmente a versão nova

1. Faça o deploy da **V3.0** no **mesmo projeto** que atende `gitai-leitor-ata.vercel.app`, não em outro projeto.
2. Confirme a variável de ambiente `OPENAI_MODEL=gpt-6.1-sol` em **Production**, e republique.
3. Abra `https://gitai-leitor-ata.vercel.app/api/versao` em nova guia. A resposta esperada deve conter `"versao":"3.0.0-estrutura-validada"` e `"validacaoPericial":true`.
4. A página deve mostrar **Versão 3.0** (e, depois de analisar, "Motor: 3.0.0-estrutura-validada"). Se ainda mostrar Versão 2.1 ou a URL /api/versao retornar 404, a Vercel NÃO está publicando esta versão; revise **Project > Settings > Git** (repositório e branch de produção) e **Root Directory**, depois faça **Redeploy** sem reutilizar cache.
5. Teste com a ata `0000744-09.2026.5.05.0102`. Devem aparecer **6, 7, 8, 9, OUTROS PRAZOS e DATA AUDIÊNCIA**. O item 8 deve trazer `23/11/2026 (acompanhar)`; o item 7, data prazo `06/11/2026`.
6. A resposta da rota `/api/analisar` inclui `versao`, `modelo`, `periciaDetectada` e `itensPericiais`, úteis para auditoria técnica, sem expor a chave de API.

**Diagnóstico do erro anterior:** a V2.2 ainda mostrava **Versão 2.1** na interface, o que impossibilitava confirmar o deployment. A V3.0 passou a incluir identificador visível e endpoint independente de diagnóstico. A completude de perícias é conferida diretamente contra o texto do PDF por uma camada determinística após a geração pela IA.

**Limite:** não foi possível executar chamada real à API da OpenAI sem a chave do projeto; os testes locais validam a composição das seções a partir do texto de PDF, não a qualidade de cada resposta do modelo nem o deploy na conta da Vercel.
