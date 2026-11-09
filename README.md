# Gitaí Leitor de Atas V5.6 — correção da ordem de leitura do PDF

A V5.5 recuperava o parágrafo completo, mas o parser do PDF deslocava o fragmento «doença ocupacional» para depois de «reputa-se imprescindível a». A V5.6 aplica um reparo determinístico **restrito à sequência anômala comprovada no PDF da Adriana** antes da reconciliação dos itens 6 e 8. A API informa `auditoriaPericia.pdfOrderingRepaired` e descarta um aviso de ordenação já sanado no mesmo parágrafo. Reorganiza apenas palavras existentes; não altera prazos, transcrições de outros processos ou a interface.

A regex não pretende corrigir universalmente todos os PDFs com problemas de ordem visual. Para outros documentos, será necessário diagnóstico específico ou extrator posicional.

Publicação: instalar o projeto completo ou aplicar os arquivos modificados ao projeto V5.5, efetuar deploy e confirmar `/api/versao` = `5.6.0-ordem-textual-pdf`.

Testes: `npm run test:pericia` e `node tests/citacao-integral-check.cjs` após compilação. Inclui fixture de texto extraído diretamente do PDF da Adriana via `pdftotext -raw`, que reproduz o problema da V5.5. Build Next.js/API real não verificados.
