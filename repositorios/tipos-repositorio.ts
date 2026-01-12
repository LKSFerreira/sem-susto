/**
 * Interfaces que definem o contrato dos repositórios de dados.
 * 
 * Usando o Repository Pattern, podemos trocar a implementação de
 * localStorage para PostgreSQL (ou qualquer outro storage) sem
 * alterar os componentes que consomem esses dados.
 * 
 * **Exemplo:**
 * 
 * .. code-block:: typescript
 * 
 *     // Hoje usamos localStorage
 *     const repositorio = new RepositorioProdutosLocalStorage();
 *     
 *     // Amanhã trocamos para Postgres sem mudar o App.tsx
 *     const repositorio = new RepositorioProdutosPostgres();
 */

import { Produto, ItemCarrinho } from '../types';

/**
 * Contrato para operações de persistência de produtos.
 * 
 * O catálogo de produtos é indexado pelo código de barras,
 * garantindo unicidade e busca rápida.
 */
export interface RepositorioProdutos {
  /**
   * Busca um produto pelo código de barras.
   * 
   * :param codigo: Código de barras do produto (ex: "7891000100103")
   * :returns: Produto encontrado ou null se não existir
   */
  buscarPorCodigo(codigo: string): Promise<Produto | null>;

  /**
   * Lista todos os produtos cadastrados.
   * 
   * :returns: Array com todos os produtos do catálogo
   */
  listarTodos(): Promise<Produto[]>;

  /**
   * Salva ou atualiza um produto no catálogo.
   * 
   * Se o produto já existir (mesmo código de barras), será atualizado.
   * 
   * :param produto: Dados do produto a salvar
   */
  salvar(produto: Produto): Promise<void>;

  /**
   * Remove um produto do catálogo.
   * 
   * :param codigo: Código de barras do produto a remover
   */
  remover(codigo: string): Promise<void>;
}

/**
 * Contrato para operações de persistência do carrinho de compras.
 * 
 * O carrinho armazena itens temporários da compra atual,
 * com controle de quantidade por produto.
 */
export interface RepositorioCarrinho {
  /**
   * Obtém todos os itens do carrinho atual.
   * 
   * :returns: Array com itens do carrinho
   */
  obterItens(): Promise<ItemCarrinho[]>;

  /**
   * Adiciona um item ao carrinho.
   * 
   * Se o produto já estiver no carrinho, a implementação pode
   * optar por incrementar a quantidade ou retornar erro.
   * 
   * :param item: Item a adicionar
   */
  adicionarItem(item: ItemCarrinho): Promise<void>;

  /**
   * Atualiza a quantidade de um item no carrinho.
   * 
   * :param codigo: Código de barras do produto
   * :param quantidade: Nova quantidade (deve ser > 0)
   */
  atualizarQuantidade(codigo: string, quantidade: number): Promise<void>;

  /**
   * Remove um item do carrinho.
   * 
   * :param codigo: Código de barras do produto a remover
   */
  removerItem(codigo: string): Promise<void>;

  /**
   * Limpa todo o carrinho.
   * 
   * Útil após finalizar uma compra.
   */
  limpar(): Promise<void>;

  /**
   * Salva o estado completo do carrinho.
   * 
   * Útil para persistir múltiplas alterações de uma vez.
   * 
   * :param itens: Array completo de itens para salvar
   */
  salvarTodos(itens: ItemCarrinho[]): Promise<void>;
}

/**
 * Agregador de todos os repositórios disponíveis.
 * 
 * Facilita a injeção de dependências via contexto React.
 */
export interface Repositorios {
  produtos: RepositorioProdutos;
  carrinho: RepositorioCarrinho;
}
