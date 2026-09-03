# Qualificação do cliente, agendamento no cadastro e confirmação por WhatsApp — Design

Data: 2026-09-02 · Caminho: arquitetural · Status: decisões tomadas de forma autônoma a pedido do dono ("deixa pronto"), ajustáveis.

## 1. Problema

O relacionador cadastra o cliente num lugar e agenda em outro, e a informação fica dispersa. Ele quer que **um único cadastro** já deixe o cliente qualificado (interesse, valores que cabem no bolso, líder, presencial/online, dia e hora), que a **agenda receba o horário sozinha**, que o **card** mostre tudo isso de relance e que dê para **gerar a mensagem de confirmação** e mandar no WhatsApp com um clique.

## 2. Decisões de produto

| Tema | Decisão |
|---|---|
| Adesão | Campo "Adesão (entrada)" no cadastro, usando a coluna `adesao_cents` que já existia (preenchida antes só na aprovação). Opcional por regra, mas com destaque visual de "quase obrigatório" (dica no campo e badge "Sem adesão" no card enquanto vazio). A tela de aprovação continua editando o mesmo valor. |
| Parcela | Faixa "de … até …" em duas colunas novas: `installment_min_cents` e `installment_max_cents`. Só o "até" preenchido também vale (parcela fixa). Validação: até ≥ de. |
| Interesse | Entra `reforma` na lista. "Outro" passa a exigir o texto em "Detalhe do interesse", e esse texto vira o rótulo do chip (interesse personalizado sem coluna nova). |
| Agendamento no cadastro | Seção "Quando o cliente vem" com Data e Horário. Preenchidos os dois, o sistema cria o agendamento na agenda: tipo vem do atendimento (presencial → visita à loja, online → reunião online), duração padrão do tipo, lembrete padrão. O status do cliente vira "agendado" (regra que já existia). |
| Editar cliente | Os campos mostram o próximo agendamento pendente. Mudar dia/hora remarca esse agendamento (mantém tipo, duração, lembrete). Sem pendente e com dia/hora → cria. Campos vazios → não mexe na agenda (cancelar continua sendo na agenda, de propósito). |
| Mensagem de confirmação | Texto pronto no formato pedido pelo dono, gerado a partir do próximo agendamento pendente: `*Agendamento*` / Presencial ou Online / Consultor: nome do perfil / Nome / Data (com dia da semana) / Horário / Líder / Observação (interesse + detalhe). Botões "Copiar" (toast "Mensagem copiada.") e "Abrir no WhatsApp" (wa.me com o texto). Disponível na página do cliente e no menu "…" do card. |
| Card do funil | Além do que já mostra (interesse, loja/online, dia e hora em destaque, líder), ganha a linha de valores: carta · adesão · parcela. Interesse personalizado aparece no chip. |

## 3. Arquitetura

- `src/lib/domain.ts`: `INTERESTS` += `reforma`; `ATTENDANCE_APPOINTMENT_KIND`; `describeInterest(interest, notes)`.
- `src/db/schema.ts` + migração `0005_parcelas`: duas colunas inteiras nulas em `clients`. Antes disso, o snapshot `0004` (que faltava) é gerado para o drizzle-kit voltar a diferenciar a partir do estado real.
- `src/features/clients/schema.ts`: `adesao`, `installmentMin`, `installmentMax` (money), `scheduleDay`, `scheduleTime` (par opcional), regras cruzadas via `superRefine`.
- `src/features/clients/onboarding.ts`: `createClientWithSchedule` e `updateClientWithSchedule` orquestram cliente + agendamento. Fica fora de `clients/service.ts` porque `appointments/service.ts` já importa dele (evita ciclo).
- `src/features/clients/confirmation.ts`: `buildConfirmationMessage` puro, testado.
- `src/features/clients/components/confirmation-message.tsx`: cliente; textarea somente leitura + copiar + WhatsApp.
- `ClientForm` recebe `initialSchedule` (dia/hora do pendente) na edição; `Pipeline` e `ClientCard` recebem `consultantName` para o menu do card gerar a mensagem.

## 4. Erros e testes

- Falha ao criar o agendamento depois do cliente: o cliente fica salvo e o formulário mostra "Cliente salvo, mas o agendamento falhou: …" com link para agendar (sem transação, como o resto do sistema).
- Testes: schema (parcela invertida, outro sem detalhe, dia sem hora), `onboarding` (cria agendamento, remarca, não mexe quando vazio), `confirmation` (texto exato, online vs presencial, sem líder), card (mostra adesão/parcela e chip personalizado).

## 5. Fora deste spec (ficam registrados na auditoria)

Limite de taxa no login, redefinição de senha, transações, lembretes por líder. A auditoria de 2026-09-02 lista tudo com prioridade.
