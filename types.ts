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

/**
 * Item do carrinho armazena apenas referência ao produto.
 * Os dados completos do produto ficam no catálogo (sem duplicação).
 * 
 * Para exibir na UI, faz join com o catálogo usando `codigo_barras`.
 */
export interface ItemCarrinho {
  codigo_barras: string;
  quantidade: number;
}

/**
 * Item do carrinho expandido para exibição na UI.
 * Resultado do join entre ItemCarrinho e Produto do catálogo.
 */
export interface ItemCarrinhoExpandido extends Produto {
  quantidade: number;
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
  itens: ItemCarrinhoExpandido[]; // Snapshot dos itens no momento da compra
  total: number;
}