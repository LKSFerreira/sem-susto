import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Produto, ItemCarrinho, ItemCarrinhoExpandido, TelaApp } from './types';
import { IMAGEM_PADRAO } from './constants';
import { formatarMoeda } from './services/utilitarios';
import { ScannerBarras } from './components/ScannerBarras';
import { LoadingCarrinho } from './components/LoadingCarrinho';
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

  // Catálogo: produtos completos (descricao, marca, imagem, preco...)
  const [catalogo, setCatalogo] = useState<Record<string, Produto>>({});

  // Carrinho: apenas referências (codigo_barras + quantidade)
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

  // Estado para feedback visual durante busca em cascata
  const [etapaBusca, setEtapaBusca] = useState<string | null>(null);

  // --- Efeitos (Carregamento inicial) ---

  /**
   * Carrega dados do repositório ao iniciar o app.
   * 
   * Limpa localStorage para garantir experiência de "primeiro acesso" 
   * durante fase de validação com usuários.
   */
  useEffect(() => {
    // 🧹 DEBUG: Limpa localStorage para simular novo usuário a cada acesso
    // TODO: Remover antes do deploy de produção!
    localStorage.clear();
    console.log('🧹 localStorage limpo - novo usuário simulado');

    const carregarDados = async () => {
      try {
        // Carrega catálogo (converte array para objeto indexado)
        const listaProdutos = await repositorioProdutos.listarTodos();
        const catalogoCarregado: Record<string, Produto> = {};
        listaProdutos.forEach(produto => {
          catalogoCarregado[produto.codigo_barras] = produto;
        });
        setCatalogo(catalogoCarregado);

        // Carrega carrinho (agora são apenas referências)
        const itensCarrinho = await repositorioCarrinho.obterItens();
        setCarrinho(itensCarrinho);

        setCarregado(true);
      } catch (erro) {
        console.error('Erro ao carregar dados:', erro);
        setCarregado(true);
      }
    };

    carregarDados();
  }, [repositorioProdutos, repositorioCarrinho]);

  // --- Funções de Join (Carrinho + Catálogo) ---

  /**
   * Expande o carrinho fazendo join com o catálogo.
   * Transforma referências em objetos completos para exibição na UI.
   */
  const carrinhoExpandido = useMemo((): ItemCarrinhoExpandido[] => {
    return carrinho
      .map(item => {
        const produto = catalogo[item.codigo_barras];
        if (!produto) return null; // Produto não encontrado no catálogo
        return {
          ...produto,
          quantidade: item.quantidade
        };
      })
      .filter((item): item is ItemCarrinhoExpandido => item !== null);
  }, [carrinho, catalogo]);

  /**
   * Calcula o total do carrinho usando os dados expandidos.
   */
  const calcularTotal = useMemo(() => {
    return carrinhoExpandido.reduce(
      (acc, item) => acc + ((item.preco_estimado || 0) * item.quantidade),
      0
    );
  }, [carrinhoExpandido]);

  // --- Lógica de Negócio ---

  /**
   * Adiciona um produto ao carrinho (apenas referência).
   * O produto já deve estar no catálogo.
   */
  const adicionarAoCarrinho = useCallback(async (codigo_barras: string) => {
    // Atualiza estado local primeiro (UI responsiva)
    setCarrinho(prev => {
      const index = prev.findIndex(item => item.codigo_barras === codigo_barras);
      if (index >= 0) {
        const novoCarrinho = [...prev];
        novoCarrinho[index].quantidade += 1;
        return novoCarrinho;
      }
      return [...prev, { codigo_barras, quantidade: 1 }];
    });

    // Persiste no repositório
    try {
      await repositorioCarrinho.adicionarItem(codigo_barras, 1);
    } catch (erro) {
      console.error('Erro ao adicionar item ao carrinho:', erro);
    }
  }, [repositorioCarrinho]);

  /**
   * Salva produto no catálogo (localStorage + banco de dados).
   * Chamado após encontrar nas APIs ou após edição pelo usuário.
   */
  const salvarProdutoNoCatalogo = useCallback(async (produto: Produto) => {
    // Atualiza catálogo local
    setCatalogo(prev => ({ ...prev, [produto.codigo_barras]: produto }));

    // Persiste no repositório
    try {
      await repositorioProdutos.salvar(produto);
      console.log(`💾 [CATÁLOGO] Produto salvo: ${produto.codigo_barras}`);
    } catch (erro) {
      console.error('Erro ao salvar produto:', erro);
    }
  }, [repositorioProdutos]);

  /**
   * Callback do formulário "Salvar Produto".
   * Atualiza o catálogo e adiciona/atualiza no carrinho.
   */
  const aoSalvarProduto = useCallback(async (produto: Produto) => {
    // 1. Salva no catálogo (sempre)
    await salvarProdutoNoCatalogo(produto);

    // 2. Decide: Adicionar (+1) ou apenas atualizar dados (Edição)
    if (!modoEdicao) {
      await adicionarAoCarrinho(produto.codigo_barras);
    }
    // Se for edição, o produto já está no carrinho, só atualizou o catálogo

    setTelaAtual('DASHBOARD');
    setCodigoLido(null);
    setModoEdicao(false);
  }, [salvarProdutoNoCatalogo, adicionarAoCarrinho, modoEdicao]);

  /**
   * Callback quando um código de barras é lido.
   * 
   * Ordem de Busca:
   * 1. Catálogo LocalStorage (Cache do usuário)
   * 2. TODO: Banco de Dados PostgreSQL
   * 3. OpenFoodFacts (Gratuita/Colaborativa)
   * 4. API Cosmos (Comercial - Fallback)
   * 5. Formulário Manual
   */
  const aoLerCodigo = useCallback(async (codigo_barras: string) => {
    setCodigoLido(codigo_barras);
    setModoEdicao(false);
    setDadosPrePreenchidos(null);

    console.log(`\n🔍 [BUSCA] Iniciando busca para GTIN: ${codigo_barras}`);

    // 1. Verifica cache local (catálogo localStorage)
    setEtapaBusca('💾 Verificando catálogo local...');
    if (catalogo[codigo_barras]) {
      console.log(`✅ [ORIGEM: CACHE LOCAL] Produto encontrado no catálogo local`);
      console.log(`   📦 Dados:`, catalogo[codigo_barras]);
      setEtapaBusca(null);
      await adicionarAoCarrinho(codigo_barras);
      setTelaAtual('DASHBOARD');
      setCodigoLido(null);
      return;
    }
    console.log(`❌ [CACHE LOCAL] Não encontrado`);

    // 2. TODO: Buscar no Banco de Dados PostgreSQL (endpoint ainda não existe)

    // 3. Consulta OpenFoodFacts (Prioridade API)
    setEtapaBusca('🌍 Buscando produtos...');
    console.log(`🌍 [BUSCANDO] OpenFoodFacts API...`);

    // Delay simulado para UX (opcional, pode ser removido depois)
    //await new Promise(r => setTimeout(r, 9999999999999));
    let produtoEncontrado = await buscarProdutoOFF(codigo_barras);

    if (produtoEncontrado) {
      console.log(`✅ [ORIGEM: OPENFOODFACTS] Produto encontrado!`);
      console.log(`   📦 Dados:`, produtoEncontrado);

      // Salva imediatamente no catálogo com preço 0
      produtoEncontrado.preco_estimado = 0;
      await salvarProdutoNoCatalogo(produtoEncontrado);
      console.log(`💾 [CACHE] Produto salvo no catálogo local (com preço R$ 0,00)`);
      setEtapaBusca(null);

    } else {
      console.log(`❌ [OPENFOODFACTS] Não encontrado`);

      // 4. Consulta API Cosmos (Fallback)
      setEtapaBusca('📦 Verificando catálogo...');
      console.log(`📦 [BUSCANDO] Cosmos API...`);

      // await new Promise(r => setTimeout(r, 9999999999999));
      produtoEncontrado = await buscarProdutoCosmos(codigo_barras);

      if (produtoEncontrado) {
        console.log(`✅ [ORIGEM: COSMOS] Produto encontrado!`);
        console.log(`   📦 Dados:`, produtoEncontrado);

        // Salva imediatamente no catálogo com preço 0
        produtoEncontrado.preco_estimado = 0;
        await salvarProdutoNoCatalogo(produtoEncontrado);
        console.log(`💾 [CACHE] Produto salvo no catálogo local (com preço R$ 0,00)`);
        setEtapaBusca(null);

      } else {
        console.log(`❌ [COSMOS] Não encontrado`);
        console.log(`📝 [ORIGEM: CADASTRO MANUAL] Usuário precisará preencher`);
        setEtapaBusca(null);
      }
    }

    if (produtoEncontrado) {
      setDadosPrePreenchidos(produtoEncontrado);
    }

    // 5. Abre formulário (preenchido ou vazio)
    setTelaAtual('CADASTRO');
  }, [catalogo, adicionarAoCarrinho, salvarProdutoNoCatalogo]);

  /**
   * Remove um item do carrinho.
   */
  const removerItem = useCallback(async (codigo_barras: string) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }

    setCarrinho(prev => prev.filter(item => item.codigo_barras !== codigo_barras));

    try {
      await repositorioCarrinho.removerItem(codigo_barras);
    } catch (erro) {
      console.error('Erro ao remover item:', erro);
    }
  }, [repositorioCarrinho]);

  /**
   * Altera a quantidade de um item no carrinho.
   */
  const alterarQuantidade = useCallback(async (codigo_barras: string, delta: number) => {
    let novaQuantidade = 0;

    setCarrinho(prev => {
      return prev.reduce((acc, item) => {
        if (item.codigo_barras === codigo_barras) {
          novaQuantidade = item.quantidade + delta;

          if (novaQuantidade > 0) {
            acc.push({ ...item, quantidade: novaQuantidade });
          } else {
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
  const aoEditarItem = useCallback((item: ItemCarrinhoExpandido) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }
    setCodigoLido(item.codigo_barras);
    setModoEdicao(true);
    setDadosPrePreenchidos(null);
    setTelaAtual('CADASTRO');
  }, []);

  /**
   * Executa a finalização da compra.
   */
  const executarFinalizacao = useCallback(async () => {
    setMostrarConfirmacaoFinalizar(false);

    try {
      // Cria objeto de compra com snapshot dos itens expandidos
      const novaCompra = {
        id: crypto.randomUUID(),
        data: new Date().toISOString(),
        itens: [...carrinhoExpandido], // Snapshot completo
        total: calcularTotal
      };

      await repositorioHistorico.salvar(novaCompra);
      await repositorioCarrinho.limpar();
      setCarrinho([]);
      setMostrarDoacao(true);
    } catch (erro) {
      console.error('Erro ao finalizar compra:', erro);
    }
  }, [carrinhoExpandido, calcularTotal, repositorioHistorico, repositorioCarrinho]);

  const solicitarFinalizacao = useCallback(() => {
    if (carrinho.length === 0) return;
    executarFinalizacao();
  }, [carrinho.length, executarFinalizacao]);

  const solicitarEsvaziamento = useCallback(() => {
    if (carrinho.length === 0) return;
    setMostrarConfirmacaoEsvaziar(true);
  }, [carrinho.length]);

  const executarEsvaziamento = useCallback(async () => {
    setMostrarConfirmacaoEsvaziar(false);

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }

    setCarrinho([]);

    try {
      await repositorioCarrinho.limpar();
      setMostrarDoacao(true);
    } catch (erro) {
      console.error('Erro ao limpar carrinho:', erro);
    }
  }, [repositorioCarrinho]);

  // --- Renderização ---

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
        {carrinhoExpandido.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <i className="fas fa-shopping-basket text-6xl mb-4 text-gray-200"></i>
            <p>Seu carrinho está vazio.</p>
            <p className="text-sm">Escaneie um produto para começar!</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {carrinhoExpandido.map((item) => (
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

      {/* 3. Rodapé Fixo */}
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
              onClick={() => {
                // --- MODO DEBUG: TESTE DE ANIMAÇÃO DE LOADING ---
                // Simula leitura de código direto para testar animação
                // 7891000100103 = Leite
                //aoLerCodigo('7891000100103');
                setTelaAtual('SCANNER'); // Original
              }}
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
      {/* Tela de Loading Reutilizável */}
      <LoadingCarrinho
        visivel={etapaBusca !== null}
        titulo={etapaBusca || "Carregando..."}
      />

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
          aoSalvar={aoSalvarProduto}
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