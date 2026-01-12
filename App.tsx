import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Produto, ItemCarrinho, TelaApp } from './types';
import { IMAGEM_PADRAO } from './constants';
import { formatarMoeda } from './services/utilitarios';
import { ScannerBarras } from './components/ScannerBarras';
import { FormularioProduto } from './components/FormularioProduto';
import { DebugConsole } from './components/DebugConsole';
import { ModalDoacao } from './components/ModalDoacao';
import { useRepositorios } from './contextos/ContextoRepositorios';

export default function App() {
  // --- Acesso aos repositórios via contexto ---
  const { produtos: repositorioProdutos, carrinho: repositorioCarrinho, historico: repositorioHistorico } = useRepositorios();

  // --- Estados ---
  const [telaAtual, setTelaAtual] = useState<TelaApp>('DASHBOARD');
  
  // Catálogo agora é carregado do repositório
  const [catalogo, setCatalogo] = useState<Record<string, Produto>>({});
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  
  // Flag para indicar se os dados foram carregados
  const [carregado, setCarregado] = useState(false);
  
  // Estado para fluxo de cadastro/adição
  const [codigoLido, setCodigoLido] = useState<string | null>(null);
  
  const [mostrarDoacao, setMostrarDoacao] = useState(false);

  // --- Efeitos (Carregamento inicial) ---
  
  /**
   * Carrega dados do repositório ao iniciar o app.
   * 
   * Como os repositórios retornam Promises, usamos async/await.
   * O estado `carregado` evita múltiplos carregamentos.
   */
  useEffect(() => {
    const carregarDados = async () => {
      try {
        // Carrega catálogo (converte array para objeto indexado)
        const listaProdutos = await repositorioProdutos.listarTodos();
        const catalogoCarregado: Record<string, Produto> = {};
        listaProdutos.forEach(produto => {
          catalogoCarregado[produto.codigo_barras] = produto;
        });
        setCatalogo(catalogoCarregado);

        // Carrega carrinho
        const itensCarrinho = await repositorioCarrinho.obterItens();
        setCarrinho(itensCarrinho);
        
        setCarregado(true);
      } catch (erro) {
        console.error('Erro ao carregar dados:', erro);
        setCarregado(true); // Marca como carregado mesmo com erro para não travar a UI
      }
    };

    carregarDados();
  }, [repositorioProdutos, repositorioCarrinho]);

  // --- Lógica de Negócio ---

  const calcularTotal = useMemo(() => {
    return carrinho.reduce((acc, item) => acc + (item.preco_unitario * item.quantidade), 0);
  }, [carrinho]);

  /**
   * Callback quando um código de barras é lido.
   * 
   * Se o produto já existe no catálogo, adiciona direto ao carrinho.
   * Se não existe, abre o formulário de cadastro.
   */
  const aoLerCodigo = useCallback((codigo: string) => {
    setCodigoLido(codigo);
    
    if (catalogo[codigo]) {
      // Produto já existe, adicionar ao carrinho
      adicionarAoCarrinho(catalogo[codigo]);
      setTelaAtual('DASHBOARD');
      setCodigoLido(null);
    } else {
      // Produto novo, ir para cadastro
      setTelaAtual('CADASTRO');
    }
  }, [catalogo]);

  /**
   * Adiciona um produto ao carrinho.
   * 
   * Se o produto já estiver no carrinho, incrementa a quantidade.
   * Persiste a alteração no repositório.
   */
  const adicionarAoCarrinho = useCallback(async (produto: Produto) => {
    const novoItem: ItemCarrinho = {
      ...produto,
      quantidade: 1,
      id_unico: Date.now().toString()
    };
    
    // Atualiza estado local primeiro (UI responsiva)
    setCarrinho(prev => {
      const index = prev.findIndex(item => item.codigo_barras === produto.codigo_barras);
      if (index >= 0) {
        const novoCarrinho = [...prev];
        novoCarrinho[index].quantidade += 1;
        return novoCarrinho;
      }
      return [...prev, novoItem];
    });

    // Persiste no repositório
    try {
      await repositorioCarrinho.adicionarItem(novoItem);
    } catch (erro) {
      console.error('Erro ao adicionar item ao carrinho:', erro);
    }
  }, [repositorioCarrinho]);

  /**
   * Salva um novo produto no catálogo e adiciona ao carrinho.
   */
  const salvarProdutoNoCatalogo = useCallback(async (produto: Produto) => {
    // Atualiza estado local
    setCatalogo(prev => ({ ...prev, [produto.codigo_barras]: produto }));
    
    // Persiste no repositório
    try {
      await repositorioProdutos.salvar(produto);
    } catch (erro) {
      console.error('Erro ao salvar produto:', erro);
    }
    
    // Adiciona ao carrinho
    await adicionarAoCarrinho(produto);
    
    setTelaAtual('DASHBOARD');
    setCodigoLido(null);
  }, [repositorioProdutos, adicionarAoCarrinho]);

  /**
   * Remove um item do carrinho.
   */
  const removerItem = useCallback(async (codigoBarras: string) => {
    // Feedback tátil
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    // Atualiza estado local
    setCarrinho(prev => prev.filter(item => item.codigo_barras !== codigoBarras));
    
    // Persiste no repositório
    try {
      await repositorioCarrinho.removerItem(codigoBarras);
    } catch (erro) {
      console.error('Erro ao remover item:', erro);
    }
  }, [repositorioCarrinho]);

  /**
   * Altera a quantidade de um item no carrinho.
   * 
   * Se a quantidade chegar a zero, remove o item.
   */
  const alterarQuantidade = useCallback(async (codigoBarras: string, delta: number) => {
    let novaQuantidade = 0;
    
    // Atualiza estado local
    setCarrinho(prev => {
      return prev.reduce((acc, item) => {
        if (item.codigo_barras === codigoBarras) {
          novaQuantidade = item.quantidade + delta;
          
          if (novaQuantidade > 0) {
            acc.push({ ...item, quantidade: novaQuantidade });
          } else {
            // Vibra ao remover
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate(50);
            }
          }
        } else {
          acc.push(item);
        }
        return acc;
      }, [] as ItemCarrinho[]);
    });

    // Persiste no repositório
    try {
      if (novaQuantidade > 0) {
        await repositorioCarrinho.atualizarQuantidade(codigoBarras, novaQuantidade);
      } else {
        await repositorioCarrinho.removerItem(codigoBarras);
      }
    } catch (erro) {
      console.error('Erro ao alterar quantidade:', erro);
    }
  }, [repositorioCarrinho]);

  /**
   * Finaliza a compra atual.
   */
  const finalizarCompra = useCallback(async () => {
    if (carrinho.length === 0) return;

    // Confirmação simples
    if (!window.confirm(`Finalizar compra de ${carrinho.length} itens no valor de ${formatarMoeda(calcularTotal)}?`)) {
      return;
    }

    try {
      // 1. Cria objeto de compra
      const novaCompra = {
        id: crypto.randomUUID(),
        data: new Date().toISOString(),
        itens: [...carrinho],
        total: calcularTotal
      };

      // 2. Salva no histórico
      await repositorioHistorico.salvar(novaCompra);

      // 3. Limpa o carrinho
      await repositorioCarrinho.limpar();
      setCarrinho([]);
      
      // 4. Feedback
      alert('Compra finalizada com sucesso! ✅');
      
      // Feedback tátil
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }

    } catch (erro) {
      console.error('Erro ao finalizar compra:', erro);
      alert('Erro ao finalizar compra. Tente novamente.');
    }
  }, [carrinho, calcularTotal, repositorioHistorico, repositorioCarrinho]);

  /**
   * Limpa todo o carrinho após confirmação.
   */
  const limparCarrinho = useCallback(async () => {
    if (carrinho.length === 0) return;

    if (window.confirm('Tem certeza que deseja esvaziar o carrinho?')) {
      // Feedback tátil
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      // Atualiza estado local
      setCarrinho([]);

      // Persiste no repositório
      try {
        await repositorioCarrinho.limpar();
      } catch (erro) {
        console.error('Erro ao limpar carrinho:', erro);
      }
    }
  }, [carrinho.length, repositorioCarrinho]);

  // --- Renderização ---

  // Mostra loading enquanto carrega dados
  if (!carregado) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-verde-600 mb-4"></i>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      
      {/* 1. Barra de Navegação Superior */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-md mx-auto px-4 py-3 flex justify-between items-center">
          
          {/* Logo e Título */}
          <div className="flex items-center gap-2">
            <div className="bg-verde-100 p-2 rounded-full text-verde-600">
              <i className="fas fa-shopping-cart"></i>
            </div>
            <div>
              <h1 className="font-bold text-gray-800 leading-tight">Preço Certo</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Controle de Gastos</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Botão de Doação */}
            <button 
              onClick={() => setMostrarDoacao(true)}
              className="bg-red-50 text-red-500 px-3 py-2 rounded-lg text-xs font-bold border border-red-100 hover:bg-red-100 transition-colors flex items-center gap-1 shadow-sm"
              title="Fazer uma doação"
            >
              <i className="fas fa-heart"></i>
              <span className="hidden sm:inline">Apoiar</span>
            </button>

            {/* Botão Esvaziar Carrinho */}
            {carrinho.length > 0 && (
              <button 
                onClick={limparCarrinho}
                className="p-2 rounded-lg text-sm font-medium transition-colors bg-red-50 text-red-600 hover:bg-red-100"
                title="Esvaziar carrinho"
              >
                <i className="fas fa-trash-alt mr-1"></i>
                <span className="text-xs">Esvaziar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. Área Principal (Lista de Compras) */}
      <main className="flex-1 max-w-md mx-auto w-full p-4 pb-32">
        {carrinho.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <i className="fas fa-shopping-basket text-6xl mb-4 text-gray-200"></i>
            <p>Seu carrinho está vazio.</p>
            <p className="text-sm">Escaneie um produto para começar!</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {carrinho.map((item) => (
              <li key={item.codigo_barras} className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex gap-3 animate-fade-in relative group">
                
                {/* Imagem */}
                <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                    <img 
                      src={item.foto_base64 || IMAGEM_PADRAO} 
                      alt={item.nome} 
                      className="w-full h-full object-cover"
                    />
                  </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-gray-800 truncate pr-8">
                        {item.nome}
                      </h3>
                      
                      {/* Botão de Remoção Explícito (Lixeira) */}
                      <button 
                        onClick={() => {
                          if (window.confirm(`Remover "${item.nome}" do carrinho?`)) {
                            removerItem(item.codigo_barras);
                          }
                        }} 
                        className="absolute top-3 right-3 text-gray-300 hover:text-red-500 p-2 transition-colors"
                        title="Remover item"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {item.marca} • {item.tamanho_massa}
                    </p>
                  </div>
                  
                  {/* Controles de Preço e Quantidade */}
                  <div className="flex justify-between items-end mt-1">
                    <div className="flex items-center gap-1 bg-gray-50 rounded p-1 border border-gray-100">
                      {/* Botão Menos / Lixeira */}
                      <button 
                        onClick={() => alterarQuantidade(item.codigo_barras, -1)}
                        className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
                          item.quantidade === 1 
                            ? 'text-red-500 hover:bg-red-50' 
                            : 'text-verde-600 hover:bg-verde-50'
                        }`}
                        title={item.quantidade === 1 ? "Remover" : "Diminuir"}
                      >
                        {item.quantidade === 1 ? (
                          <i className="fas fa-trash-alt text-xs"></i>
                        ) : (
                          <i className="fas fa-minus text-xs"></i>
                        )}
                      </button>
                      
                      <span className="text-sm font-bold w-6 text-center text-gray-700 select-none">
                        {item.quantidade}
                      </span>
                      
                      <button 
                         onClick={() => alterarQuantidade(item.codigo_barras, 1)}
                         className="w-8 h-8 flex items-center justify-center text-verde-600 hover:bg-verde-50 rounded transition-colors"
                      >
                        <i className="fas fa-plus text-xs"></i>
                      </button>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-xs text-gray-400 font-mono">
                        {item.quantidade}x {formatarMoeda(item.preco_unitario)}
                      </div>
                      <div className="font-bold text-gray-900 font-mono text-lg">
                        {formatarMoeda(item.preco_unitario * item.quantidade)}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {/* 3. Rodapé Fixo (Totais e Ação Principal) */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="max-w-md mx-auto p-4 flex flex-col gap-3">
          
          <div className="flex justify-between items-end px-1">
            <span className="text-gray-500 font-medium">Total Geral</span>
            <span className="text-3xl font-bold text-verde-600 font-mono">
              {formatarMoeda(calcularTotal)}
            </span>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => setTelaAtual('SCANNER')}
              className="flex-1 bg-verde-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-verde-700 active:transform active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <i className="fas fa-barcode text-xl"></i>
              <span>Ler Código</span>
            </button>

            {carrinho.length > 0 && (
              <button 
                onClick={finalizarCompra}
                className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 active:transform active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <i className="fas fa-check text-xl"></i>
                <span>Finalizar</span>
              </button>
            )}
          </div>
        </div>
      </footer>



      {/* Mobile Debugger (Apenas Dev) */}
      {import.meta.env.DEV && <DebugConsole />}

      {/* --- Modais e Telas Sobrepostas --- */}

      {/* Modal de Doação */}
      {mostrarDoacao && (
        <ModalDoacao aoFechar={() => setMostrarDoacao(false)} />
      )}

      {/* Scanner Modal */}
      {telaAtual === 'SCANNER' && (
        <ScannerBarras 
          aoLerCodigo={aoLerCodigo}
          aoCancelar={() => setTelaAtual('DASHBOARD')}
        />
      )}

      {/* Formulário de Produto Modal */}
      {telaAtual === 'CADASTRO' && codigoLido && (
        <FormularioProduto 
          codigoInicial={codigoLido}
          aoSalvar={salvarProdutoNoCatalogo}
          aoCancelar={() => {
            setTelaAtual('DASHBOARD');
            setCodigoLido(null);
          }}
          produtoExistente={catalogo[codigoLido] || null}
        />
      )}

    </div>
  );
}