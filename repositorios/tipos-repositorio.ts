/**
 * Interfaces que definem o contrato dos repositórios de dados.
 * 
 * Usando o Repository Pattern, podemos trocar a implementação de
 * localStorage para PostgreSQL (ou qualquer outro storage) sem
 * alterar os componentes que consomem esses dados.
 */

import { Produto, ItemCarrinho, ItemCarrinhoExpandido, Compra } from '../types';

/**
 * Contrato para operações de persistência de produtos.
 * 
 * O catálogo de produtos é indexado pelo GTIN (código de barras),
 * garantindo unicidade e busca rápida.
 */
export interface RepositorioProdutos {
  /**
   * Busca um produto pelo GTIN.
   * 
   * :param gtin: Código de barras do produto (ex: "7891000100103")
   * :returns: Produto encontrado ou null se não existir
   */
  buscarPorGTIN(gtin: string): Promise<Produto | null>;

  /**
   * Lista todos os produtos cadastrados.
   * 
   * :returns: Array com todos os produtos do catálogo
   */
  listarTodos(): Promise<Produto[]>;

  /**
   * Salva ou atualiza um produto no catálogo.
   * 
   * Se o produto já existir (mesmo GTIN), será atualizado.
   * 
   * :param produto: Dados do produto a salvar
   */
  salvar(produto: Produto): Promise<void>;

  /**
   * Remove um produto do catálogo.
   * 
   * :param gtin: GTIN do produto a remover
   */
  remover(gtin: string): Promise<void>;
}

/**
 * Contrato para operações de persistência do carrinho de compras.
 * 
 * O carrinho armazena apenas referências aos produtos (codigo_barras + quantidade).
 * Os dados completos do produto ficam no catálogo.
 */
export interface RepositorioCarrinho {
  /**
   * Obtém todos os itens do carrinho atual (apenas referências).
   * 
   * :returns: Array com referências dos itens do carrinho
   */
  obterItens(): Promise<ItemCarrinho[]>;

  /**
   * Adiciona um item ao carrinho.
   * 
   * Se o produto já estiver no carrinho, incrementa a quantidade.
   * 
   * :param codigo_barras: GTIN do produto
   * :param quantidade: Quantidade a adicionar (default: 1)
   */
  adicionarItem(codigo_barras: string, quantidade?: number): Promise<void>;

  /**
   * Atualiza a quantidade de um item no carrinho.
   * 
   * :param codigo_barras: GTIN do produto
   * :param quantidade: Nova quantidade (deve ser > 0)
   */
  atualizarQuantidade(codigo_barras: string, quantidade: number): Promise<void>;

  /**
   * Remove um item do carrinho.
   * 
   * :param codigo_barras: GTIN do produto a remover
   */
  removerItem(codigo_barras: string): Promise<void>;

  /**
   * Limpa todo o carrinho.
   */
  limpar(): Promise<void>;
}

/**
 * Contrato para persistência do histórico de compras.
 */
export interface RepositorioHistorico {
  /**
   * Salva uma nova compra no histórico.
   * 
   * :param compra: Objeto da compra finalizada (com snapshot dos itens)
   */
  salvar(compra: Compra): Promise<void>;

  /**
   * Lista todas as compras realizadas.
   * 
   * :returns: Lista de compras ordenadas (geralmente por data)
   */
  listarTodas(): Promise<Compra[]>;
}

/**
 * Agregador de todos os repositórios disponíveis.
 * 
 * Facilita a injeção de dependências via contexto React.
 */
export interface Repositorios {
  produtos: RepositorioProdutos;
  carrinho: RepositorioCarrinho;
  historico: RepositorioHistorico;
}
