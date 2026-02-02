import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Produto, ItemCarrinho, TelaApp } from './types';
import { IMAGEM_PADRAO } from './constants';
import { formatarMoeda } from './services/utilitarios';
import { ScannerBarras } from './components/ScannerBarras';
import { FormularioProduto } from './components/FormularioProduto';
import { DebugConsole } from './components/DebugConsole';
import { ModalDoacao } from './components/ModalDoacao';
import { ModalConfirmacao } from './components/ModalConfirmacao';
import { ModalTutorial, useTutorialPrimeiroAcesso } from './components/ModalTutorial';
import { useRepositorios } from './contextos/ContextoRepositorios';
import { buscarProdutoCosmos } from './services/cosmos';
import { buscarProdutoOFF } from './services/openfoodfacts';

export default function App() {
  // --- Acesso aos repositórios via contexto ---
  const { produtos: repositorioProdutos, carrinho: repositorioCarrinho, historico: repositorioHistorico } = useRepositorios();

  // --- Tutorial de primeiro acesso ---
  const { mostrar: mostrarTutorial, fechar: fecharTutorial } = useTutorialPrimeiroAcesso();

  // --- Estados ---
  const [telaAtual, setTelaAtual] = useState<TelaApp>('DASHBOARD');

  // Catálogo agora é carregado do repositório
  const [catalogo, setCatalogo] = useState<Record<string, Produto>>({});
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);

  // Flag para indicar se os dados foram carregados
  const [carregado, setCarregado] = useState(false);

  // Estado para fluxo de cadastro/adição
  const [codigoLido, setCodigoLido] = useState<string | null>(null);
  const [dadosPrePreenchidos, setDadosPrePreenchidos] = useState<Partial<Produto> | null>(null);

  // Flag para diferenciar Novo Produto (soma +1) de Edição (atualiza dados)
  const [modoEdicao, setModoEdicao] = useState(false);

  const [mostrarDoacao, setMostrarDoacao] = useState(false);
  const [mostrarConfirmacaoEsvaziar, setMostrarConfirmacaoEsvaziar] = useState(false);
  const [mostrarConfirmacaoFinalizar, setMostrarConfirmacaoFinalizar] = useState(false);

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
    return carrinho.reduce((acc, item) => acc + ((item.preco_estimado || 0) * item.quantidade), 0);
  }, [carrinho]);



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
      uuid: Date.now().toString()
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
   * Atualiza os dados de um item no carrinho (preço, nome, foto)
   * SEM alterar a quantidade.
   */
  const atualizarProdutoNoCarrinho = useCallback(async (produto: Produto) => {
    // Atualiza estado local
    setCarrinho(prev => {
      const index = prev.findIndex(item => item.codigo_barras === produto.codigo_barras);
      if (index >= 0) {
        const novoCarrinho = [...prev];
        // Mantém a quantidade e uuid antigos, atualiza o resto
        novoCarrinho[index] = {
          ...novoCarrinho[index],
          ...produto
        };
        return novoCarrinho;
      }
      return prev;
    });

    // Como o repositório de carrinho salva a lista toda ou itens individuais,
    // e o metodo 'adicionarItem' soma quantidade, precisamos de lógica específica.
    // Simplificação MVP: Salva o carrinho todo novamente.
    // Em produção ideal: repositorioCarrinho.atualizarItem(produto)

    // Atualiza catálogo também
    setCatalogo(prev => ({ ...prev, [produto.codigo_barras]: produto }));
    await repositorioProdutos.salvar(produto);

    // Pequeno hack: para garantir persistência correta no carrinho,
    // vamos recarregar o estado atual e salvar tudo.
    // (Melhor seria ter um método 'atualizarItem' no repositório)
    const carrinhoAtual = await repositorioCarrinho.obterItens();
    const index = carrinhoAtual.findIndex(i => i.codigo_barras === produto.codigo_barras);
    if (index >= 0) {
      carrinhoAtual[index] = { ...carrinhoAtual[index], ...produto };
      await repositorioCarrinho.salvarTodos(carrinhoAtual);
    }
  }, [repositorioCarrinho, repositorioProdutos]);

  /**
   * Salva um novo produto no catálogo e adiciona ao carrinho.
   */
  const salvarProdutoNoCatalogo = useCallback(async (produto: Produto) => {
    // 1. Salva no Catálogo (sempre)
    setCatalogo(prev => ({ ...prev, [produto.codigo_barras]: produto }));

    try {
      await repositorioProdutos.salvar(produto);
    } catch (erro) {
      console.error('Erro ao salvar produto:', erro);
    }

    // 2. Decide: Adicionar (+1) ou Atualizar (Edição)
    if (modoEdicao) {
      await atualizarProdutoNoCarrinho(produto);
    } else {
      await adicionarAoCarrinho(produto);
    }

    setTelaAtual('DASHBOARD');
    setCodigoLido(null);
    setModoEdicao(false); // Reset
  }, [repositorioProdutos, adicionarAoCarrinho, atualizarProdutoNoCarrinho, modoEdicao]);

  /**
   * Callback quando um código de barras é lido.
   * 
   * Ordem de Busca:
   * 1. Catálogo Local (Offline/Cache)
   * 2. OpenFoodFacts (Gratuita/Colaborativa)
   * 3. API Cosmos (Comercial - Fallback)
   * 4. Formulário Manual
   */
  const aoLerCodigo = useCallback(async (codigo_barras: string) => {
    setCodigoLido(codigo_barras);
    setModoEdicao(false); // Scanner sempre é "Novo" ou "Incremento"
    setDadosPrePreenchidos(null);

    // 1. Verifica cache local
    if (catalogo[codigo_barras]) {
      adicionarAoCarrinho(catalogo[codigo_barras]);
      setTelaAtual('DASHBOARD');
      setCodigoLido(null);
      return;
    }

    // 2. Consulta OpenFoodFacts (Prioridade API)
    let produtoEncontrado = await buscarProdutoOFF(codigo_barras);

    // 3. Consulta API Cosmos (Fallback)
    if (!produtoEncontrado) {
      produtoEncontrado = await buscarProdutoCosmos(codigo_barras);
    }

    if (produtoEncontrado) {
      setDadosPrePreenchidos(produtoEncontrado);
    }

    // 4. Abre formulário (vazio ou preenchido)
    setTelaAtual('CADASTRO');
  }, [catalogo, adicionarAoCarrinho]);

  /**
   * Remove um item do carrinho.
   */
  const removerItem = useCallback(async (codigo_barras: string) => {
    // Feedback tátil
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Atualiza estado local
    setCarrinho(prev => prev.filter(item => item.codigo_barras !== codigo_barras));

    // Persiste no repositório
    try {
      await repositorioCarrinho.removerItem(codigo_barras);
    } catch (erro) {
      console.error('Erro ao remover item:', erro);
    }
  }, [repositorioCarrinho]);

  /**
   * Altera a quantidade de um item no carrinho.
   * 
   * Se a quantidade chegar a zero, remove o item.
   */
  const alterarQuantidade = useCallback(async (codigo_barras: string, delta: number) => {
    let novaQuantidade = 0;

    // Atualiza estado local
    setCarrinho(prev => {
      return prev.reduce((acc, item) => {
        if (item.codigo_barras === codigo_barras) {
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
        await repositorioCarrinho.atualizarQuantidade(codigo_barras, novaQuantidade);
      } else {
        await repositorioCarrinho.removerItem(codigo_barras);
      }
    } catch (erro) {
      console.error('Erro ao alterar quantidade:', erro);
    }
  }, [repositorioCarrinho]);

  /**
   * Abre a tela de edição para um item do carrinho.
   */
  const aoEditarItem = useCallback((produto: Produto) => {
    // Feedback tátil
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }
    setCodigoLido(produto.codigo_barras);
    setModoEdicao(true); // Ativa modo de edição
    setDadosPrePreenchidos(null); // Garante que usa os dados do catálogo
    setTelaAtual('CADASTRO');
  }, []);

  /**
   * Executa a finalização da compra após confirmação do usuário.
   */
  const executarFinalizacao = useCallback(async () => {
    setMostrarConfirmacaoFinalizar(false);

    try {
      // 1. Cria objeto de compra
      const novaCompra = {
        id: crypto.randomUUID(),
        data: new Date().toISOString(),
        items: [...carrinho],
        total: calcularTotal
      };

      // 2. Salva no histórico
      await repositorioHistorico.salvar(novaCompra);

      // 3. Limpa o carrinho
      await repositorioCarrinho.limpar();
      setCarrinho([]);

      // 4. Feedback e Redirecionamento
      setMostrarDoacao(true); // Sugere doação após "compra" 
    } catch (erro) {
      console.error('Erro ao finalizar compra:', erro);
    }
  }, [carrinho, calcularTotal, repositorioHistorico, repositorioCarrinho]);

  /**
   * Abre modal de confirmação para finalizar compra.
   */
  const solicitarFinalizacao = useCallback(() => {
    if (carrinho.length === 0) return;
    // MODAL DESABILITADO (Pedido UX): Finaliza direto
    // setMostrarConfirmacaoFinalizar(true);
    executarFinalizacao();
  }, [carrinho.length, executarFinalizacao]);


  /**
   * Abre modal de confirmação para esvaziar carrinho.
   */
  const solicitarEsvaziamento = useCallback(() => {
    if (carrinho.length === 0) return;
    setMostrarConfirmacaoEsvaziar(true);
  }, [carrinho.length]);

  /**
   * Executa a limpeza do carrinho após confirmação do usuário.
   */
  const executarEsvaziamento = useCallback(async () => {
    setMostrarConfirmacaoEsvaziar(false);

    // Feedback tátil
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Atualiza estado local
    setCarrinho([]);

    // Persiste no repositório
    try {
      await repositorioCarrinho.limpar();

      // Abre modal de doação
      setMostrarDoacao(true);
    } catch (erro) {
      console.error('Erro ao limpar carrinho:', erro);
    }
  }, [repositorioCarrinho]);

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
              <h1 className="font-bold text-gray-800 leading-tight">Sem Susto</h1>
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
                onClick={solicitarEsvaziamento}
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
              <li
                key={item.codigo_barras}
                onClick={() => aoEditarItem(item)}
                className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex gap-3 animate-fade-in relative group cursor-pointer hover:border-verde-300 transition-colors active:scale-[0.99] transform"
              >

                {/* Imagem */}
                <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                  <img
                    src={item.imagem || IMAGEM_PADRAO}
                    alt={item.descricao}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-800 truncate">
                      {item.descricao}
                    </h3>
                    <p className="text-xs text-gray-500 truncate">
                      {item.marca} • {item.tamanho}
                    </p>
                  </div>

                  {/* Controles de Preço e Quantidade */}
                  <div className="flex justify-between items-end mt-1">
                    <div className="flex items-center gap-1 bg-gray-50 rounded p-1 border border-gray-100">
                      {/* Botão Menos / Lixeira */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          alterarQuantidade(item.codigo_barras, -1);
                        }}
                        className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${item.quantidade === 1
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
                        onClick={(e) => {
                          e.stopPropagation();
                          alterarQuantidade(item.codigo_barras, 1);
                        }}
                        className="w-8 h-8 flex items-center justify-center text-verde-600 hover:bg-verde-50 rounded transition-colors"
                      >
                        <i className="fas fa-plus text-xs"></i>
                      </button>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-gray-400 font-mono">
                        {item.quantidade}x {formatarMoeda(item.preco_estimado || 0)}
                      </div>
                      <div className="font-bold text-gray-900 font-mono text-lg">
                        {formatarMoeda((item.preco_estimado || 0) * item.quantidade)}
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
                onClick={solicitarFinalizacao}
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
          gtinInicial={codigoLido}
          aoSalvar={salvarProdutoNoCatalogo}
          aoCancelar={() => {
            setTelaAtual('DASHBOARD');
            setCodigoLido(null);
            setDadosPrePreenchidos(null);
            setModoEdicao(false);
          }}
          produtoExistente={catalogo[codigoLido] || null}
          dadosPrePreenchidos={dadosPrePreenchidos}
        />
      )}

      {/* Modal de Confirmação - Esvaziar Carrinho */}
      {mostrarConfirmacaoEsvaziar && (
        <ModalConfirmacao
          titulo="Esvaziar Carrinho"
          mensagem="Tem certeza que deseja remover todos os itens do carrinho?"
          textoBotaoConfirmar="Esvaziar"
          textoBotaoCancelar="Cancelar"
          corBotaoConfirmar="vermelho"
          aoConfirmar={executarEsvaziamento}
          aoCancelar={() => setMostrarConfirmacaoEsvaziar(false)}
        />
      )}

      {/* Modal de Confirmação - Finalizar Compra */}
      {mostrarConfirmacaoFinalizar && (
        <ModalConfirmacao
          titulo="Finalizar Compra"
          mensagem={`Confirma a compra de ${carrinho.length} ${carrinho.length === 1 ? 'item' : 'itens'} no valor de ${formatarMoeda(calcularTotal)}?`}
          textoBotaoConfirmar="Finalizar"
          textoBotaoCancelar="Voltar"
          corBotaoConfirmar="verde"
          aoConfirmar={executarFinalizacao}
          aoCancelar={() => setMostrarConfirmacaoFinalizar(false)}
        />
      )}

      {/* Tutorial de Primeiro Acesso */}
      {mostrarTutorial && (
        <ModalTutorial aoFechar={fecharTutorial} />
      )}


    </div>
  );
}