# Prazos de Atas Trabalhistas — versão 2

Next.js pronto para Vercel. A IA **extrai** obrigações/trechos e o JavaScript **calcula** datas úteis em UTC. A resposta JSON é validada e só então transformada em relatório.

## Publicar

1. Substitua os arquivos do repositório GitHub pelos desta versão, preservando `.env.local` apenas localmente.
2. Vercel > Settings > Environment Variables: `OPENAI_API_KEY`, `OPENAI_MODEL` (padrão `gpt-6-luna`, ou outro modelo disponível em sua conta), `APP_ACCESS_KEY`.
3. Instalação `npm install`, build `npm run build`, output Next.js padrão; faça Redeploy.
4. Teste primeiro com texto colado e depois com PDF text-selectable.

## Prazos

- `business_after_hearing`: N dias úteis após audiência; primeiro dia útil seguinte é dia 1.
- `business_from_date`: N dias úteis com marco expresso **inclusivo**.
- `after_previous`: prazo sucessivo de N dias úteis após o vencimento anterior.
- `fixed`: data expressa da ata, mantida mesmo quando não útil, com alerta.
- `future_notice`: sem datas antes da intimação futura.
- Dias corridos / 48h são calculados apenas quando a IA classifica explicitamente; conferir horários e regras.
- `Data prazo` interna: 1 = primeiro útil, 7 = Data início +1 dia, 8 = Data início +15 dias, 9 = Data início +20 dias, todos com ajuste para útil; jamais posterior ao fatal.
- Calendário: sábado/domingo, feriados **nacionais fixos** e Sexta-feira Santa. **Não** calcula suspensão do TRT, pontos facultativos ou feriados locais: conferir no PJe.

## Testes

`npm run test:dates` testa datas com Node.js após instalar TypeScript (`npm install`).

## Limitações de uso

A leitura de PDFs digitalizados exige OCR externo. O sistema não faz pesquisa de jurisprudência ou consulta ao PJe. A IA ainda interpreta o documento: prazos e destinatários **precisam de conferência humana** antes da protocolização. A senha compartilhada é autenticação básica; para uso multiusuário com documentos sensíveis, incluir login individual, rate limiting, logs auditáveis e retenção de dados apropriada. Arquivos são tratados em memória por requisição, sem persistência implementada.
