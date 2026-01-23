# GitIssuer - Interactive GitHub Issue Manager Guide

> 📌 **Status**: ✅ Enhanced with Apply-All & Bulk Operations

**GitIssuer** é uma ferramenta CLI interativa para gerenciar issues e PRs do GitHub através do arquivo `ISSUE_UPDATES.md`. Oferece um menu intuitivo com opções para atualizar títulos, bodies, labels e reviewers de forma rápida e eficiente.

---

## 🚀 Quick Start

### 1. Pré-requisitos

```bash
# Node.js v14+
node --version

# GitHub CLI v2.0+
gh --version

# Autenticação GitHub
gh auth login
```

### 2. Uso Imediato

```bash
# Modo Interativo (Menu)
node scripts/gitissuer.js add --file ./ISSUE_UPDATES.md

# Modo Automático (Aplica Todas as Mudanças)
node scripts/gitissuer.js apply-all --file ./ISSUE_UPDATES.md

# Ver ajuda
node scripts/gitissuer.js help
```

---

## 📖 Modo Interativo (Add)

```bash
node scripts/gitissuer.js add --file ./ISSUE_UPDATES.md
```

### Fluxo de Menu

```
============================================================
📋 Issue Updates Manager
============================================================
  1. 📝 Update Axodus/Aragon-app-backend#1
  2. 📝 Update Axodus/aragon-app#162
  3. 🚀 Apply ALL Changes
  0. Exit

Select an option: 3
```

### Menu de PR Individual

Ao selecionar uma PR, você acessa:

```
============================================================
📋 Update Axodus/Aragon-app-backend#1
============================================================
  1. ✏️  Update Title
  2. 📝 Update Body
  3. 🏷️  Add Labels
  4. 👥 Request Reviewers
  5. 📊 View Summary
  0. Exit

Select an option: _
```

---

## ⚡ Modo Automático (Apply-All)

```bash
node scripts/gitissuer.js apply-all --file ./ISSUE_UPDATES.md
```

**Executa automaticamente:**
- ✏️ Atualiza todos os títulos
- 📝 Atualiza todos os bodies
- 🏷️ Adiciona todos os labels
- 👥 Solicita todos os reviewers
- 📊 Exibe relatório final

**Exemplo de saída:**

```
🚀 Applying all changes...

📦 Processing Axodus/Aragon-app-backend#1...
  ⏳ Updating title for Axodus/Aragon-app-backend#1...
  ✅ Title updated successfully
  ⏳ Updating body for Axodus/Aragon-app-backend#1...
  ✅ Body updated successfully
  ⏳ Adding labels to Axodus/Aragon-app-backend#1: backend, idempotency...
  ✅ Labels added successfully
  ⏳ Requesting reviewers for Axodus/Aragon-app-backend#1: @Axodus/backend-team...
  ✅ Reviewers requested successfully

📦 Processing Axodus/aragon-app#162...
  (output similar...)

============================================================
✅ Success: 2 | ❌ Failed: 0
============================================================
```

---

## 📁 Formato do ISSUE_UPDATES.md

```markdown
## Axodus/Aragon-app-backend#1

### Title
fix: implement reorg-safe idempotency for event handlers

### Body
Complete description in Markdown format...
- Features
- Changes
- Impact

### Labels
backend,idempotency,reorg-detection,database,testing,completed

### Reviewers
@Axodus/backend-team


## Axodus/aragon-app#162

### Title
feat: add Harmony Delegation validator address support

### Body
Complete description...

### Labels
frontend,harmony,validator,sprint-artifacts,documentation,completed

### Reviewers
@Axodus/frontend-team
```

---

## 🎯 Opções Disponíveis

### 1. Update Title
- **Função**: Modifica o título da PR
- **Entrada**: Novo título como texto
- **Exemplo**: `fix: add new feature`

### 2. Update Body
- **Função**: Substitui a descrição completa
- **Entrada**: Novo body em Markdown
- **Nota**: Substitui completamente o texto anterior

### 3. Add Labels
- **Função**: Adiciona labels à PR
- **Entrada**: Labels separados por vírgula
- **Exemplo**: `bug,enhancement,documentation`

### 4. Request Reviewers
- **Função**: Solicita revisores
- **Entrada**: Usernames separados por vírgula
- **Exemplo**: `@user1,@user2,@team`

### 5. View Summary
- **Função**: Exibe resumo formatado
- **Mostra**: Título, body preview, labels, reviewers

### 6. Apply ALL Changes (Especial)
- **Função**: Executa operações 1-4 para todas as PRs
- **Modo**: Sem prompts adicionais
- **Resultado**: Relatório de sucesso/falha

---

## 🐛 Troubleshooting

| Erro | Solução |
|------|---------|
| **gh not found** | `choco install gh` (Windows) ou `brew install gh` (Mac) |
| **Node not found** | `choco install nodejs` (Windows) ou `brew install node` (Mac) |
| **File not found** | Verifique `ls -la ISSUE_UPDATES.md` ou use caminho absoluto |
| **Authentication error** | Execute `gh auth login` ou `gh auth status` |
| **Permission denied** | Verifique permissões no repositório com `gh repo view` |
| **Label não existe** | Crie labels no GitHub ou verifique nome com `gh label list` |

---

## 💻 Exemplos de Uso

### Exemplo 1: Atualizar apenas título de uma PR
```bash
node scripts/gitissuer.js add --file ./ISSUE_UPDATES.md
# Selecione a PR
# Selecione "Update Title"
# Digite novo título
```

