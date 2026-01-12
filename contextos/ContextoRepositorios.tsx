/**
 * Contexto React para injeção de repositórios.
 * 
 * Este contexto permite que qualquer componente da árvore acesse
 * os repositórios de dados sem precisar passar props manualmente.
 * 
 * **Por que usar contexto?**
 * 
 * 1. Evita "prop drilling" (passar repositórios por várias camadas)
 * 2. Facilita trocar a implementação (localStorage → Postgres) em um único lugar
 * 3. Permite mockar repositórios em testes
 * 
 * **Exemplo:**
 * 
 * .. code-block:: tsx
 * 
 *     // No componente
 *     function MeuComponente() {
 *       const { produtos, carrinho } = useRepositorios();
 *       
 *       const carregarProdutos = async () => {
 *         const lista = await produtos.listarTodos();
 *         // ...
 *       };
 *     }
 */

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { Repositorios } from '../repositorios/tipos-repositorio';
import { 
  RepositorioProdutosLocalStorage, 
  RepositorioCarrinhoLocalStorage,
  RepositorioHistoricoLocalStorage
} from '../repositorios/local-storage';

/**
 * Contexto que armazena a instância dos repositórios.
 * 
 * O valor inicial é null para detectar uso fora do Provider.
 */
const ContextoRepositorios = createContext<Repositorios | null>(null);

/**
 * Props do componente ProvedorRepositorios.
 */
interface PropsProvedorRepositorios {
  children: ReactNode;
  /** 
   * Repositórios customizados (opcional).
   * Útil para testes ou para injetar implementação diferente.
   */
  repositoriosCustomizados?: Repositorios;
}

/**
 * Provider que injeta os repositórios na árvore de componentes.
 * 
 * Deve envolver o componente raiz da aplicação (geralmente no index.tsx).
 * 
 * **Exemplo:**
 * 
 * .. code-block:: tsx
 * 
 *     // index.tsx
 *     <ProvedorRepositorios>
 *       <App />
 *     </ProvedorRepositorios>
 */
export function ProvedorRepositorios({ 
  children, 
  repositoriosCustomizados 
}: PropsProvedorRepositorios) {
  
  // useMemo garante que as instâncias são criadas apenas uma vez
  const repositorios = useMemo<Repositorios>(() => {
    // Se foram passados repositórios customizados (ex: para testes), usa eles
    if (repositoriosCustomizados) {
      return repositoriosCustomizados;
    }
    
    // Caso contrário, usa a implementação padrão com localStorage
    return {
      produtos: new RepositorioProdutosLocalStorage(),
      carrinho: new RepositorioCarrinhoLocalStorage(),
      historico: new RepositorioHistoricoLocalStorage(),
    };
  }, [repositoriosCustomizados]);

  return (
    <ContextoRepositorios.Provider value={repositorios}>
      {children}
    </ContextoRepositorios.Provider>
  );
}

/**
 * Hook para acessar os repositórios em qualquer componente.
 * 
 * Lança erro se usado fora do ProvedorRepositorios.
 * 
 * **Exemplo:**
 * 
 * .. code-block:: tsx
 * 
 *     function CarrinhoCompras() {
 *       const { carrinho } = useRepositorios();
 *       
 *       const limparCarrinho = async () => {
 *         await carrinho.limpar();
 *       };
 *     }
 * 
 * :returns: Objeto com todos os repositórios disponíveis
 * :raises Error: Se chamado fora do ProvedorRepositorios
 */
export function useRepositorios(): Repositorios {
  const contexto = useContext(ContextoRepositorios);
  
  if (!contexto) {
    throw new Error(
      'useRepositorios deve ser usado dentro de um ProvedorRepositorios. ' +
      'Verifique se o componente está envolvido pelo provider no index.tsx.'
    );
  }
  
  return contexto;
}
