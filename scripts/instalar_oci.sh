#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE INSTALAÇÃO AUTOMATIZADA - PORTTOHUB NA ORACLE CLOUD (OCI)
# ==============================================================================
# Executa a instalação completa do Docker, Docker Compose, PostgreSQL 16 e PostgREST
# na VM Always Free da Oracle Cloud (Ubuntu 22.04 / 24.04 ou Debian).
# ==============================================================================

set -e

echo "===================================================================="
echo "🚀 Iniciando configuração do PorttoHub na Oracle Cloud Infrastructure"
echo "===================================================================="

# 1. Atualizar pacotes do sistema operacional
echo "📦 Atualizando repositórios e pacotes..."
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y curl wget git ufw net-tools

# 2. Instalar Docker se ainda não estiver instalado
if ! command -v docker &> /dev/null; then
    echo "🐳 Instalando Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER || true
    rm -f get-docker.sh
else
    echo "✅ Docker já está instalado."
fi

# 3. Instalar Docker Compose Plugin se necessário
if ! docker compose version &> /dev/null; then
    echo "🐳 Instalando Docker Compose Plugin..."
    sudo apt-get install -y docker-compose-plugin
fi

# 4. Criar diretório da aplicação na VM
PORTTOHUB_DIR="/home/$USER/porttohub-db"
mkdir -p "$PORTTOHUB_DIR"
cd "$PORTTOHUB_DIR"

# 5. Baixar arquivos de configuração do PorttoHub
echo "📥 Baixando scripts SQL e Docker Compose do PorttoHub..."
wget -qO docker-compose.yml https://raw.githubusercontent.com/grupocaetanodigital-creator/PorttoHub/main/scripts/docker-compose.oci.yml || true
wget -qO oracle_cloud_postgresql_porttohub.sql https://raw.githubusercontent.com/grupocaetanodigital-creator/PorttoHub/main/oracle_cloud_postgresql_porttohub.sql || true

# 6. Configurar Firewall da VM (UFW e iptables do Ubuntu na OCI)
echo "🛡️ Configurando portas no Firewall do Ubuntu (80, 443, 8000)..."
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8000 -j ACCEPT || true
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT || true
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT || true

if command -v netfilter-persistent &> /dev/null; then
    sudo netfilter-persistent save || true
fi

# 7. Subir os containers do PostgreSQL e PostgREST
echo "🚀 Subindo containers Docker..."
docker compose down || true
docker compose up -d

echo "⏳ Aguardando inicialização do PostgreSQL..."
sleep 5

echo "📦 Criando automaticamente todas as tabelas (Módulos 01 a 12)..."
docker exec -i porttohub_postgres psql -U postgres -d porttohub < oracle_cloud_postgresql_porttohub.sql || true
docker exec -i porttohub_postgres psql -U postgres -d porttohub -c "NOTIFY pgrst, 'reload schema';" || true

echo ""
echo "===================================================================="
echo "🎉 BANCO DE DADOS E API REST DO PORTTOHUB INSTALADOS COM SUCESSO!"
echo "===================================================================="
IP_PUBLICO=$(curl -s https://ifconfig.me || echo "SEU_IP_OCI")
echo "🌐 Seu Endpoint REST na Oracle Cloud:"
echo "   http://${IP_PUBLICO}:8000"
echo ""
echo "🔑 Próximo passo no Frontend PorttoHub:"
echo "   Defina a variável no seu .env ou Vercel:"
echo "   VITE_OCI_API_URL=http://${IP_PUBLICO}:8000"
echo "===================================================================="