### Exemplo 2: Aplicar todas as mudanças de uma vez
```bash
node scripts/gitissuer.js apply-all --file ./ISSUE_UPDATES.md
# Aguarde conclusão
# Verifique relatório final
```

### Exemplo 3: Visualizar dados sem aplicar mudanças
```bash
node scripts/gitissuer.js add --file ./ISSUE_UPDATES.md
# Selecione a PR
# Selecione "View Summary"
# Visualize os dados
# Selecione "Exit"
```

---

## 🔄 Workflow Sprint #1 Completo

```bash
# 1. Navegar até o repositório backend
cd d:\Rede\Github\mzfshark\Aragon-app-backend

# 2. Verificar autenticação GitHub
gh auth status

# 3. Executar gitissuer
node scripts/gitissuer.js apply-all --file ./ISSUE_UPDATES.md

# 4. Verificar mudanças no GitHub
# - Abra https://github.com/Axodus/Aragon-app-backend/pull/1
# - Verifique título, body, labels, reviewers
# - Repita para aragon-app#162

# 5. Aguardar CI/CD checks
# - Espere todos os checks passarem (green)

# 6. Code Review
# - Aguarde aprovações dos reviewers

# 7. Merge
# - Merge com "Create a merge commit" ou "Squash and merge"

# 8. Deploy (se aplicável)
# - Execute deployment scripts
```

---

## 📊 Recursos Especiais

### Validação de Sintaxe

```bash
node -c scripts/gitissuer.js
```

### Ver versão de componentes

```bash
node --version
gh --version
npm --version
```

### Verificar status de autenticação

```bash
gh auth status
gh auth refresh
```

---

## 🛠️ Instalação de Dependências

### Windows (Chocolatey)
```powershell
choco install nodejs
choco install gh
```

### macOS (Homebrew)
```bash
brew install node
brew install gh
```

### Linux (Ubuntu/Debian)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo apt install gh
```

---

## 📝 Criando Aliases (Opcional)

### Windows PowerShell
```powershell
# Adicione ao seu $PROFILE
function gitissuer {
    & node "d:\Rede\Github\mzfshark\Aragon-app-backend\scripts\gitissuer.js" @args
}

# Recarregue
. $PROFILE
```

### Mac/Linux (bash/zsh)
```bash
# Adicione ao ~/.bashrc ou ~/.zshrc
alias gitissuer='node d/Rede/Github/mzfshark/Aragon-app-backend/scripts/gitissuer.js'

# Recarregue
source ~/.bashrc
```

---

## 🎓 Boas Práticas

1. **Sempre verifique a autenticação antes**
   ```bash
   gh auth status
   ```

2. **Teste com uma PR antes de aplicar em massa**
   ```bash
   node scripts/gitissuer.js add --file ./ISSUE_UPDATES.md
   # Selecione uma PR e teste "View Summary"
   ```

3. **Mantenha ISSUE_UPDATES.md atualizado**
   - Verifique dados antes de cada execução

4. **Use caminhos absolutos quando possível**
   ```bash
   node scripts/gitissuer.js apply-all --file "$(pwd)/ISSUE_UPDATES.md"
   ```

5. **Verifique mudanças no GitHub imediatamente após**
   - Confirme que foram aplicadas corretamente

---

## ✨ Features Principais

- ✅ Menu interativo com navegação intuitiva
- ✅ Aplicação em massa de múltiplas operações
- ✅ Validação de entrada do usuário
- ✅ Feedback visual com cores e emojis
- ✅ Tratamento de erros robusto
- ✅ Suporte para múltiplas PRs simultaneamente
- ✅ Integração com GitHub CLI (gh)
- ✅ Sem dependências externas (apenas Node.js built-in)

---

## 🔐 Segurança

- ✅ Não armazena credenciais (usa autenticação GitHub CLI)
- ✅ Não faz commits automáticos
- ✅ Requer confirmação para operações sensíveis
- ✅ Valida entradas antes de executar
- ✅ Cria backups temporários de bodies

---

## 📞 Suporte e Debug

```bash
# Modo verbose (mais detalhes)
export DEBUG=*
node scripts/gitissuer.js add --file ./ISSUE_UPDATES.md

# Verificar permissões
gh repo view

# Listar PRs abertas
gh pr list

# Verificar uma PR específica
gh pr view 1 --repo Axodus/Aragon-app-backend

# Consultar ajuda do gh pr
gh pr edit --help
```

---

## 📚 Documentação Relacionada

- [ISSUE_UPDATES.md](./ISSUE_UPDATES.md) - Dados estruturados das PRs
- [SPRINT_COMPLETION.md](./SPRINT_COMPLETION.md) - Resumo do Sprint #1
- [PLAN.md](./PLAN.md) - Planejamento do sprint
- [GitHub CLI Docs](https://cli.github.com/manual/)

---

## 🎉 Próximos Passos

1. ✅ Executar `gitissuer apply-all --file ./ISSUE_UPDATES.md`
2. ✅ Verificar GitHub que PRs foram atualizadas
3. ✅ Aguardar CI/CD checks verde
4. ✅ Code review e aprovações
5. ✅ Merge dos PRs
6. ✅ Deploy e validação

---

**Última atualização**: 2024-2025 | **Versão**: 2.0 | **Status**: Production Ready ✅
