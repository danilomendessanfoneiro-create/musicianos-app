from supabase import create_client
import uuid
import sys

# =====================================================
# 🔧 CONFIGURAÇÕES
# =====================================================
SUPABASE_URL = "https://ygpukjsuhfgpjhftsfuy.supabase.co"
# Sua chave Service Role (mestra) que você enviou
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncHVranN1aGZncGpoZnRzZnV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjEwMjI0OSwiZXhwIjoyMDkxNjc4MjQ5fQ.v1gKOy23xzCGceEZ-duVXqR6hOhCp2G8YmJzohcP3OU"

def conectar_supabase():
    try:
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Cliente Supabase criado com sucesso")
        return client
    except Exception as e:
        print("\n❌ ERRO AO CONECTAR NO SUPABASE")
        print(e)
        sys.exit(1)

def testar_leitura(supabase):
    print("\n📥 Testando leitura da tabela 'leads'...")
    try:
        # Mudamos para ler a tabela de leads
        response = supabase.table("leads").select("*").execute()
        print(f"✅ Leitura OK - {len(response.data)} registros encontrados")
    except Exception as e:
        print("\n❌ ERRO NA LEITURA")
        print(e)
        sys.exit(1)

def testar_insercao(supabase):
    print("\n📤 Testando inserção de dados em 'leads'...")
    try:
        # Criando um contratante de teste para o Musicianos
        dados_teste = {
            "name": "Contratante Teste - Musicianos",
            "venue": "Bar do Danilo Mendes",
            "value": 2500,
            "status": "novo",
            "date": "2026-04-13" # Data de hoje
        }

        # Inserindo na tabela leads (que não exige usuário logado agora)
        response = supabase.table("leads").insert(dados_teste).execute()

        print("🚀 SUCESSO TOTAL! Dados gravados na nuvem.")
        print(f"📍 Registro criado: {dados_teste['name']} no {dados_teste['venue']}")

    except Exception as e:
        print("\n❌ ERRO NA INSERÇÃO")
        print("Dica: Verifique se o nome da tabela no Supabase é realmente 'leads' (minúsculo)")
        print(e)
        sys.exit(1)

def executar_teste_geral():
    print("\n" + "=" * 50)
    print("🛡️  TESTE COMPLETO - MUSICIANOS CLOUD")
    print("=" * 50)

    supabase = conectar_supabase()

    # Primeiro lemos o que tem lá
    testar_leitura(supabase)
    
    # Depois inserimos um novo para provar que a ponte funciona
    testar_insercao(supabase)

    print("\n" + "=" * 50)
    print("✅ PONTE ESTABELECIDA COM SUCESSO")
    print("=" * 50)

if __name__ == "__main__":
    executar_teste_geral()