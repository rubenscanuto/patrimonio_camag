# Diagnóstico de Erros de Autenticação

## Problema Reportado
```
Erro ao carregar dados do usuário. Verifique sua conexão.
```

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

## Como Diagnosticar

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

## Teste Rápido

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
