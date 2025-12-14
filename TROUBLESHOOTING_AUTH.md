# Diagnóstico de Erros de Autenticação

## Problemas Reportados

### 1. Erro ao Carregar Dados
```
Erro ao carregar dados do usuário. Verifique sua conexão.
```

### 2. Login Não Efetiva
O usuário consegue submeter o formulário de login mas não é autenticado na aplicação.

## Correções Implementadas

### 1. Logs Detalhados Adicionados
Agora cada etapa do carregamento de dados tem logs individuais:

```
[loadUserData] Iniciando carregamento para: <user-id>
[loadUserData] Carregando perfil...
[loadUserData] Carregando propriedades...
[loadUserData] Carregando documentos...
...
[loadUserData] Todos os dados carregados com sucesso
```

### 2. Tratamento Individual de Erros
Cada serviço agora tem tratamento de erro individual, permitindo que a aplicação continue mesmo se um serviço falhar.

## Como Diagnosticar Problemas de Login

### Passo 1: Verificar Logs de Login

Quando você tentar fazer login, procure por estas mensagens no console (F12):

**Login Bem-Sucedido:**
```
[handleAuth] Iniciando autenticação: SIGN IN Email: seu@email.com
[authService.signIn] Tentando login com email: seu@email.com
[authService.signIn] Login bem-sucedido
[authService.signIn] User ID: abc123...
[authService.signIn] Session: true
[handleAuth] Login bem-sucedido: abc123...
[handleAuth] Sessão ativa: true
[handleAuth] Autenticação concluída
[authService.onAuthStateChange] Evento: SIGNED_IN
[authService.onAuthStateChange] User: abc123...
Auth state changed: abc123...
[loadUserData] Iniciando carregamento para: abc123...
```

**Problemas Comuns:**

#### A. Login Falha com Erro
```
[authService.signIn] Erro no login: Invalid login credentials
```
**Solução:** Email ou senha incorretos. Verifique as credenciais.

#### B. Login Sucede mas Sessão Não É Criada
```
[authService.signIn] Login bem-sucedido
[authService.signIn] Session: false  ← PROBLEMA!
```
**Causa:** Problema com cookies ou storage do navegador
**Solução:**
1. Limpe cookies e cache do navegador
2. Verifique se cookies estão habilitados
3. Desative modo anônimo/privado

#### C. onAuthStateChange Não É Chamado
```
[handleAuth] Autenticação concluída
// Mas não aparece nenhum log de [authService.onAuthStateChange]
```
**Causa:** Listener não está registrado ou sessão não persiste
**Solução:**
1. Recarregue a página
2. Verifique se há bloqueio de third-party cookies
3. Verifique configuração CORS no Supabase

#### D. Erro ao Carregar User Profile
```
[loadUserData] Erro ao carregar perfil: FetchError
```
**Causa:** Tabela `user_profiles` não tem dados ou RLS está bloqueando
**Solução:**
1. Verifique se o usuário tem um registro em `user_profiles`
2. Confirme políticas RLS para a tabela

## Como Diagnosticar Problemas de Carregamento

### Passo 1: Abrir Console do Navegador
1. Pressione `F12` ou clique com botão direito → "Inspecionar"
2. Vá para a aba "Console"
3. Limpe o console (ícone de limpar)
4. Recarregue a página (`F5`)

### Passo 2: Verificar Logs
Procure por mensagens começando com `[loadUserData]`:

**Cenário 1: Erro de Autenticação**
```
Auth state changed: logged out
```
**Solução:** Faça login novamente

**Cenário 2: Erro em Serviço Específico**
```
[loadUserData] Erro ao carregar propriedades: ...
```
**Solução:** Verifique as permissões RLS no Supabase para a tabela `properties`

**Cenário 3: Erro de Conexão**
```
[loadUserData] Erro crítico: Failed to fetch
```
**Solução:** Verifique sua conexão com a internet ou se o Supabase está acessível

### Passo 3: Verificar Supabase

#### Verificar Conexão
1. Acesse: https://bebtqjwdvpigkyudaxjr.supabase.co
2. Se não carregar, o problema é de conectividade

