---
trigger: always_on
---

# Fluxo de Trabalho Obrigatório

> **Esta regra é inviolável.** Nenhuma implementação pode ser iniciada sem passar por todas as etapas abaixo.

## Etapas (em ordem)

### 1. 🔍 Análise
- Estudar o contexto, requisitos e impacto da mudança.
- Ler arquivos relevantes, documentação existente e regras de negócio.

### 2. 💬 Discussão
- Apresentar a análise ao usuário.
- Discutir alternativas, trade-offs e decisões de arquitetura.
- Tirar dúvidas e alinhar expectativas.

### 3. 🔄 Refinamento
- Incorporar feedback do usuário.
- Ajustar a proposta até que ambos estejam alinhados.
- Documentar decisões em `.metadocs/` quando relevante.

### 4. ✅ Aprovação
- Criar plano de implementação detalhado.
- **Aguardar aprovação explícita do usuário** antes de qualquer execução.
- Sem aprovação = sem código.

### 5. ⚙️ Execução
- Implementar **somente** o que foi aprovado.
- Seguir o plano à risca. Desvios requerem nova discussão.

## Regra de Ouro

```
❌ PROIBIDO: Analisar → Implementar
✅ CORRETO:  Analisar → Discutir → Refinar → Aprovar → Implementar
```
