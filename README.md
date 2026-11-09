# Gitaí Leitor de Atas — V5.4 (Vercel)

Projeto Next.js baseado no fluxo estruturado da V4.1, com a **interface visual aprovada**: cabeçalho azul, acesso por senha na mesma página, área vermelha de upload de PDF com borda tracejada e **arrastar/soltar**, campo para colar texto, controles de limpeza e relatório jurídico completo.

## Interface

- **Login**: senha da equipe no painel à esquerda; `Entrar` valida a senha na API (`APP_ACCESS_KEY`) e `Sair` encerra a sessão de interface. Senha apenas em memória durante a sessão, não salva em storage.
- **Upload**: clique em `ESCOLHER ARQUIVOS` ou arraste um PDF para a área vermelha. Exibe nome, tamanho e botão Remover. Um PDF por análise, até 12 MB.
- **Entrada alternativa**: cole o texto da ata no campo de texto.
- **Analisar ata**: gera o relatório a partir de PDF/texto, desde que o login esteja ativo.
- **Limpar campos**: limpa PDF e texto; preserva relatório e acesso.
- **Limpar análise**: limpa o relatório e eventuais erros; preserva PDF, texto e acesso.
- **Limpar tudo**: limpa PDF, texto e relatório, mas mantém login.
- **Sair**: remove dados da tela e encerra o acesso.
- **Copiar / Exportar TXT / Exportar PDF**: a exportação PDF usa o diálogo de impressão do navegador (escolha Salvar como PDF).

## Motor jurídico

Mantém a base V4: extração estruturada, cálculo determinístico de prazos e reconciliação pericial diretamente com o texto original. O item 8 exibe a Data prazo (DATA INÍCIO + 15 dias corridos, com ajuste ao próximo dia útil) e `(acompanhar)` quando a obrigação não depende de nova intimação.

## Vercel

1. Descompacte o ZIP e publique **o conteúdo da pasta** na raiz de um repositório GitHub.
2. Importe esse repositório na Vercel como projeto Next.js e utilize Node.js 20+.
3. Configure as variáveis de ambiente conforme `.env.example`:

```
OPENAI_API_KEY=chave_da_API
APP_ACCESS_KEY=senha_da_equipe
OPENAI_MODEL=gpt-6.1-sol
```

O identificador do modelo é configurável; confirme que sua conta API tem acesso a ele. Se indisponível, substitua por um modelo efetivamente habilitado. Não insira segredos no GitHub.

4. Faça **Deploy** (ou Redeploy após atualizar variáveis). Abra `/api/versao` e confira `5.4.0-citacao-integral-pdf`.
5. Teste a ata `0000744-09.2026.5.05.0102` e confirme os itens 6, 7, 8 e 9 antes do uso em produção.

## Testes executados

- `node --experimental-strip-types tests/calendar.test.ts` — OK.
- `npm run test:pericia` — OK.

Não foi executado um build Next.js completo com `npm install` nem chamadas reais à API neste ambiente. Verifique os logs do deploy e valide juridicamente as saídas antes de lançar prazos no sistema.

## Endpoint de versão

`GET /api/versao` retorna o identificador do deploy; se a aplicação exibir versão diferente, a Vercel ainda não está executando esta versão.

## Correção V5.1: "Citação ausente no ato 5"

A API antiga rejeitava toda a resposta quando qualquer ato apresentava `quotes: []`, inclusive o item 9, que pode ser uma observação legítima sem citação literal. A V5.1 aceita esse caso como **observação sem prazo** e mantém a análise. Para os demais atos sem qualquer citação, a V5.1 não fabrica texto nem autoriza prazo não comprovado: registra um aviso explícito de conferência no resultado. A rotina de perícia continua a reconciliar os itens 6, 8 e 9 com o texto original do PDF.

**Verificação:** após o deploy, consulte `/api/versao`: `5.4.0-citacao-integral-pdf`.

**Teste de regressão:** `npm run test:validacao`. Também execute `npm run test:dates` e `npm run test:pericia`.

Faça um novo deploy a partir do código atualizado; modificar somente variáveis de ambiente não corrige a versão em execução.


## Alterações V5.3 — padronização da saída

- Relatório jurídico estruturado com transcrições ampliadas (itens 6 e 8, quando o texto do PDF confirma a frase completa).
- Item 6 com perito, acompanhamento da diligência e Data prazo / Data fatal.
- Item 8 com `(acompanhar)` e Data fatal condicionada quando a perícia não ocorreu.
- Testemunhas de audiência futura concentradas em DATA AUDIÊNCIA, sem duplicação em OUTROS PRAZOS quando não existir obrigação autônoma.
- Resumo final com **Providência | Data prazo | Data fatal**, na ordem dos itens.
- Versão identificada na interface e em `/api/versao`.
- Mecanismo jurídico e calculadora da V5.1 mantidos; modelo padrão `gpt-6.1-sol` preservado.

**Para evitar versões misturadas:** substitua todos os arquivos do projeto na branch ligada à Vercel. Após publicar, verifique `/api/versao`. Se a versão anterior continuar, confira branch, root directory e deploy de produção.

**Testes locais executados:** `npm run test:pericia`, `npm run test:validacao`, `npm run test:dates` e `node tests/relatorio-adriana-check.cjs`. O build Next.js completo e as chamadas reais à API precisam de dependências instaladas e ambiente configurado.


## Ajustes da V5.3 (somente texto e fundamentação dos agendamentos)
- Quando o trecho integral está no PDF, a reconciliação recupera o início da determinação pericial nos itens 6 e 8.
- No item 6, inclui a advertência sobre ausência injustificada se constar do texto da ata.
- No item 8, explicita os dias úteis e o evento de início do prazo do laudo *somente quando sustentados pela transcrição*.
- No bloco DATA AUDIÊNCIA, destaca depoimento sob pena de confissão e testemunhas sem intimação quando expressamente determinados.
- Mantidos calendário, três colunas do resumo, interface de login e PDF por arrastar/soltar.
- Versão: `5.4.0-citacao-integral-pdf`, verificar em `/api/versao` após deploy.

### Validação
Passaram os testes locais de validação, perícia e regressão da ata de Adriana. O build integral Next.js e a API OpenAI dependem da instalação das dependências e das credenciais na Vercel; não foram executados neste ambiente.

## V5.4 — Citação integral (itens 6 e 8)

O servidor recupera a determinação pericial completa do texto extraído do PDF, mesmo se a IA fornecer somente um trecho a partir de “nomeado o perito”. O acréscimo é feito apenas se houver correspondência verificável com a ordem do mesmo perito; não cria conteúdo nem modifica as regras de prazos. Teste com `node tests/citacao-integral-check.cjs` depois de compilar os módulos TypeScript.
