# =============================================================================
# Dockerfile - Sem Susto (App Node.js)
# =============================================================================
# Build: docker build -t sem-susto-app .devcontainer/
# Run:   docker compose -f .devcontainer/compose.yaml up
# =============================================================================

FROM node:20-alpine

# Metadados
LABEL maintainer="Sem Susto Project"
LABEL description="Ambiente de desenvolvimento Node.js para o app Sem Susto"

# Variáveis de ambiente para desenvolvimento
ENV NODE_ENV=development
ENV WATCHPACK_POLLING=true

# Diretório de trabalho
WORKDIR /app

# Copia package.json primeiro (para cache de camadas)
# Em desenvolvimento, usamos volume, mas isso ajuda no build inicial
COPY package*.json ./

# Atualiza o npm para a versão mais recente (equivalente a: pip install --upgrade pip)
RUN npm install -g npm@latest --silent

# Instala dependências do projeto (silencioso para não poluir logs)
RUN npm install --silent

# Expõe porta do Vite
EXPOSE 5173

# Comando padrão: atualiza dependências e inicia o servidor
# O 'npm install' roda TODA VEZ que o container iniciar (não só no build)
# Isso garante que mudanças no package.json sejam aplicadas
CMD ["sh", "-c", "npm install --silent && npm run dev -- --host 0.0.0.0"]
