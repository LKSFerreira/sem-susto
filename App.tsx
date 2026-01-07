import React, { useState, useEffect, useMemo } from 'react';
import { Produto, ItemCarrinho, TelaApp } from './types';
import { CHAVE_STORAGE_CARRINHO, CHAVE_STORAGE_CATALOGO, IMAGEM_PADRAO } from './constants';
import { formatarMoeda } from './services/utilitarios';
import { ScannerBarras } from './components/ScannerBarras';
import { FormularioProduto } from './components/FormularioProduto';
import { ModalDoacao } from './components/ModalDoacao';

export default function App() {
  // --- Estados ---
  const [telaAtual, setTelaAtual] = useState<TelaApp>('DASHBOARD');
  const [catalogo, setCatalogo] = useState<Record<string, Produto>>({});
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  
  // Estado para fluxo de cadastro/adição
  const [codigoLido, setCodigoLido] = useState<string | null>(null);
  
  // Configuração UI
  const [mostrarFotos, setMostrarFotos] = useState(true);
  const [mostrarDoacao, setMostrarDoacao] = useState(false);

  // --- Efeitos (Persistência) ---
  
  // Carregar dados ao iniciar
  useEffect(() => {
    const catalogoSalvo = localStorage.getItem(CHAVE_STORAGE_CATALOGO);
    const carrinhoSalvo = localStorage.getItem(CHAVE_STORAGE_CARRINHO);

    if (catalogoSalvo) {
      try {
        setCatalogo(JSON.parse(catalogoSalvo));
      } catch (e) { console.error("Erro ao carregar catálogo", e); }
    }

    if (carrinhoSalvo) {
      try {
        setCarrinho(JSON.parse(carrinhoSalvo));
      } catch (e) { console.error("Erro ao carregar carrinho", e); }
    }
  }, []);

  // Salvar catálogo sempre que mudar
  useEffect(() => {
    if (Object.keys(catalogo).length > 0) {
      localStorage.setItem(CHAVE_STORAGE_CATALOGO, JSON.stringify(catalogo));
    }
  }, [catalogo]);

  // Salvar carrinho sempre que mudar
  useEffect(() => {
    localStorage.setItem(CHAVE_STORAGE_CARRINHO, JSON.stringify(carrinho));
  }, [carrinho]);

  // --- Lógica de Negócio ---

  const calcularTotal = useMemo(() => {
    return carrinho.reduce((acc, item) => acc + (item.preco_unitario * item.quantidade), 0);
  }, [carrinho]);

  const aoLerCodigo = (codigo: string) => {
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
  };

  const adicionarAoCarrinho = (produto: Produto) => {
    const novoItem: ItemCarrinho = {
      ...produto,
      quantidade: 1,
      id_unico: Date.now().toString() // Identificador simples
    };
    
    // Verifica se já existe o mesmo item no carrinho para agrupar
    setCarrinho(prev => {
      const index = prev.findIndex(item => item.codigo_barras === produto.codigo_barras);
      if (index >= 0) {
        const novoCarrinho = [...prev];
        novoCarrinho[index].quantidade += 1;
        return novoCarrinho;
      }
      return [...prev, novoItem];
    });
  };

  const salvarProdutoNoCatalogo = (produto: Produto) => {
    setCatalogo(prev => ({ ...prev, [produto.codigo_barras]: produto }));
    adicionarAoCarrinho(produto);
    setTelaAtual('DASHBOARD');
    setCodigoLido(null);
  };

  const removerItem = (codigoBarras: string) => {
    // Feedback tátil simples se disponível
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }
    setCarrinho(prev => prev.filter(item => item.codigo_barras !== codigoBarras));
  };

  const alterarQuantidade = (codigoBarras: string, delta: number) => {
    setCarrinho(prev => {
      return prev.reduce((acc, item) => {
        if (item.codigo_barras === codigoBarras) {
          const novaQtd = item.quantidade + delta;
          
          if (novaQtd > 0) {
            // Atualiza quantidade
            acc.push({ ...item, quantidade: novaQtd });
          } else {
            // Se chegou a zero, remove (não adiciona ao array) e vibra
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
  };

  // --- Renderização de Componentes ---

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

            {/* Toggle Fotos */}
            <button 
              onClick={() => setMostrarFotos(!mostrarFotos)}
              className={`p-2 rounded-lg text-sm font-medium transition-colors ${mostrarFotos ? 'bg-verde-50 text-verde-700' : 'bg-gray-100 text-gray-600'}`}
              title={mostrarFotos ? 'Ocultar fotos' : 'Mostrar fotos'}
            >
              <i className={`fas ${mostrarFotos ? 'fa-image' : 'fa-list'} mr-1`}></i>
              <span className="text-xs">{mostrarFotos ? 'Com Fotos' : 'Compacto'}</span>
            </button>
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
                
                {/* Imagem (Condicional) */}
                {mostrarFotos && (
                  <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                    <img 
                      src={item.foto_base64 || IMAGEM_PADRAO} 
                      alt={item.nome} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

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

          <button 
            onClick={() => setTelaAtual('SCANNER')}
            className="w-full bg-verde-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-verde-700 active:transform active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <i className="fas fa-barcode text-xl"></i>
            <span>Ler Código de Barras</span>
          </button>
        </div>
      </footer>

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