# Aragon-app-backend — Sprint Subtasks

Subtarefas e critérios de aceite para a sprint de retomada sobre indexação e metadata.

## 1) Reorg-safe indexing (confirmations & idempotency)
- [ ] Implementar verificação de confirmações configurável antes de marcar eventos como finalizados
  - Acceptance: eventos só são considerados final após N confirmações; testes simulam reorg e confirmam rollback
  - Estimate: 8h
- [ ] Tornar handlers idempotentes (persist/retry seguro)
  - Acceptance: reprocessar mesmo evento não cria duplicata nem falha pipeline
  - Estimate: 4h

## 2) Catch-up strategy (backfill & checkpointing)
- [ ] Implementar checkpointing por bloco/slot para retomar indexação
  - Acceptance: indexer resume a partir do último checkpoint sem reprocessar grandes janelas
  - Estimate: 6h
- [ ] Criar utilitário de backfill controlado (batch size + rate limit)
  - Acceptance: backfill executa com parâmetros e reporta progresso/erro
  - Estimate: 6h

## 3) Metadata redundancy & validation
- [ ] Implementar fallback order: on-chain → cache → placeholder
  - Acceptance: API retorna primeiro on-chain quando disponível, senão cache, senão placeholder
  - Estimate: 3h
- [ ] Validar tamanho/formatos de metadata e aplicar TTL em cache
  - Acceptance: entradas inválidas rejeitadas; cache expira conforme TTL
  - Estimate: 4h

## 4) Observability & logs
- [ ] Adicionar métricas para gaps por event type e latência de indexação
  - Acceptance: métricas exportadas para prometheus (or mock) e documentadas
  - Estimate: 4h

## 5) Tests & runbook
- [ ] Tests unitários para handlers críticos (simulate reorg & duplicates)
  - Acceptance: suite cobre os principais cenários de erro e sucesso
  - Estimate: 6h
- [ ] Runbook: sync start block, reindex, rollback (operational steps)
  - Acceptance: document com comandos e parâmetros mínimos para operação de recuperação
  - Estimate: 3h

---
Não executar commits/push automáticos; criar issues/PRs a partir destas subtasks mediante confirmação.
