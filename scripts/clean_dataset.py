import pandas as pd
import json
import re
import sys

# Configuração de Paths
INPUT_FILE = "produtos_brasil_v1.csv"
OUTPUT_FILE = "produtos_higienizados.json"

# Regex para captura de peso/volume
REGEX_UNIDADES = re.compile(r"(?P<val>\d+(?:[.,]\d+)?)\s*(?P<unit>[a-zA-Z.]+)")

# Mapeamento de normalização de unidades expandido
UNIT_MAP = {
    # --- VOLUME ---
    "l": "L", "lt": "L", "lts": "L", "litro": "L", "litros": "L",
    "L": "L", "LT": "L", "LTS": "L",
    "ml": "ml", "mL": "ml", "ML": "ml", "m.l": "ml", "mils": "ml",

    # --- MASSA / PESO ---
    "k": "kg", "kg": "kg", "k.g": "kg", "quilo": "kg", "kilo": "kg", 
    "kilograma": "kg", "quilograma": "kg", "kg.": "kg", "kgs": "kg",
    "KG": "kg",
    "g": "g", "gr": "g", "grs": "g", "grama": "g", "gramas": "g", "g.": "g",
    "G": "g", "GR": "g",
    "mg": "mg", "mgs": "mg", "miligrama": "mg", "miligramas": "mg",

    # --- UNIDADES / CONTAGEM ---
    "u": "un", "un": "un", "und": "un", "uni": "un", "unid": "un", 
    "unidade": "un", "unidades": "un", "unis": "un", "pç": "un", "pca": "un", "peca": "un",
    "U": "un", "UN": "un",
    "dz": "dz", "duzia": "dz", "dúzia": "dz",

    # --- EMBALAGENS ---
    "cx": "cx", "cxa": "cx", "caixa": "cx", "caixas": "cx", "box": "cx",
    "pct": "pct", "pcte": "pct", "pacote": "pct", "pacotes": "pct", "pc": "pct", "pack": "pct",
    "fd": "fd", "fdo": "fd", "fardo": "fd",
    "lata": "lata", "latas": "lata", 
    "gf": "gf", "gfa": "gf", "garrafa": "gf", "garrafas": "gf",

    # --- COMPRIMENTO ---
    "m": "m", "mt": "m", "mts": "m", "metro": "m", "metros": "m",
    "cm": "cm", "cms": "cm", "centimetro": "cm",
    "mm": "mm", "mms": "mm"
}

def normalizar_unidade(valor_raw, unidade_raw):
    valor = valor_raw.replace(",", ".")
    unidade_clean = unidade_raw.lower().strip(" .")
    if unidade_clean in UNIT_MAP:
        unidade_final = UNIT_MAP[unidade_clean]
        try:
            float_val = float(valor)
            if float_val.is_integer():
                valor = str(int(float_val))
        except:
            pass
        return f"{valor}{unidade_final}"
    return f"{valor}{unidade_clean}"

def extrair_tamanho(row_json):
    candidatos = [
        row_json.get("quantity", ""),
        str(row_json.get("product_quantity", "")) + str(row_json.get("product_quantity_unit", ""))
    ]
    for c in candidatos:
        if not c: continue
        match = REGEX_UNIDADES.search(str(c))
        if match:
            return normalizar_unidade(match.group("val"), match.group("unit"))
    return "Sem Tamanho"

def extrair_descricao(row_json, tamanho_extraido):
    nome = row_json.get("product_name_pt") or \
           row_json.get("product_name") or \
           row_json.get("product_name_en")
    
    if not nome:
        return None # Retorna None para filtrar depois
        
    nome = str(nome).title().strip()
    
    # Filtros de Qualidade Básicos
    if nome.lower() in ["produto sem nome", "unknown", "nan"]:
        return None
        
    if tamanho_extraido and tamanho_extraido != "Sem Tamanho":
        if nome.endswith(f" {tamanho_extraido}"):
            nome = nome[:-len(tamanho_extraido)].strip()
            
    return nome

