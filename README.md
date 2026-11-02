# Prazos de Atas Trabalhistas — Web

Aplicação Next.js pronta para GitHub + Vercel. Replica a lógica de agendamentos para SODEXO, FORTBRAS, CARREFOUR/ATACADÃO e WMS, com transcrição das passagens relevantes da ata. Usa a **Responses API** e por padrão **`gpt-6-luna`**, modelo econômico atual. Se sua conta não oferecer acesso, altere `OPENAI_MODEL` para `gpt-5-mini` (ou outro modelo habilitado).

## Implantação

1. Extraia o ZIP e publique **os arquivos da pasta** num repositório GitHub **privado** (sem incluir `.env` ou chave de API).
2. Em https://vercel.com/new, importe o repositório. Framework: **Next.js**.
3. Em **Project Settings > Environment Variables**, cadastre:
   - `OPENAI_API_KEY`: sua chave de API OpenAI
   - `OPENAI_MODEL`: `gpt-6-luna` (padrão)
   - `APP_ACCESS_KEY`: senha longa e exclusiva para acesso ao site
4. Faça Deploy. Para testar local: `npm install`, copie `.env.example` para `.env.local`, configure valores, `npm run dev`.

## Economia de tokens

- Extração de texto localmente na função Next.js, antes da chamada à IA (não manda o PDF binário nem imagens para a API).
- Apenas 1 chamada à Responses API por ata.
- Sem ferramenta de busca web, sem histórico de conversação e sem repetição de PDFs anteriores.
- Prompt estático para favorecer reutilização em cache quando suportada.
- Limite de entrada 100 mil caracteres e saída de 4.200 tokens; veja o consumo retornado no rodapé do relatório.

## Segurança e limites

- API key fica somente no servidor; não faça commit de credenciais.
- A senha APP_ACCESS_KEY é uma proteção mínima de uso interno, não substitui login corporativo, controle individual de usuários, auditoria, rate limiting e políticas LGPD. Use repositório privado e acesso restrito. Para implantação pública, adicione autenticação robusta (ex.: Vercel Authentication/SSO), limitação de taxa por usuário e revisão de privacidade.
- PDFs de até **12 MB** com camada de texto. Digitalizações sem texto exigem OCR antes de envio. A aplicação não tem OCR.
- Não grava atas em banco de dados e define `store:false` na chamada da API; verifique políticas contratuais de dados e retenção aplicáveis à sua conta.
- Conferir sempre os prazos no PJe e nos calendários oficiais. A aplicação não consulta automaticamente expedientes locais nem acompanha intimações posteriores.
- A performance do modelo mini/econômico pode ser inferior à de modelos maiores em atas muito complexas; valide os primeiros resultados antes de usar em produção.

## Personalização

Edite `lib/prompt.ts` para aprimorar as instruções jurídicas. Edite `app/page.tsx` e `app/style.css` para visual. Defina `OPENAI_MODEL` sem editar código.
