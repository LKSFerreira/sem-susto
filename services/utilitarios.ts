/**
 * Formata um número para moeda BRL
 */
export const formatarMoeda = (valor: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
};

/**
 * Formata texto para Title Case (Primeira Letra Maiúscula), ignorando preposições.
 * Ex: "LEITE EM PÓ INTEGRAL" -> "Leite em Pó Integral"
 */
export const formatarTitulo = (texto: string): string => {
  if (!texto) return '';
  const conectivos = [
    'de', 'da', 'do', 'dos', 'das', 'com', 'e', 'em', 'para', 'por', 'sem',
    'a', 'o', 'as', 'os', 'um', 'uns', 'uma', 'umas',
    'no', 'na', 'nos', 'nas', 'pelo', 'pela', 'pelos', 'pelas',
    'até', 'sob', 'sobre', 'ante', 'após', 'desde', 'entre'
  ];

  return texto
    .toLowerCase()
    .split(' ')
    .map((palavra, index) => {
      if (index > 0 && conectivos.includes(palavra)) return palavra;
      return palavra.charAt(0).toUpperCase() + palavra.slice(1);
    })
    .join(' ');
};

// --- Canvas Utils para Recorte ---
const criarImagem = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const imagem = new Image();
    imagem.addEventListener('load', () => resolve(imagem));
    imagem.addEventListener('error', (error) => reject(error));
    imagem.setAttribute('crossOrigin', 'anonymous');
    imagem.src = url;
  });

export async function obterImagemRecortada(imagemSrc: string, pixelCrop: any): Promise<string> {
  const imagem = await criarImagem(imagemSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    imagem,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * Simula a biblioteca 'browser-image-compression' usando Canvas nativo.
 * Isso permite reduzir o tamanho da imagem antes de salvar no LocalStorage
 * para não estourar a cota de armazenamento do navegador.
 */
export const comprimirImagem = async (arquivo: File, qualidade: number = 0.7, larguraMax: number = 300): Promise<string> => {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.readAsDataURL(arquivo);
    leitor.onload = (evento) => {
      const img = new Image();
      img.src = evento.target?.result as string;
      img.onload = () => {
        const elementoCanvas = document.createElement('canvas');
        const proporcao = larguraMax / img.width;

        // Se a imagem for menor que o máximo, mantém o tamanho
        const novaLargura = img.width > larguraMax ? larguraMax : img.width;
        const novaAltura = img.width > larguraMax ? img.height * proporcao : img.height;

        elementoCanvas.width = novaLargura;
        elementoCanvas.height = novaAltura;

        const ctx = elementoCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, novaLargura, novaAltura);
          // Retorna a imagem comprimida em Base64 (JPEG)
          resolve(elementoCanvas.toDataURL('image/jpeg', qualidade));
        } else {
          reject(new Error('Falha ao obter contexto do Canvas'));
        }
      };
      img.onerror = (erro) => reject(erro);
    };
    leitor.onerror = (erro) => reject(erro);
  });
};

/**
 * Comprime uma imagem em formato Base64 para reduzir tamanho antes de salvar no banco.
 * Usa Canvas nativo para redimensionar e recodificar com menor qualidade.
 *
 * **Exemplo:**
 *
 * .. code-block:: typescript
 *
 *     const base64Original = canvas.toDataURL('image/jpeg', 0.9);
 *     const base64Comprimido = await comprimirImagemBase64(base64Original);
 *     console.log('Antes:', base64Original.length, 'Depois:', base64Comprimido.length);
 *
 * :param base64: String base64 da imagem (com prefixo data:image/...)
 * :param qualidade: Qualidade JPEG de 0 a 1 (default: 0.7)
 * :param larguraMaxima: Largura máxima em pixels (default: 400)
 * :returns: String base64 comprimida
 */
export const comprimirImagemBase64 = async (
  base64: string,
  qualidade: number = 0.7,
  larguraMaxima: number = 400
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    imagem.src = base64;

    imagem.onload = () => {
      const canvas = document.createElement('canvas');

      // Calcula nova dimensão mantendo proporção
      const proporcao = larguraMaxima / imagem.width;
      const novaLargura = imagem.width > larguraMaxima ? larguraMaxima : imagem.width;
      const novaAltura = imagem.width > larguraMaxima ? imagem.height * proporcao : imagem.height;

      canvas.width = novaLargura;
      canvas.height = novaAltura;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(imagem, 0, 0, novaLargura, novaAltura);

        // Retorna base64 comprimido em JPEG
        const resultado = canvas.toDataURL('image/jpeg', qualidade);

        // Log para debug (útil durante desenvolvimento)
        const tamanhoOriginal = Math.round(base64.length / 1024);
        const tamanhoFinal = Math.round(resultado.length / 1024);
        console.log(`📷 Compressão: ${tamanhoOriginal}KB → ${tamanhoFinal}KB (${Math.round((1 - tamanhoFinal / tamanhoOriginal) * 100)}% redução)`);

        resolve(resultado);
      } else {
        reject(new Error('Falha ao obter contexto do Canvas'));
      }
    };

    imagem.onerror = (erro) => reject(erro);
  });
};

