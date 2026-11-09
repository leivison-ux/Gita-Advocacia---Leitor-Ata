# Gitaí Leitor de Atas — V5.5

Correção da recuperação da determinação pericial no relatório e do número de versão mostrado no cabeçalho.

- Para **6 – AGENDAMENTO DE PERÍCIA** e **8 – LAUDO - AO ANALISTA**, a API tenta localizar o parágrafo completo no texto real extraído do PDF e substitui o recorte da IA apenas se conseguir vincular a mesma determinação/perito.
- A API retorna `auditoriaPericia.expanded` (itens ampliados nesta análise) e `auditoriaPericia.pending` (itens que não puderam ser vinculados). Isso permite diagnosticar o resultado sem supor que a correção ocorreu.
- O cabeçalho agora busca a versão de `/api/versao`, sem manter o texto V5.2 fixo.
- Não houve alteração nas regras de prazos, nas datas nem na interface de upload.

## Publicação na Vercel

Substitua o conteúdo do repositório de produção pelos arquivos do projeto completo, preservando as variáveis de ambiente `OPENAI_API_KEY`, `APP_ACCESS_KEY` e `OPENAI_MODEL`. Faça o deploy sem cache, confirme `/api/versao` igual a `5.5.0-recuperacao-citacoes-diagnosticada` e teste com o PDF original.

**Teste local:** compilação dos módulos de calendário/validação/perícia/relatório e testes automatizados, incluindo a ata da Adriana. **Não verificado:** build completo do Next.js nem integração com a API OpenAI na Vercel.
