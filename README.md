# Gitaí Leitor de Atas — V4.1 (Login + Limpeza)

Esta versão usa a **base V4 derivada do v2.zip**, com extração estruturada em JSON, cálculo determinístico dos prazos e reconciliação das perícias a partir do texto original da ata. A lógica de análise da V4 foi preservada.

## Interface restaurada

- **Tela de login:** entrada com senha `APP_ACCESS_KEY`, validada pelo servidor em `POST /api/auth/verificar`. A senha não é gravada em cookies, localStorage ou sessionStorage; após atualizar a página é necessário fazer login novamente.
- **Tela de análise:** envio de PDF, alternativa para colar texto e identificação visível da versão.
- **Limpar campos / Limpar tudo:** remove PDF selecionado, texto colado, relatório anterior e mensagens de erro; preserva o login.
- **Limpar análise:** apaga somente o resultado mostrado; preserva os dados de entrada.
- **Remover arquivo:** exclui apenas o PDF selecionado do formulário.
- **Sair:** limpa dados da análise e senha de acesso da memória do navegador e retorna ao login.
- **Exportar .txt e Copiar:** ações de saída da versão anterior.

Observação: a limpeza elimina os dados **da tela atual**; o PDF é processado a cada envio e não é salvo pela aplicação. Ela não apaga logs ou registros que possam existir em serviços de terceiros. A aplicação não fornece gerenciamento de usuários nem contas individuais: usa uma senha compartilhada, como na base fornecida.

## Configuração na Vercel

Use Node.js 20+ e importe este projeto como **Next.js**. Configure as variáveis de ambiente:

```
OPENAI_API_KEY=sua-chave-de-api
APP_ACCESS_KEY=sua-senha-forte
OPENAI_MODEL=gpt-6.1-sol
```

`OPENAI_MODEL` deve ser um modelo disponível na sua conta OpenAI API. O modelo de fallback no código é `gpt-6.1-sol`, preservado da V4.

Publique com `npm install` e `npm run build`. Em seguida, confira `GET /api/versao`: a resposta deve incluir `4.1.0-login-limpeza`.

## Testes

Foram executados testes locais do cálculo de datas e da reconciliação de perícia:

- `node --experimental-strip-types tests/calendar.test.ts` — OK
- `tsc --module commonjs --target es2020 --skipLibCheck --outDir .test-build lib/calendar.ts lib/pericia.ts lib/report.ts && node tests/pericia-check.cjs` — OK

Não foi possível rodar o build Next.js completo neste ambiente porque a instalação de dependências por `npm install` não concluiu. Faça o build na Vercel e verifique os logs. A análise completa ainda depende de testar a API com uma chave válida.

## Teste de regressão

Na ata 0000744-09.2026.5.05.0102, a reconciliação da V4 assegura o reconhecimento dos controles 6, 8 e 9. O item 8 deve apresentar:

`// Data prazo: 23/11/2026 (acompanhar) - Data fatal: a apurar após a realização da perícia.`
