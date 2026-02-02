# Escopo Técnico - Sem Susto 🛒

Este documento contém referências técnicas e fluxogramas que servem de guia para o desenvolvimento.

---

## Fluxo de Escaneamento de Produto

O diagrama abaixo representa o fluxo completo quando o usuário escaneia um código de barras:

```mermaid
flowchart TD
    subgraph ENTRADA["📷 Entrada"]
        A[Usuário escaneia código de barras]
    end

    subgraph CASCATA["🔍 Busca em Cascata"]
        B{1. LocalStorage?}
        C{2. Supabase?}
        D{3. OpenFoodFacts API?}
        E{4. Cosmos API?}
    end

    subgraph VALIDACAO["✅ Validação"]
        V{Dados completos?}
        V1[Foto]
        V2[Marca]
        V3[Tamanho]
    end

    subgraph CADASTRO["📝 Cadastro Manual"]
        F[Formulário]
        F1[Usuário preenche campos]
        F2[IA extrai dados da foto do rótulo]
    end

    subgraph PERSISTENCIA["💾 Persistência"]
        G[(Supabase)]
        H[(LocalStorage)]
    end

    subgraph SUCESSO["🛒 Sucesso"]
        Z[Adiciona ao carrinho]
    end

    %% Fluxo principal
    A --> B
    B -->|Sim| V
    B -->|Não| C
    C -->|Sim| V
    C -->|Não| D
    D -->|Sim| V
    D -->|Não| E
    E -->|Sim| V
    E -->|Não| F

    %% Validação de dados completos
    V -->|Sim| Z
    V -->|Não| F
    V -.-> V1
    V -.-> V2
    V -.-> V3

    %% Cadastro manual
    F --> F1
    F1 --> F2
    F2 --> G
    G --> H
    H --> Z

    %% Estilos
    style ENTRADA fill:#e8f5e9
    style SUCESSO fill:#e8f5e9
    style CASCATA fill:#e3f2fd
    style VALIDACAO fill:#fff3e0
    style CADASTRO fill:#fce4ec
    style PERSISTENCIA fill:#f3e5f5
```

### Ordem de Prioridade da Cascata

| Posição | Fonte           | Latência Esperada | Observação                          |
|---------|-----------------|-------------------|-------------------------------------|
| 1       | LocalStorage    | <10ms             | Cache local do usuário              |
| 2       | Supabase        | <200ms            | Nosso banco de dados compartilhado  |
| 3       | OpenFoodFacts   | ~500ms            | API pública gratuita                |
| 4       | Cosmos          | ~800ms            | API comercial (fallback final)      |

### Tratamento de Dados Parciais

Se qualquer fonte retornar dados incompletos (sem foto, marca ou tamanho), o sistema deve:

1. **Exibir os dados encontrados** no formulário (pré-preenchido)
2. **Solicitar ao usuário** que complete as informações faltantes
3. **Salvar o produto completo** no Supabase + LocalStorage

---

## Referências

- [roadmap.md](./roadmap.md) - Planejamento de fases
- [README.md](../README.md) - Visão geral do projeto
