# 🚀 GitIssuer - Interactive Issue Manager

O **GitIssuer** é um gerenciador interativo de issues GitHub que automatiza a atualização de PRs com os dados do `ISSUE_UPDATES.md`.

## 📋 Instalação

### 1. Setup no Windows (PowerShell)

```powershell
# Copie para seu perfil PowerShell
$profile_content = @"
# GitIssuer Alias
function gitissuer {
    & "d:\Rede\Github\mzfshark\Aragon-app-backend\scripts\gitissuer.js" @args
}

# ou use o caminho completo
Set-Alias -Name gitissuer -Value "node d:\Rede\Github\mzfshark\Aragon-app-backend\scripts\gitissuer.js"
"@

# Abra seu $PROFILE ou crie em:
# $PROFILE = C:\Users\<seu-user>\Documents\PowerShell\profile.ps1

Add-Content $PROFILE $profile_content
. $PROFILE
```

### 2. Setup no Windows (Git Bash / WSL)

```bash
# Adicione ao seu ~/.bashrc ou ~/.zshrc
alias gitissuer='node /d/Rede/Github/mzfshark/Aragon-app-backend/scripts/gitissuer.js'

# Recarregue
source ~/.bashrc
```

### 3. Setup no macOS/Linux

```bash
# Tornar executável
chmod +x ~/path/to/gitissuer.sh

# Criar symlink global
sudo ln -s ~/path/to/gitissuer.sh /usr/local/bin/gitissuer

# Ou adicionar ao ~/.bashrc
alias gitissuer='node ~/path/to/gitissuer.js'
```

## 🎯 Uso

### Comando Básico

```bash
# Usar com arquivo local
gitissuer add --file ./ISSUE_UPDATES.md

# Usar com caminho absoluto
gitissuer add --file d:\Rede\Github\mzfshark\Aragon-app-backend\ISSUE_UPDATES.md
```

### Menu Interativo

Após executar, você verá um menu:

```
============================================================
📋 GitHub Issue Manager
============================================================
  1. 🔧 Backend PR #1 - Reorg-Safe Idempotency
  2. 🎨 Frontend PR #162 - Validator Address
  3. 📊 View Summary
  4. 🔄 Sync to Project
  0. Exit

Select an option: 
```

### Opções Disponíveis

Para cada PR, você pode:

#### 1️⃣ **✏️ Update PR Title**
- Edita o título do PR com novo texto
- Exemplo: Mudar de "WIP:" para título final

#### 2️⃣ **📝 Update PR Body**
- Substitui o body inteiro pela descrição em `ISSUE_UPDATES.md`
- Inclui summary, changes, files, testing, etc.

#### 3️⃣ **🏷️ Add Labels**
- Adiciona automaticamente os labels recomendados:
  - **Backend**: `backend`, `idempotency`, `reorg-detection`, etc.
  - **Frontend**: `frontend`, `harmony`, `validator`, etc.

#### 4️⃣ **👥 Request Reviewers**
- Solicita review dos usuários especificados
- Backend: Atribuído para `@Axodus/backend-team`
- Frontend: Atribuído para `@Axodus/frontend-team`

#### 5️⃣ **📊 View Summary**
- Mostra resumo dos PRs carregados
- Exibe títulos, labels e reviewers

#### 6️⃣ **🔄 Sync to Project**
- Anexa PRs ao GitHub Project (opcional)
- Requer project node ID

## 💡 Workflow Completo

```bash
# 1. Certifique-se que você está em um repo com gh CLI autenticado
cd d:\Rede\Github\mzfshark\Aragon-app-backend

# 2. Execute o gerenciador
gitissuer add --file ./ISSUE_UPDATES.md

# 3. Menu aparecerá - selecione opções
# Exemplo: 1 (Backend), depois 1 (Update Title), depois 4 (Add Labels), etc.

# 4. Confirme cada ação
Apply this change? (y/n): y
```

## 🔧 Configuração do gh CLI

Antes de usar, verifique se você está autenticado:

```bash
# Verificar autenticação
gh auth status

# Fazer login se necessário
gh auth login
```

## 📝 Arquivo ISSUE_UPDATES.md

O arquivo deve ter a seguinte estrutura:

```markdown
## Aragon-app-backend PR #1

### Title
\`\`\`
fix: implement reorg-safe idempotency for event handlers
\`\`\`

### Updated Body
\`\`\`markdown
## Summary
...
\`\`\`

### Labels to Add
- backend
- idempotency
- reorg-detection

### Reviewers
- @Axodus/backend-team
```

## 🐛 Troubleshooting

### "gh: command not found"
```bash
# Instale GitHub CLI
# Windows: winget install GitHub.cli
# macOS: brew install gh
# Linux: apt install gh (ou equivalente)
```

### "Node.js is not installed"
```bash
# Instale Node.js
# https://nodejs.org/ (v18+)
```

### "Cannot find file: ISSUE_UPDATES.md"
```bash
# Verifique o caminho do arquivo
# Use caminho absoluto se estiver em outro diretório
gitissuer add --file d:\full\path\to\ISSUE_UPDATES.md
```

### Permissão negada no bash/WSL
```bash
# Torne o script executável
chmod +x gitissuer.sh

# Execute diretamente
./gitissuer.sh add --file ./ISSUE_UPDATES.md
```

## 📊 Output Esperado

Após executar as ações, você verá:

```
============================================================
✅ Backend PR #1
   Title: fix: implement reorg-safe idempotency for event handlers
   Labels: backend, idempotency, reorg-detection, database, testing, completed
   Reviewers: backend-team

✅ Frontend PR #162
   Title: feat: add Harmony Delegation validator address support
   Labels: frontend, harmony, validator, sprint-artifacts, documentation, completed
   Reviewers: frontend-team
```

## 🚀 Próximos Passos

Após usar o GitIssuer:

1. ✅ **Review**: Verifique os PRs no GitHub
   - https://github.com/Axodus/Aragon-app-backend/pull/1
   - https://github.com/Axodus/aragon-app/pull/162

2. ✅ **CI/CD**: Aguarde os checks do GitHub passarem

3. ✅ **Merge**: Após aprovação, merge os PRs

4. ✅ **Deploy**: Execute os procedimentos de deploy

## 💬 Dúvidas?

- Verifique o arquivo `ISSUE_UPDATES.md` para ver todos os detalhes dos PRs
- Veja `SPRINT_COMPLETION.md` para o resumo executivo da sprint
- Consulte `VALIDATION.md` para procedimentos de teste

---

**Criado em:** 22 de Janeiro de 2026  
**Versão:** 1.0.0  
**Status:** ✅ Pronto para uso
