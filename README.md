# Gitaí Leitor de Atas — V5 (Vercel)

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

4. Faça **Deploy** (ou Redeploy após atualizar variáveis). Abra `/api/versao` e confira `5.0.0-dropzone-login`.
5. Teste a ata `0000744-09.2026.5.05.0102` e confirme os itens 6, 7, 8 e 9 antes do uso em produção.

## Testes executados

- `node --experimental-strip-types tests/calendar.test.ts` — OK.
- `npm run test:pericia` — OK.

Não foi executado um build Next.js completo com `npm install` nem chamadas reais à API neste ambiente. Verifique os logs do deploy e valide juridicamente as saídas antes de lançar prazos no sistema.

## Endpoint de versão

`GET /api/versao` retorna o identificador do deploy; se a aplicação exibir versão diferente, a Vercel ainda não está executando esta versão.