#### Verificar RLS (Row Level Security)
As seguintes tabelas devem ter RLS ativo com políticas configuradas:
- `user_profiles`
- `properties`
- `documents`
- `employees`
- `property_tags`
- `owners`
- `ai_configs`
- `cloud_accounts`
- `indices_database`
- `logs`
- `trash`

Para verificar:
1. Acesse o Dashboard do Supabase
2. Vá em "Authentication" → "Policies"
3. Verifique se cada tabela tem políticas para SELECT

#### Verificar Usuário Autenticado
1. No console, execute:
```javascript
await supabase.auth.getUser()
```
2. Se retornar `user: null`, você não está autenticado

### Passo 4: Soluções Comuns

#### Problema: Erro 401 Unauthorized
**Causa:** RLS bloqueando acesso
**Solução:**
1. Verifique se você está autenticado
2. Confirme que as políticas RLS permitem acesso para o usuário

#### Problema: Erro de CORS
**Causa:** Domínio não autorizado no Supabase
**Solução:**
1. Acesse o Dashboard do Supabase
2. Settings → API → CORS Allowed Origins
3. Adicione o domínio `*.bolt.host`

#### Problema: Erro de Rede
**Causa:** Firewall ou VPN bloqueando Supabase
**Solução:**
1. Desative temporariamente VPN/Proxy
2. Verifique se `*.supabase.co` não está bloqueado

#### Problema: Erro ao carregar documentos grandes
**Causa:** Timeout ou limite de tamanho
**Solução:**
1. Verifique o tamanho dos documentos na tabela
2. Considere implementar paginação

## Logs Esperados (Sucesso)

```
[loadUserData] Iniciando carregamento para: abc123...
[loadUserData] Carregando perfil...
[loadUserData] Carregando propriedades...
[loadUserData] Carregando documentos...
[loadUserData] Carregando funcionários...
[loadUserData] Carregando tags...
[loadUserData] Carregando proprietários...
[loadUserData] Carregando configurações de IA...
[loadUserData] Carregando contas cloud...
[loadUserData] Carregando índices...
[loadUserData] Carregando logs...
[loadUserData] Carregando lixeira...
[loadUserData] Todos os dados carregados com sucesso
```

## Verificação Rápida de Login

### Teste 1: Verificar Sessão Atual
Abra o console e execute:
```javascript
const { data } = await supabase.auth.getSession();
console.log('Sessão:', data.session);
console.log('Usuário:', data.session?.user?.email);
```

**Resultado Esperado (Logado):**
```
Sessão: { ... }
Usuário: seu@email.com
```

**Resultado (Não Logado):**
```
Sessão: null
Usuário: undefined
```

### Teste 2: Verificar Storage do Navegador
1. Abra DevTools (F12)
2. Vá para Application → Local Storage
3. Procure pela chave que começa com `sb-` seguido do ID do projeto Supabase
4. Se não existir, o navegador não está persistindo a sessão

**Possíveis Causas:**
- Cookies bloqueados
- Modo anônimo/privado
- Extensões bloqueando storage

### Teste 3: Forçar Novo Login
Execute no console:
```javascript
// Limpar sessão
await supabase.auth.signOut();

// Tentar login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'seu@email.com',
  password: 'suasenha'
});

console.log('Resultado:', data);
console.log('Erro:', error);
```

## Teste Rápido de Conectividade

Execute no console do navegador:

```javascript
// Teste 1: Verificar autenticação
const { data: { user } } = await supabase.auth.getUser();
console.log('Usuário:', user?.id);

// Teste 2: Testar acesso à tabela
const { data, error } = await supabase.from('properties').select('*').limit(1);
console.log('Propriedades:', data, 'Erro:', error);

// Teste 3: Verificar conexão Supabase
fetch('https://bebtqjwdvpigkyudaxjr.supabase.co').then(r => console.log('Status:', r.status));
```

## Contato com Suporte

Se o problema persistir após seguir este guia:
1. Copie todos os logs do console (Console → botão direito → Save as...)
2. Tire um screenshot do erro
3. Anote qual teste falhou acima
4. Entre em contato com suporte técnico
