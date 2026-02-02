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
 * Tenta extrair o tamanho/peso da string de descrição.
 * Ex: "... 1KG" -> "1KG"
 */
export function extrairTamanho(descricao: string): string | null {
  const regex = /\b(\d+(?:[.,]\d+)?\s*(?:KG|G|L|ML|MM|M))\b/i;
  const match = descricao.match(regex);
  return match ? match[1].toUpperCase() : null;
}