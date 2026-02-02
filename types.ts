export interface Produto {
  codigo_barras: string;
  descricao: string;
  marca: string;
  tamanho: string;
  preco_estimado?: number;
  /**
   * Pode ser uma URL remota (http...) ou Base64 local (data:image...)
   * Estratégia Híbrida para MVP.
   */
  imagem?: string;
}

// Extensão do produto para o carrinho (adiciona quantidade)
export interface ItemCarrinho extends Produto {
  quantidade: number;
  uuid: string;
}

// Estados possíveis da tela da aplicação
export type TelaApp = 'DASHBOARD' | 'SCANNER' | 'CADASTRO' | 'CARRINHO';

// Configurações do App
export interface ConfiguracaoApp {
  mostrarFotos: boolean;
}

// Histórico de Compras
export interface Compra {
  id: string;
  data: string; // ISO String
  itens: ItemCarrinho[];
  total: number;
}