const UNIT_MAP: Record<string, string> = {
  // --- VOLUME ---
  // Litros
  'l': 'L', 'lt': 'L', 'lts': 'L', 'litro': 'L', 'litros': 'L',
  'L': 'L', 'LT': 'L', 'LTS': 'L',
  // Mililitros
  'ml': 'ml', 'mL': 'ml', 'ML': 'ml', 'm.l': 'ml', 'mils': 'ml',

  // --- MASSA / PESO ---
  // Quilogramas
  'k': 'kg', 'kg': 'kg', 'k.g': 'kg', 'quilo': 'kg', 'kilo': 'kg',
  'kilograma': 'kg', 'quilograma': 'kg', 'kg.': 'kg', 'kgs': 'kg',
  'KG': 'kg',
  // Gramas
  'g': 'g', 'gr': 'g', 'grs': 'g', 'grama': 'g', 'gramas': 'g', 'g.': 'g',
  'G': 'g', 'GR': 'g',
  // Miligramas (comum em farmácia/suplementos)
  'mg': 'mg', 'mgs': 'mg', 'miligrama': 'mg', 'miligramas': 'mg',

  // --- UNIDADES / CONTAGEM ---
  // Unidade
  'u': 'un', 'un': 'un', 'und': 'un', 'uni': 'un', 'unid': 'un',
  'unidade': 'un', 'unidades': 'un', 'unis': 'un', 'pç': 'un', 'pca': 'un', 'peca': 'un',
  'U': 'un', 'UN': 'un',
  // Dúzia
  'dz': 'dz', 'duzia': 'dz', 'dúzia': 'dz',

  // --- EMBALAGENS (Normalizar para tipos padrão ajuda na categorização) ---
  // Caixa
  'cx': 'cx', 'cxa': 'cx', 'caixa': 'cx', 'caixas': 'cx', 'box': 'cx',
  // Pacote
  'pct': 'pct', 'pcte': 'pct', 'pacote': 'pct', 'pacotes': 'pct', 'pc': 'pct', 'pack': 'pct',
  // Fardo
  'fd': 'fd', 'fdo': 'fd', 'fardo': 'fd',
  // Lata (opcional, as vezes útil normalizar para UN ou manter LATA)
  'lata': 'lata', 'latas': 'lata',
  // Garrafa
  'gf': 'gf', 'gfa': 'gf', 'garrafa': 'gf', 'garrafas': 'gf',

  // --- COMPRIMENTO (Papelaria, Higiene) ---
  // Metros
  'm': 'm', 'mt': 'm', 'mts': 'm', 'metro': 'm', 'metros': 'm',
  // Centímetros
  'cm': 'cm', 'cms': 'cm', 'centimetro': 'cm',
  // Milímetros
  'mm': 'mm', 'mms': 'mm'
};

const REGEX_UNIDADES = /(?<val>\d+(?:[.,]\d+)?)\s*(?<unit>[a-zA-Z.]+)/;

export function normalizarUnidade(valorRaw: string, unidadeRaw: string): string {
  const valor = valorRaw.replace(',', '.');
  const unidadeClean = unidadeRaw.toLowerCase().replace(/\.$/, '').trim();

  if (UNIT_MAP[unidadeClean]) {
    const unidadeFinal = UNIT_MAP[unidadeClean];
    // Remove decimais desnecessários (.0)
    const floatVal = parseFloat(valor);
    const valorFinal = Number.isInteger(floatVal) ? floatVal.toString() : valor;

    return `${valorFinal}${unidadeFinal}`;
  }

  return `${valor}${unidadeClean}`;
}

/**
 * Tenta extrair o tamanho/peso da string de descrição ou normalizar string bruta.
 * Ex: "... 1KG" -> "1kg"
 */
export function extrairTamanho(texto: string): string | null {
  if (!texto) return null;

  const match = texto.match(REGEX_UNIDADES);
  if (match && match.groups) {
    return normalizarUnidade(match.groups.val, match.groups.unit);
  }
  return null;
}

/**
 * Constrói a URL da imagem pública do OpenFoodFacts a partir do código de barras.
 * Lógica de split para códigos > 8 dígitos.
 */
export function construirUrlImagemOFF(codigo: string): string | null {
  if (!codigo) return null;

  const strCode = codigo.toString();
  let path = strCode;

  if (strCode.length > 8) {
    const match = strCode.match(/^(\d{3})(\d{3})(\d{3})(\d*)$/);
    if (match) {
      // Remove grupos undefined/vazios
      const parts = match.slice(1).filter(p => p);
      path = parts.join('/');
    }
  }

  // Tenta estimar a revisão? Não temos como saber a revisão sem consultar a API.
  // Porem, se tivermos o objeto de imagens da API, podemos passar rev.
  // Sem rev, essa URL genérica pode falhar ou precisar de redirect.
  // Mas a API de imagens suporta: .../front_pt.jpg (sem rev, pega a ultima)?
  // Testes indicam que sim, as vezes. Mas o padrão oficial pede rev.
  // Vamos assumir que essa função serve para quando NÃO TEMOS url, então tentamos a sorte.
  return `https://images.openfoodfacts.org/images/products/${path}/front_pt.400.jpg`;
}