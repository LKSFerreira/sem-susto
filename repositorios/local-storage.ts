/**
 * Implementação dos repositórios usando localStorage.
 * 
 * Esta é a implementação padrão para o MVP. Os dados ficam
 * armazenados no navegador do usuário e persistem entre sessões,
 * mas são perdidos se o usuário limpar o cache.
 * 
 * **Exemplo:**
 * 
 * .. code-block:: typescript
 * 
 *     const repositorioProdutos = new RepositorioProdutosLocalStorage();
 *     await repositorioProdutos.salvar({ gtin: "123", description: "Leite", ... });
 *     const produto = await repositorioProdutos.buscarPorGTIN("123");
 */

import { Produto, ItemCarrinho, Compra } from '../types';
import { RepositorioProdutos, RepositorioCarrinho, RepositorioHistorico } from './tipos-repositorio';
import { CHAVE_STORAGE_CATALOGO, CHAVE_STORAGE_CARRINHO, CHAVE_STORAGE_HISTORICO } from '../constants';

/**
 * Implementação do repositório de produtos usando localStorage.
 * 
 * Os produtos são armazenados como um objeto indexado pelo GTIN,
 * permitindo busca O(1) por código.
 */
export class RepositorioProdutosLocalStorage implements RepositorioProdutos {

  /**
   * Carrega o catálogo do localStorage.
   * 
   * :returns: Objeto com produtos indexados por GTIN
   */
  private carregarCatalogo(): Record<string, Produto> {
    try {
      const dados = localStorage.getItem(CHAVE_STORAGE_CATALOGO);
      return dados ? JSON.parse(dados) : {};
    } catch (erro) {
      console.error('Erro ao carregar catálogo do localStorage:', erro);
      return {};
    }
  }

  /**
   * Salva o catálogo no localStorage.
   * 
   * :param catalogo: Objeto com produtos a salvar
   */
  private salvarCatalogo(catalogo: Record<string, Produto>): void {
    try {
      localStorage.setItem(CHAVE_STORAGE_CATALOGO, JSON.stringify(catalogo));
    } catch (erro) {
      console.error('Erro ao salvar catálogo no localStorage:', erro);
      // Pode acontecer se exceder a cota de storage (geralmente 5-10MB)
      throw new Error('Falha ao salvar produto. Verifique o espaço de armazenamento.');
    }
  }

  async buscarPorGTIN(gtin: string): Promise<Produto | null> {
    const catalogo = this.carregarCatalogo();
    return catalogo[gtin] || null;
  }

  async listarTodos(): Promise<Produto[]> {
    const catalogo = this.carregarCatalogo();
    return Object.values(catalogo);
  }

  async salvar(produto: Produto): Promise<void> {
    const catalogo = this.carregarCatalogo();
    catalogo[produto.codigo_barras] = produto;
    this.salvarCatalogo(catalogo);
  }

  async remover(gtin: string): Promise<void> {
    const catalogo = this.carregarCatalogo();
    delete catalogo[gtin];
    this.salvarCatalogo(catalogo);
  }
}

/**
 * Implementação do repositório de carrinho usando localStorage.
 * 
 * O carrinho é armazenado como um array de itens, permitindo
 * preservar a ordem de inserção.
 */
export class RepositorioCarrinhoLocalStorage implements RepositorioCarrinho {

  /**
   * Carrega os itens do carrinho do localStorage.
   * 
   * :returns: Array de itens do carrinho
   */
  private carregarCarrinho(): ItemCarrinho[] {
    try {
      const dados = localStorage.getItem(CHAVE_STORAGE_CARRINHO);
      return dados ? JSON.parse(dados) : [];
    } catch (erro) {
      console.error('Erro ao carregar carrinho do localStorage:', erro);
      return [];
    }
  }

  /**
   * Salva os itens do carrinho no localStorage.
   * 
   * :param itens: Array de itens a salvar
   */
  private salvarCarrinho(itens: ItemCarrinho[]): void {
    try {
      localStorage.setItem(CHAVE_STORAGE_CARRINHO, JSON.stringify(itens));
    } catch (erro) {
      console.error('Erro ao salvar carrinho no localStorage:', erro);
      throw new Error('Falha ao salvar carrinho. Verifique o espaço de armazenamento.');
    }
  }

  async obterItens(): Promise<ItemCarrinho[]> {
    return this.carregarCarrinho();
  }

  async adicionarItem(item: ItemCarrinho): Promise<void> {
    const itens = this.carregarCarrinho();

    // Verifica se o produto já existe no carrinho
    const indiceExistente = itens.findIndex(
      existente => existente.codigo_barras === item.codigo_barras
    );

    if (indiceExistente >= 0) {
      // Incrementa quantidade se já existe
      itens[indiceExistente].quantidade += item.quantidade;
    } else {
      // Adiciona novo item
      itens.push(item);
    }

    this.salvarCarrinho(itens);
  }

  // Antigo: atualizarQuantidade(codigo, quantidade)
  async atualizarQuantidade(codigo_barras: string, quantity: number): Promise<void> {
    const itens = this.carregarCarrinho();

    const indice = itens.findIndex(item => item.codigo_barras === codigo_barras);

    if (indice >= 0) {
      if (quantity <= 0) {
        // Remove item se quantidade for zero ou negativa
        itens.splice(indice, 1);
      } else {
        itens[indice].quantidade = quantity;
      }
      this.salvarCarrinho(itens);
    }
  }

  // Antigo: removerItem(codigo)
  async removerItem(codigo_barras: string): Promise<void> {
    const itens = this.carregarCarrinho();
    const itensFiltrados = itens.filter(item => item.codigo_barras !== codigo_barras);
    this.salvarCarrinho(itensFiltrados);
  }

  async limpar(): Promise<void> {
    this.salvarCarrinho([]);
  }

  async salvarTodos(itens: ItemCarrinho[]): Promise<void> {
    this.salvarCarrinho(itens);
  }
}

/**
 * Implementação do repositório de histórico usando localStorage.
 */
export class RepositorioHistoricoLocalStorage implements RepositorioHistorico {

  private carregarHistorico(): Compra[] {
    try {
      const dados = localStorage.getItem(CHAVE_STORAGE_HISTORICO);
      return dados ? JSON.parse(dados) : [];
    } catch (erro) {
      console.error('Erro ao carregar histórico:', erro);
      return [];
    }
  }

  private salvarHistorico(compras: Compra[]): void {
    try {
      localStorage.setItem(CHAVE_STORAGE_HISTORICO, JSON.stringify(compras));
    } catch (erro) {
      console.error('Erro ao salvar histórico:', erro);
      throw new Error('Falha ao salvar histórico. Armazenamento cheio?');
    }
  }

  async salvar(compra: Compra): Promise<void> {
    const historico = this.carregarHistorico();
    // Adiciona no início da lista (mais recente primeiro)
    historico.unshift(compra);
    this.salvarHistorico(historico);
  }

  async listarTodas(): Promise<Compra[]> {
    return this.carregarHistorico();
  }
}
