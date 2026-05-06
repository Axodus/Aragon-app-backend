# Plano de Execução: Correção de Erros TypeScript Pré-Existentes

## 📋 Visão Geral

**Status do Código:**
- ✅ Sprint #2 Backend: 0 erros TypeScript (pronto para deploy)
- ❌ Codebase Legado: 17 erros TypeScript distribuídos em 8 arquivos
- 🔴 CRÍTICO: Propriedades duplicadas em `proposal.ts` (logIndex, transactionIndex, eventType)

**Impacto Comercial:**
| Aspecto | Impacto | Severidade |
|---------|--------|-----------|
| Validação de Build | `tsc --noEmit` falha com 17 erros | ALTA |
| CI/CD Pipeline | Pode falhar se type checking ativado | ALTA |
| Developer Experience | Ruído de erro em IDE, autocomplete prejudicado | MÉDIA |
| Sprint #2 Deployment | **NÃO BLOQUEIA** - código Sprint #2 está limpo | NENHUM |

---

## 🎯 Proposta de Abordagem

### Opção 1: Deploy Sprint #2 Agora + Fix Erros Depois (RECOMENDADO)

```
┌─────────────────────────────────────────────────────────────┐
│ AGORA (Semana de 25 Jan)                                   │
├─────────────────────────────────────────────────────────────┤
│ ✅ Deploy Sprint #2 para Staging                            │
│    - Backend resilience (reorg, RPC pool, backfill, metrics)│
│    - Todos testes Sprint #2 passando                        │
│    - Documentação de rollback/deployment pronta             │
│                                                             │
│ 🔄 Paralelizar: Criar Issue para erros pré-existentes      │
│    - Issue: "TypeScript Errors - Proposal.ts Duplicates"   │
│    - Sprint: Sprint #3 (prioridade: ALTA)                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PRÓXIMA SEMANA (Sprint #3)                                 │
├─────────────────────────────────────────────────────────────┤
│ Phase 1 (CRÍTICO): Duplicatas em proposal.ts              │
│  - 2-3 horas | Risk: ALTO | Rollback: 5 min              │
│                                                             │
│ Phase 2 (ALTA): Scripts (backfillHarmony, reindexDao)     │
│  - 2 horas | Risk: MÉDIO | Rollback: 5 min               │
│                                                             │
│ Phase 3 (MÉDIA): Helpers & Jobs (reorgDetection, etc)     │
│  - 2 horas | Risk: MÉDIO | Rollback: 10 min              │
│                                                             │
│ Phase 4 (BAIXA): ethers.js Buffer issue (skipLibCheck)    │
│  - 1 hora | Risk: BAIXO | Rollback: 5 min                │
└─────────────────────────────────────────────────────────────┘

Total de Esforço: 12-16 horas distribuídas ao longo de Sprint #3
```

### Opção 2: Pausar Sprint #2 + Corrigir Tudo Antes

❌ **NÃO RECOMENDADO** - Atrasa Sprint #2 em 2-3 dias sem valor adicional

---

## 🔴 Análise por Criticidade

### CRÍTICO: proposal.ts (3 erros)

```typescript
// ❌ PROBLEMA: Propriedades duplicadas
export class Proposal {
  public logIndex?: number  // Linha 265
  public logIndex?: number  // Duplicada!
  
  public transactionIndex?: number  // Linha 268
  public transactionIndex?: number  // Duplicada!
  
  public eventType?: string  // Linha 271
  public eventType?: string  // Duplicada!
}
```

**Impacto:** Schema inválido para MongoDB, pode causar falhas em runtime  
**Solução:** Revisar migração do banco, remover duplicatas, testar persistência  
**Tempo:** 2-3 horas (inclui investigação de histórico git + testes)

---

### ALTA: Scripts de Utilitário (5 erros)

| Script | Erro | Solução | Tempo |
|--------|------|---------|-------|
| `backfillHarmony.ts` | CLI args são string, esperado number | `parseInt(args.to)` | 30 min |
| `reindexDaoRegistry.ts` | args.network é string, esperado enum | Enum lookup + validação | 1.5h |
| `approve-plugin-access.ts` | Function missing type annotation | Add explicit return type | 30 min |

**Impacto:** Scripts podem falhar silenciosamente com erros de tipo  
**Risco:** MÉDIO - Scripts executados manualmente, erros aparentes ao usar  
**Rollback:** 5 minutos via git revert

---

### ALTA: Helpers & Jobs (8 erros)

