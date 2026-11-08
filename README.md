# Gitaí Leitor de Atas — V4.0 (baseado no v2.zip fornecido)

Este projeto preserva a arquitetura original com **extração estruturada (JSON)** do PDF pela IA, seguida de **cálculo de datas em TypeScript** e **formatação do relatório em código**. Não depende de a IA escrever o Markdown completo. 

## Correção decisiva

Depois da resposta JSON da IA, `lib/pericia.ts` lê diretamente o texto extraído do PDF e verifica ordens periciais. Se a IA omitir os itens **6 – AGENDAMENTO DE PERÍCIA**, **8 – LAUDO - AO ANALISTA** ou **9 – LAUDO - AO ADV**, os itens ausentes são acrescentados ao objeto estruturado ANTES do cálculo e da montagem do relatório.

O item 8 tem **Data prazo = primeiro dia útil após (DATA INÍCIO + 15 dias corridos)** com a marca `(acompanhar)`, inclusive para a data fatal condicionada à realização da perícia. Se a ordem estabelecer futura intimação expressa do perito, esse controle não é iniciado antecipadamente. A data fatal real não é inventada.

O item 7 conserva o prazo judicial extraído e recebe data de acompanhamento DATA INÍCIO + 1 dia corrido, ajustado ao próximo dia útil.

A extração depende de o PDF conter texto selecionável. A conferência é baseada em padrões para ordens periciais; casos de redação excepcional podem exigir revisão jurídica.

## Configuração

Na Vercel, importe o repositório como Next.js e configure:

- `OPENAI_API_KEY`: chave secreta da API.
- `APP_ACCESS_KEY`: senha de acesso à aplicação web (mantida da versão v2).
- `OPENAI_MODEL`: `gpt-6.1-sol` (solicitado). O identificador deve estar habilitado na sua conta API; se a API rejeitar o nome, configure um modelo autorizado.

Inicie com `npm install`, `npm run build` e `npm start`. Após o deploy, consulte `/api/versao`, que deve retornar `4.0.0-estruturado`.

## Teste de regressão

O arquivo `tests/pericia.test.ts` cobre a ata 0000744-09.2026.5.05.0102 com o padrão de omissão relatado. A reconciliação acrescenta os itens 6, 8 e 9. O cálculo espera:

`// Data prazo: 23/11/2026 (acompanhar) - Data fatal: a apurar após a realização da perícia.`

A V4 não foi implantada na sua conta Vercel e não houve teste real com sua chave da API. A verificação local cobre o pipeline de reconciliação e cálculo.
