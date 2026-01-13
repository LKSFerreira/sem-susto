#!/bin/bash
# =============================================================================
# Dev Script - Sem Susto
# =============================================================================
# Este script detecta o IP da sua rede local (Windows) e inicia o Docker.
# Uso: ./dev.sh
# =============================================================================

# Procura o IP da rede local (192.168.* ou 10.*) usando ipconfig (Windows)
# Procura o IP da rede local (192.168.* ou 10.*) usando ipconfig (Windows)
# Usamos grep -oE para pegar apenas o número do IP, ignorando labels (como "Endereço IPv4") e encodings
IP=$(ipconfig | grep -oE "\b(192\.168\.[0-9]{1,3}\.[0-9]{1,3}|10\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})\b" | head -n 1 | tr -d '\r ')

if [ -n "$IP" ]; then
    export HOST_IP=$IP
    echo ""
    echo -e "\033[0;32m✅ IP Detectado: $IP\033[0m"
else
    echo ""
    echo -e "\033[0;33m⚠️  Não foi possível detectar o IP da rede local automaticamente.\033[0m"
fi

echo -e "\033[0;36m🚀 Iniciando containers...\033[0m"
docker compose -f .docker/compose.yaml up --build