| Arquivo | Erro | Impacto | Tempo |
|---------|------|--------|-------|
| `reorgDetection.ts` | Network é string, esperado enum | Reorg detection falha silenciosamente | 1h |
| `harmonyBackfillJob.ts` | 6 erros: network + service + ABI | Backfill job quebrado | 2h |

**Impacto:** Core indexing features podem ter bugs silenciosos  
**Risco:** MÉDIO-ALTO - Código crítico para operação  
**Rollback:** 10 minutos (revert + cache reset)

---

### BAIXA: Biblioteca Externa (1 erro)

**ethers.js Buffer type mismatch:**
- ✅ Solução rápida: `skipLibCheck: true` em tsconfig.json (0.5h)
- 📋 Solução correta: Avaliar downgrade para ethers.js v5 ou upgrade para v7 (2h)
- ⏰ Urgência: NENHUMA - Não afeta funcionalidade

---

## 📅 Timeline Proposto

```
MON 25 JAN (Agora)
├─ Finalizar Sprint #2 validation
├─ Push branch feature/sprint2/indexing-resilience
└─ Criar issue para TypeScript errors

TUE 26-WED 27 JAN (Sprint #2 Staging)
├─ Deploy Sprint #2 para staging
├─ Monitorar Grafana dashboards (reorg, RPC failover, backfill)
├─ Code review de Sprint #2
└─ ✅ Sprint #2 em produção (se tudo OK)

THU 28-FRI 29 JAN (Sprint #3 Kickoff - TypeScript Fixes)
├─ Phase 1 (CRÍTICO): proposal.ts duplicates
├─ Phase 2 (ALTA): Scripts fixes
├─ Phase 3 (MÉDIA): Helpers & Jobs fixes
├─ Phase 4 (BAIXA): ethers.js decision
└─ Merge all fixes antes do fim da semana

MON 1 FEB (Validação Final)
├─ tsc --noEmit retorna 0 erros
├─ All tests passing
├─ Deploy changes para staging
└─ Production deployment ready
```

---

## 💰 Custo-Benefício

### Opção 1: Deploy Sprint #2 Agora (RECOMENDADO)

| Benefício | Valor |
|-----------|-------|
| Valor de Sprint #2 entregue | $$$$ |
| Redução de risco (split em fases) | $$ |
| Parallelizar testes legado | $$ |
| **Total** | **$$$$$$ ✅** |

| Custo | Valor |
|------|-------|
| Deixar erros legado por 1 semana | $ (baixo risco) |
| Documentação adicional (este plano) | $ |
| **Total** | **$$ (aceitável)** |

### Opção 2: Pausar Tudo (NÃO RECOMENDADO)

| Custo | Valor |
|-------|-------|
| Atraso de Sprint #2: 2-3 dias | $$$$ (muito alto) |
| Bloqueio de staging/prod | $$$ |
| Impacto em roadmap | $$ |
| **Total** | **$$$$$ ❌** |

---

## ⚠️ Riscos & Mitigações

| Risco | Prob | Impact | Mitigation |
|------|------|--------|-----------|
| proposal.ts: Schema migration falha | 20% | ALTA | Backup DB antes de alterar |
| harmonyBackfillJob: Reintroduces bugs | 15% | ALTA | Testnet + staging validation |
| ethers.js: Downgrade breaks code | 10% | MÉDIA | Test com ambas versões |
| Type fixing: Regressions | 5% | MÉDIA | Unit tests + integration tests |

**Rollback Total:** 15 minutos (git revert + yarn install)

---

## ✅ Critérios de Sucesso

- [ ] `npx tsc --noEmit` → 0 erros
- [ ] `yarn test:unit` → All passing
- [ ] `yarn test:unit-dep` → All passing  
- [ ] Code review aprovado (2+ engineers)
- [ ] Nenhuma regressão detectada em staging
- [ ] Documentação atualizada (TECHNICAL_DEBT.md)

---

## 🚀 Próximos Passos (com sua aprovação)

1. **Você aprova este plano?** (Opção 1 é recomendada)
2. **Criamos GitHub Issue** com este plano como description
3. **Adicionamos à Sprint #3** backlog com estimativas
4. **Começamos Phase 1** assim que Sprint #2 estiver em staging

---

## 📎 Detalhes Completos

Para análise detalhada de cada erro, veja: [TYPESCRIPT_ERRORS_FIX.md](./TYPESCRIPT_ERRORS_FIX.md)

Inclui:
- Análise profunda de cada erro
- Estratégias de fix (antes/depois de código)
- Risk assessment detalhado
- Plano de rollback
- Acceptance criteria

