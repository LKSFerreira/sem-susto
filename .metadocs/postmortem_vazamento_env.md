# Post-Mortem: Vazamento de Credenciais Frontend (VITE_ Prefix)

**Data:** 13/02/2026
**Severidade:** Alta (Potencial)
**Status:** Resolvido

## 1. O Problema
Durante uma auditoria de segurança, identificou-se que chaves sensíveis de API (como `COSMOS_TOKEN` e `GROQ_TOKEN`) estavam configuradas no arquivo `.env` com o prefixo `VITE_`.

### Por que isso é perigoso?
Ferramentas de build como o Vite (usado no projeto) automaticamente injetam qualquer variável de ambiente iniciada com `VITE_` no código JavaScript final entregue ao navegador do cliente. Isso permite que qualquer usuário mal-intencionado inspecione o código fonte e roube as credenciais, possibilitando uso indevido da API (custos financeiros, roubo de dados, etc.).

## 2. A Solução Implementada
Para mitigar o risco, removemos o prefixo `VITE_` de todas as variáveis sensíveis.

**De:**
```properties
VITE_COSMOS_TOKEN=...
VITE_GROQ_TOKEN=...
```

**Para:**
```properties
COSMOS_TOKEN=...
GROQ_TOKEN=...
```

Com essa alteração, o Vite ignora essas variáveis durante o build, e elas ficam disponíveis **apenas no lado do servidor** (Node.js/Vercel Serverless Functions) através de `process.env`.

## 3. Desafio Técnico (Docker)
Ao remover o prefixo, os containers Docker pararam de enxergar as variáveis, pois a configuração anterior dependia de algum mecanismo de injeção automática ou cache. Isso quebrou os testes de integração locais.

**Correção:**
Ajustamos o arquivo `.devcontainer/compose.yaml` para carregar explicitamente o arquivo `.env` da raiz do projeto:

```yaml
services:
  app:
    env_file:
      - ../.env  # Carrega variáveis da raiz
```

## 4. Validação
Criamos scripts de teste automatizados que rodam dentro do container para garantir que o backend consegue ler as chaves seguras e se comunicar com as APIs externas:

- `scripts/testar_proxy_cosmos.ts`: Valida integração com API Bluesoft Cosmos.
- `scripts/testar_proxy_ia.ts`: Valida integração com API Groq (LLM).

Ambos os scripts foram executados com sucesso, confirmando que o ambiente está seguro e funcional.
