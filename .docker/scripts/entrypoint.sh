#!/bin/sh
# =============================================================================
# Entrypoint - Preço Certo
# =============================================================================

npm install --silent

echo ''
echo '═══════════════════════════════════════════════════════════════════'
# Pega o IP injetado pelo host ou usa um placeholder
IP_EXIBICAO=${HOST_IP:-"SEU_IP"}

echo '  🚀 Sem Susto - Servidor de Desenvolvimento'
echo '═══════════════════════════════════════════════════════════════════'
echo ''
echo "  📍 Acesso local (PC):     https://localhost:5173"
echo "  📱 Acesso celular:        https://$IP_EXIBICAO:5173"
echo ''

if [ "$IP_EXIBICAO" = "SEU_IP" ]; then
    echo '  💡 Descubra seu IP com: ipconfig | grep 192'
    echo '  ⚠️  Aceite o aviso de certificado no browser'
    echo '     Ex: https://192.168.15.121:5173'
else
    echo '  ✅ IP detectado automaticamente!'
    echo '  ⚠️  Aceite o aviso de certificado no browser'
fi

echo ''
echo '═══════════════════════════════════════════════════════════════════'
echo ''

exec npm run dev -- --host 0.0.0.0 --clearScreen false
