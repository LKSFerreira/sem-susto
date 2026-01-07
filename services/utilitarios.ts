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