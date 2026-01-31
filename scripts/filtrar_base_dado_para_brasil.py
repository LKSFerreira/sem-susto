#!/usr/bin/env python3
"""
Script otimizado para processar o dump do Open Food Facts.
Filtra apenas produtos brasileiros e salva em CSV.

Autor: Sem Susto Project
"""
import gzip
import json
import re
import csv
import time
import os
import sys

# Configuração
INPUT_FILE = 'openfoodfacts-products.jsonl.gz'
OUTPUT_FILE = 'produtos_brasil_v1.csv'

# Regex pré-compilado (performance)
REGEX_BRASIL = re.compile(rb'brazil|brasil', re.IGNORECASE)

# Cores ANSI para terminal
class Cores:
    VERDE = '\033[92m'
    AMARELO = '\033[93m'
    AZUL = '\033[94m'
    VERMELHO = '\033[91m'
    RESET = '\033[0m'
    NEGRITO = '\033[1m'

def formatar_bytes(num_bytes):
    """Formata bytes em unidade legível (KB, MB, GB)."""
    for unidade in ['B', 'KB', 'MB', 'GB']:
        if abs(num_bytes) < 1024.0:
            return f"{num_bytes:.1f} {unidade}"
        num_bytes /= 1024.0
    return f"{num_bytes:.1f} TB"

def formatar_tempo(segundos):
    """Formata segundos em formato legível."""
    if segundos < 60:
        return f"{segundos:.0f}s"
    elif segundos < 3600:
        return f"{segundos // 60:.0f}m {segundos % 60:.0f}s"
    else:
        return f"{segundos // 3600:.0f}h {(segundos % 3600) // 60:.0f}m"

def exibir_progresso(lidos, salvos, bytes_lidos, total_bytes, tempo_decorrido):
    """Exibe barra de progresso visual no terminal."""
    # Calcula percentual (limitado a 100% porque .gz é compactado)
    if total_bytes > 0:
        # Estimativa: arquivo descompactado é ~3.6x maior que .gz
        # Usamos isso para calcular progresso mais preciso
        porcentagem = min((bytes_lidos / (total_bytes * 3.6)) * 100, 100.0)
    else:
        porcentagem = 0
    
    # Velocidade
    velocidade = lidos / (tempo_decorrido + 0.001)
    
    # Tempo estimado restante (só se ainda não chegou a 100%)
    if porcentagem > 0 and porcentagem < 100:
        tempo_total = tempo_decorrido / (porcentagem / 100)
        tempo_restante = max(tempo_total - tempo_decorrido, 0)
    else:
        tempo_restante = 0
    
    # Monta barra visual
    largura_barra = 30
    preenchido = int(largura_barra * porcentagem / 100)
    barra = '█' * preenchido + '░' * (largura_barra - preenchido)
    
    # Monta linha de status
    linha = (
        f"\r{Cores.AZUL}[{barra}]{Cores.RESET} "
        f"{Cores.NEGRITO}{porcentagem:5.1f}%{Cores.RESET} | "
        f"{Cores.VERDE}{lidos:,}{Cores.RESET} lidos | "
        f"{Cores.AMARELO}{salvos:,}{Cores.RESET} BR | "
        f"{velocidade:,.0f}/s | "
        f"ETA: {formatar_tempo(tempo_restante)}"
    )
    
    # Escreve na mesma linha (sobrescreve)
    sys.stdout.write(linha + '   ')
    sys.stdout.flush()

def processar():
    """Processa o arquivo JSONL.GZ e gera CSV filtrado."""
    print(f"\n{Cores.NEGRITO}{'='*60}{Cores.RESET}")
    print(f"{Cores.VERDE}🚀 PROCESSADOR DE DADOS - Sem Susto{Cores.RESET}")
    print(f"{Cores.NEGRITO}{'='*60}{Cores.RESET}\n")
    
    # Verifica arquivo de entrada
    if not os.path.exists(INPUT_FILE):
        print(f"{Cores.VERMELHO}❌ Arquivo não encontrado: {INPUT_FILE}{Cores.RESET}")
        print(f"   Baixe em: https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz")
        return
    
    # Tamanho do arquivo para calcular progresso
    tamanho_arquivo = os.path.getsize(INPUT_FILE)
    print(f"📁 Arquivo: {INPUT_FILE} ({formatar_bytes(tamanho_arquivo)})")
    print(f"🎯 Destino: {OUTPUT_FILE}\n")
    
    inicio = time.time()
    total_lidos = 0
    total_salvos = 0
    bytes_processados = 0
    
    try:
        # Abre arquivo compactado em modo BINÁRIO para velocidade
        with gzip.open(INPUT_FILE, 'rb') as f_in, \
             open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as f_out:
            
            writer = csv.writer(f_out, quoting=csv.QUOTE_ALL)
            writer.writerow(['raw_data'])
            
            for linha_bytes in f_in:
                total_lidos += 1
                bytes_processados += len(linha_bytes)
                
                # Atualiza progresso a cada 5000 linhas
                if total_lidos % 5000 == 0:
                    exibir_progresso(
                        total_lidos, total_salvos, 
                        bytes_processados, tamanho_arquivo,
                        time.time() - inicio
                    )
                
                # Filtro rápido via Regex em bytes (muito mais rápido que decodificar)
                if not REGEX_BRASIL.search(linha_bytes):
                    continue
                
                # Só decodifica e parseia linhas candidatas
                try:
                    linha = linha_bytes.decode('utf-8')
                    data = json.loads(linha)
                    product = data.get('product', data)
                    
                    # Validação final dos países
                    tags = product.get('countries_tags', [])
                    if isinstance(tags, str):
                        tags = [tags]
                    
                    is_brazil = any('brazil' in t.lower() or 'brasil' in t.lower() for t in tags)
                    
                    if is_brazil:
                        writer.writerow([json.dumps(product)])
                        total_salvos += 1
                        
                except Exception:
                    continue
                    
    except KeyboardInterrupt:
        print(f"\n\n{Cores.AMARELO}⚠️  Cancelado pelo usuário.{Cores.RESET}")
        return
    except Exception as e:
        print(f"\n{Cores.VERMELHO}❌ Erro: {e}{Cores.RESET}")
        return

    tempo_total = time.time() - inicio
    
    # Resultado final
    print(f"\n\n{Cores.NEGRITO}{'='*60}{Cores.RESET}")
    print(f"{Cores.VERDE}✅ PROCESSAMENTO CONCLUÍDO!{Cores.RESET}")
    print(f"{Cores.NEGRITO}{'='*60}{Cores.RESET}")
    print(f"   📊 Total de linhas lidas: {total_lidos:,}")
    print(f"   🇧🇷 Produtos brasileiros:  {total_salvos:,}")
    print(f"   ⏱️  Tempo total:           {formatar_tempo(tempo_total)}")
    print(f"   📁 Arquivo gerado:        {OUTPUT_FILE}")
    
    # Tamanho do arquivo de saída
    if os.path.exists(OUTPUT_FILE):
        tamanho_saida = os.path.getsize(OUTPUT_FILE)
        print(f"   💾 Tamanho do CSV:        {formatar_bytes(tamanho_saida)}")
    
    print(f"{Cores.NEGRITO}{'='*60}{Cores.RESET}\n")

if __name__ == "__main__":
    processar()
