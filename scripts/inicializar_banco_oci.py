#!/usr/bin/env python3
"""
==============================================================================
PORTTOHUB - SCRIPT PYTHON PARA CRIAR AS TABELAS NA MÁQUINA VIRTUAL OCI
==============================================================================
Compatível com Python 3.6+ (sem dependências externas necessárias).
Pode ser executado diretamente no terminal da sua VM Oracle Cloud (163.176.49.21).

Uso:
    python3 scripts/inicializar_banco_oci.py
==============================================================================
"""

import os
import sys
import subprocess
import shutil

OCI_VM_IP = "163.176.49.21"
DIRETORIO_ATUAL = os.path.dirname(os.path.abspath(__file__))
ARQUIVO_SQL = os.path.abspath(os.path.join(DIRETORIO_ATUAL, "..", "oracle_cloud_postgresql_porttohub.sql"))

# Fallbacks de localização do SQL
if not os.path.exists(ARQUIVO_SQL):
    ARQUIVO_SQL = os.path.expanduser("~/porttohub-db/oracle_cloud_postgresql_porttohub.sql")
if not os.path.exists(ARQUIVO_SQL):
    ARQUIVO_SQL = "oracle_cloud_postgresql_porttohub.sql"

print("====================================================================")
print("🚀 PORTTOHUB: INICIALIZAÇÃO DE TABELAS POSTGRESQL (PYTHON)")
print("====================================================================")
print(f"📡 IP da Máquina Virtual OCI: {OCI_VM_IP}")
print(f"📄 Arquivo SQL alvo: {ARQUIVO_SQL}")

if not os.path.exists(ARQUIVO_SQL):
    print(f"❌ Erro: Arquivo SQL '{ARQUIVO_SQL}' não encontrado.")
    sys.exit(1)

# Método 1: Se o Docker estiver rodando com o container porttohub_postgres
def executar_via_docker():
    print("\n🐳 Verificando container Docker 'porttohub_postgres'...")
    try:
        resultado = subprocess.run(
            ["docker", "ps", "--filter", "name=porttohub_postgres", "--format", "{{.Names}}"],
            capture_output=True,
            text=True
        )
        if "porttohub_postgres" in resultado.stdout:
            print("✅ Container 'porttohub_postgres' detectado ativo!")
            print("📦 Injetando script SQL completo no banco de dados...")
            
            with open(ARQUIVO_SQL, "rb") as f_sql:
                cmd = subprocess.run(
                    ["docker", "exec", "-i", "porttohub_postgres", "psql", "-U", "postgres", "-d", "porttohub"],
                    stdin=f_sql,
                    capture_output=True,
                    text=True
                )
            
            if cmd.returncode == 0:
                print("🎉 SUCESSO! Todas as tabelas dos Módulos 01 a 12 foram criadas com sucesso!")
                
                # Lista tabelas criadas
                check = subprocess.run(
                    ["docker", "exec", "-i", "porttohub_postgres", "psql", "-U", "postgres", "-d", "porttohub", "-t", "-c", 
                     "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"],
                    capture_output=True,
                    text=True
                )
                print("\n📋 Tabelas ativas no banco:")
                for linha in check.stdout.strip().split("\n"):
                    if linha.strip():
                        print(f"   ✓ {linha.strip()}")
                return True
            else:
                print("⚠️ Retorno do psql:", cmd.stderr)
    except Exception as e:
        print(f"ℹ️ Docker local não disponível ou com erro: {e}")
    return False

# Método 2: Via psql local instalado
def executar_via_psql():
    print("\n🐘 Tentando via comando psql direto...")
    if shutil.which("psql"):
        uri = f"postgres://postgres:porttohub_postgres_root_pwd_2026@127.0.0.1:5432/porttohub"
        cmd = subprocess.run(["psql", uri, "-f", ARQUIVO_SQL], capture_output=True, text=True)
        if cmd.returncode == 0:
            print("🎉 SUCESSO! Executado via psql com sucesso!")
            return True
        else:
            print("⚠️ Erro no psql:", cmd.stderr)
    return False

# Método 3: Via módulo psycopg2 (caso instalado)
def executar_via_psycopg2():
    try:
        import psycopg2
        print("\n🐍 Conectando via biblioteca Python psycopg2...")
        conn = psycopg2.connect(
            host="127.0.0.1",
            port=5432,
            dbname="porttohub",
            user="postgres",
            password="porttohub_postgres_root_pwd_2026"
        )
        with open(ARQUIVO_SQL, "r", encoding="utf-8") as f:
            sql_script = f.read()
        cur = conn.cursor()
        cur.execute(sql_script)
        conn.commit()
        cur.close()
        conn.close()
        print("🎉 SUCESSO! Executado via psycopg2 com sucesso!")
        return True
    except ImportError:
        pass
    except Exception as e:
        print(f"⚠️ Erro ao conectar via psycopg2: {e}")
    return False

def main():
    if executar_via_docker():
        print("\n✨ Tudo pronto! O PorttoHub pode se comunicar com a VM na porta 8000.")
        sys.exit(0)
    
    if executar_via_psql():
        sys.exit(0)
        
    if executar_via_psycopg2():
        sys.exit(0)
        
    print("\n❌ Não foi possível executar diretamente.")
    print("Dica: No terminal da sua máquina virtual OCI (163.176.49.21), execute:")
    print("docker exec -i porttohub_postgres psql -U postgres -d porttohub < oracle_cloud_postgresql_porttohub.sql")

if __name__ == "__main__":
    main()
