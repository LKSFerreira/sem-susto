// Modelo de dados conforme especificação
export interface Produto {
  codigo_barras: string;
  nome: string;
  marca: string;
  tamanho_massa: string;
  preco_unitario: number;
  foto_base64?: string;
}

// Extensão do produto para o carrinho (adiciona quantidade)
export interface ItemCarrinho extends Produto {
  quantidade: number;
  id_unico: string; // Útil para React keys e remoção
}

// Estados possíveis da tela da aplicação
export type TelaApp = 'DASHBOARD' | 'SCANNER' | 'CADASTRO' | 'CARRINHO';

// Configurações do App
export interface ConfiguracaoApp {
  mostrarFotos: boolean;
}