def extrair_marca(row_json):
    marca = row_json.get("brands", "")
    if not marca:
        tags = row_json.get("brands_tags", [])
        if tags:
            marca = tags[0].split(":")[-1]
    
    if not marca:
        return "Sem Marca"
        
    if ":" in marca:
        marca = marca.split(":")[-1]
        
    return str(marca).title().strip()

def construir_url_imagem(code, row_json):
    """
    Constrói a URL da imagem baseado na regra do OpenFoodFacts.
    URL: https://images.openfoodfacts.org/images/products/{split_code}/front_{lang}.{rev}.400.jpg
    """
    if not code: return None
    
    # Tenta achar revisão da imagem
    images = row_json.get("images", {})
    if not images: return None
    
    # Tenta pegar 'front'
    selected = images.get("selected", {})
    if not selected:
        # Se não tem selected, não arrisca chutar revisão
        return None 
        
    front_img = selected.get("front", {})
    # Prioriza PT, depois small, depois display, depois qualquer um
    img_data = front_img.get("pt") or front_img.get("en") or front_img.get("fr")
    
    # Se não achou em lang específica, pega o primeiro que vier (values()[0])?? 
    # Melhor não arriscar dados errados. Fica com o que tem.
    
    if not img_data: return None
    
    rev = img_data.get("rev")
    if not rev: return None
    
    # Lógica de Split do Código
    # Se <= 8 digitos, o folder é o proprio codigo
    # Se > 8, split 3/3/3/resto
    code_str = str(code)
    if len(code_str) <= 8:
        path = code_str
    else:
        # Regex split
        regex = r"^(\d{3})(\d{3})(\d{3})(\d*)$"
        match = re.match(regex, code_str)
        if match:
            parts = [p for p in match.groups() if p]
            path = "/".join(parts)
        else:
            path = code_str # Fallback
            
    # Monta URL (usando resolução 400px que é boa pra mobile)
    # lang pode ser 'pt', 'en' etc. Vamos recuperar do img_data se possivel?
    # O img_data veio de uma key 'pt' ou 'en'. Precisamos saber qual.
    
    # Iterar de novo para saber a key
    use_lang = "pt" # Default fallback
    if front_img.get("pt"): use_lang = "pt"
    elif front_img.get("en"): use_lang = "en"
    elif front_img.get("fr"): use_lang = "fr"
    
    return f"https://images.openfoodfacts.org/images/products/{path}/front_{use_lang}.{rev}.400.jpg"

def process_chunk(chunk):
    processed_data = []
    
    for raw in chunk["raw_data"]:
        try:
            data = json.loads(raw)
            code = data.get("code") or data.get("_id") or data.get("id")
            
            if not code: continue # Sem GTIN não serve
            
            tamanho = extrair_tamanho(data)
            descricao = extrair_descricao(data, tamanho)
            
            if not descricao: continue # Sem nome válido não serve
            
            marca = extrair_marca(data)
            foto = construir_url_imagem(code, data)
            
            item = {
                "codigo_barras": code,
                "descricao": descricao,
                "marca": marca,
                "tamanho": tamanho,
                "imagem": foto,
                "preco_estimado": 0.00
            }
            
            processed_data.append(item)
            
        except Exception as e:
            continue
            
    return processed_data

def main():
    print("Iniciando higienização para JSON...")
    
    # Chunk size menor para garantir memoria com JSON array crescente
    chunk_size = 5000 
    chunks = pd.read_csv(INPUT_FILE, chunksize=chunk_size)
    
    all_products = []
    
    total_lidos = 0
    
    for chunk in chunks:
        batch = process_chunk(chunk)
        all_products.extend(batch)
        total_lidos += len(chunk)
        print(f"Lidos: {total_lidos}, Mantidos: {len(all_products)}...")
        
    print(f"Salvando {len(all_products)} produtos em {OUTPUT_FILE}...")
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_products, f, indent=2, ensure_ascii=False)
        
    print("Concluído!")

if __name__ == "__main__":
    main()
