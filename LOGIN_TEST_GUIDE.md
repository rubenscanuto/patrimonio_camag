# Guia de Teste de Login - Patrimônio360

## Correções Implementadas

### 1. Configuração Melhorada do Supabase Client
- Adicionada persistência de sessão explícita
- Habilitado auto-refresh de token
- Detecção automática de sessão na URL
- Logs detalhados de inicialização

### 2. Fluxo de Autenticação Corrigido
- Eliminadas race conditions no carregamento de dados
- Adicionado delay de 500ms após login para garantir sessão estabelecida
- Melhorado gerenciamento de estado com flag `mounted`
- Timeout aumentado para 15 segundos

### 3. Logs Completos
- Todas as etapas do processo de login são registradas
- Fácil identificação de onde o problema ocorre

## Como Testar o Login

### Passo 1: Limpar Cache e Cookies
1. Pressione `Ctrl+Shift+Delete` (Windows/Linux) ou `Cmd+Shift+Delete` (Mac)
2. Selecione "Cookies e outros dados de sites"
3. Selecione "Imagens e arquivos em cache"
4. Clique em "Limpar dados"

### Passo 2: Recarregar a Aplicação
1. Pressione `Ctrl+F5` ou `Cmd+Shift+R` para forçar reload
2. Aguarde a página carregar completamente

### Passo 3: Abrir Console
1. Pressione `F12` para abrir DevTools
2. Vá para a aba "Console"
3. Limpe o console (ícone de lixeira)

### Passo 4: Verificar Inicialização
Você deve ver estas mensagens logo após carregar a página:

```
[supabaseClient] Inicializando Supabase...
[supabaseClient] URL: https://bebtqjwdvpigkyudaxjr.supabase.co
[supabaseClient] Supabase inicializado com sucesso
[authService.onAuthStateChange] Registrando listener
[checkAuth] Verificando autenticação inicial...
[authService.getCurrentUser] Verificando usuário atual...
[authService.getCurrentUser] Usuário: null
[checkAuth] Nenhum usuário autenticado, mostrando tela de login
```

### Passo 5: Fazer Login
1. Digite seu email e senha
2. Clique em "Entrar"
3. Observe os logs no console

**Logs Esperados (Login Bem-Sucedido):**

```
[handleAuth] Iniciando autenticação: SIGN IN Email: seu@email.com
[authService.signIn] Tentando login com email: seu@email.com
[authService.signIn] Login bem-sucedido
[authService.signIn] User ID: abc-123-def-456
[authService.signIn] Session: true
[handleAuth] Login bem-sucedido: abc-123-def-456
[handleAuth] Sessão ativa: true
[handleAuth] Autenticação concluída
[authService.onAuthStateChange] Evento: SIGNED_IN
[authService.onAuthStateChange] User: abc-123-def-456
[authService.onAuthStateChange] Session ativa: true
[App] Auth state changed: abc-123-def-456
[App] Aguardando 500ms para garantir sessão estabelecida...
[loadUserData] Iniciando carregamento para: abc-123-def-456
[loadUserData] Carregando perfil...
[loadUserData] Carregando propriedades...
...
[loadUserData] Todos os dados carregados com sucesso
```

## Problemas Conhecidos e Soluções

### Problema: Session: false
```
[authService.signIn] Session: false
```

**Causas Possíveis:**
1. Cookies desabilitados
2. Modo anônimo/privado
3. Bloqueador de cookies third-party

**Soluções:**
1. Habilite cookies nas configurações do navegador
2. Desative modo anônimo
3. Adicione uma exceção para `*.supabase.co`
4. Tente em outro navegador (Chrome, Firefox, Edge)

### Problema: Timeout de Conexão
```
Failed to run sql query: Connection terminated due to connection timeout
```

**Causas Possíveis:**
1. Firewall bloqueando Supabase
2. VPN com restrições
3. Problemas de rede local
4. Supabase está em manutenção

**Soluções:**
1. Desative VPN temporariamente
2. Verifique firewall local
3. Teste com outro dispositivo/rede
4. Verifique status do Supabase: https://status.supabase.com

### Problema: Erro 401 Unauthorized
```
[loadUserData] Erro ao carregar perfil: 401 Unauthorized
```

**Causa:**
Políticas RLS bloqueando acesso

**Solução:**
1. Acesse o Dashboard do Supabase
2. Vá para "Authentication" → "Users"
3. Confirme que seu usuário existe
4. Vá para "Database" → "Tables" → "user_profiles"
5. Verifique se há um registro com seu user ID

### Problema: Variáveis de Ambiente Não Encontradas
```
[supabaseClient] ERRO: Variáveis de ambiente não encontradas
```

**Solução:**
1. Verifique se o arquivo `.env` existe
2. Confirme que as variáveis estão prefixadas com `VITE_`
3. Recarregue o servidor de desenvolvimento

## Testes no Console

### Teste 1: Verificar Cliente Supabase
```javascript
console.log('Supabase Client:', supabase);
console.log('URL:', supabase.supabaseUrl);
```

### Teste 2: Testar Conexão
```javascript
const { data, error } = await supabase.from('user_profiles').select('count').single();
console.log('Teste de conexão:', error ? 'FALHOU' : 'OK');
```

### Teste 3: Verificar Sessão Após Login
```javascript
const { data } = await supabase.auth.getSession();
console.log('Email:', data.session?.user?.email);
console.log('Expira em:', new Date(data.session?.expires_at * 1000));
```

### Teste 4: Verificar Local Storage
```javascript
const keys = Object.keys(localStorage).filter(k => k.startsWith('sb-'));
console.log('Chaves Supabase no localStorage:', keys);
```

## Checklist de Solução de Problemas

- [ ] Cookies habilitados no navegador
- [ ] Não está em modo anônimo/privado
- [ ] Cache e cookies limpos
- [ ] Console aberto mostrando todos os logs
- [ ] Credenciais corretas (email e senha)
- [ ] Conexão de internet estável
- [ ] VPN desabilitada (se aplicável)
- [ ] Firewall não está bloqueando *.supabase.co
- [ ] Variáveis de ambiente configuradas
- [ ] Reload forçado da página (Ctrl+F5)

## Quando Tudo Falhar

1. **Copie todos os logs do console** (Console → Botão direito → Save as...)
2. **Tire um screenshot do erro**
3. **Execute os 4 testes acima** e copie os resultados
4. **Verifique o status do Supabase**: https://status.supabase.com
5. **Teste em outro navegador** para isolar o problema

## Logs de Sucesso Completo

```
✅ [supabaseClient] Supabase inicializado com sucesso
✅ [authService.signIn] Login bem-sucedido
✅ [authService.signIn] Session: true
✅ [authService.onAuthStateChange] Evento: SIGNED_IN
✅ [App] Auth state changed: <user-id>
✅ [loadUserData] Todos os dados carregados com sucesso
```

Se você vê todas estas mensagens, o login funcionou perfeitamente!
