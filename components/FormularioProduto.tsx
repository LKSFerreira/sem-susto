import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Produto } from '../types';
import { REGEX_UNIDADE } from '../constants';
import { comprimirImagem } from '../services/utilitarios';
import { extrairDadosDoRotulo } from '../services/ia';
import { ModalRecorte } from './ModalRecorte';
import { TutorialFoto, useTutorialFotoPrimeiroUso } from './TutorialFoto';

interface PropsFormulario {
  gtinInicial: string;
  aoSalvar: (produto: Produto) => void;
  aoCancelar: () => void;
  produtoExistente?: Produto | null;
  dadosPrePreenchidos?: Partial<Produto> | null;
}

export const FormularioProduto: React.FC<PropsFormulario> = ({
  gtinInicial,
  aoSalvar,
  aoCancelar,
  produtoExistente,
  dadosPrePreenchidos,
}) => {
  const [descricao, setDescricao] = useState('');
  const [marca, setMarca] = useState('');
  const [tamanho, setTamanho] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [imagem, setImagem] = useState<string | undefined>(undefined);

  const [erro, setErro] = useState<string | null>(null);
  const [campoComErro, setCampoComErro] = useState<string | null>(null);

  // Controle de Foco Único
  const [focoInicialFeito, setFocoInicialFeito] = useState(false);

  const refDescricao = useRef<HTMLInputElement>(null);
  const refMarca = useRef<HTMLInputElement>(null);
  const refTamanho = useRef<HTMLInputElement>(null);
  const refPrice = useRef<HTMLInputElement>(null);

  const [imagemParaRecorte, setImagemParaRecorte] = useState<string | null>(null);
  const [mostraRecorte, setMostraRecorte] = useState(false);
  const [analisandoIA, setAnalisandoIA] = useState(false);

  // Flag para controlar inicialização única
  const [inicializado, setInicializado] = useState(false);

  // Estado para exibir TutorialFoto contextual
  const [mostraTutorialFoto, setMostraTutorialFoto] = useState(false);
  const [inputPendente, setInputPendente] = useState<HTMLInputElement | null>(null);
  const tutorialFoto = useTutorialFotoPrimeiroUso();

  // Detecta campos que vieram vazios da API (para destaque visual)
  const camposFaltantes = useMemo(() => {
    // Só destaca como "faltante" se veio de uma API (dadosPrePreenchidos) mas sem o dado
    if (!dadosPrePreenchidos) return [];

    const faltantes: string[] = [];
    if (!dadosPrePreenchidos.imagem) faltantes.push('imagem');
    if (!dadosPrePreenchidos.marca) faltantes.push('marca');
    if (!dadosPrePreenchidos.tamanho) faltantes.push('tamanho');
    return faltantes;
  }, [dadosPrePreenchidos]);

  const temCamposFaltantes = camposFaltantes.length > 0;

  // Preenche dados iniciais
  useEffect(() => {
    if (produtoExistente) {
      // Edição de produto existente (prioridade máxima)
      if (!inicializado) {
        setDescricao(produtoExistente.descricao);
        setMarca(produtoExistente.marca);
        setTamanho(produtoExistente.tamanho);
        setPriceInput((produtoExistente.preco_estimado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
        setImagem(produtoExistente.imagem);
        setInicializado(true);
      }
    } else if (dadosPrePreenchidos) {
      // Preenchimento automático (API/IA)
      // Só preenche se o campo estiver vazio para não sobrescrever o que o usuário já digitou
      // OU se for a primeira inicialização

      if (!descricao && dadosPrePreenchidos.descricao) setDescricao(dadosPrePreenchidos.descricao);
      if (!marca && dadosPrePreenchidos.marca) setMarca(dadosPrePreenchidos.marca);
      if (!tamanho && dadosPrePreenchidos.tamanho) setTamanho(dadosPrePreenchidos.tamanho);

      if (!priceInput && dadosPrePreenchidos.preco_estimado && dadosPrePreenchidos.preco_estimado > 0) {
        setPriceInput(
          dadosPrePreenchidos.preco_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
        );
      }

      if (!imagem && dadosPrePreenchidos.imagem) setImagem(dadosPrePreenchidos.imagem);
    }
  }, [produtoExistente, dadosPrePreenchidos, inicializado]);

  // Lógica de Foco Inteligente (Executa apenas uma vez quando os dados estabilizam)
  useEffect(() => {
    if (focoInicialFeito || analisandoIA) return;

    // Se temos pelo menos algum dado ou é um formulário vazio pronto
    const timer = setTimeout(() => {
      let focou = false;

      // Prioridade: Campos vazios
      if (!descricao) {
        refDescricao.current?.focus();
        focou = true;
      } else if (!marca) {
        refMarca.current?.focus();
        focou = true;
      } else if (!tamanho) {
        refTamanho.current?.focus();
        focou = true;
      } else {
        // Se tudo preenchido, foca no preço para validação (Regra do Usuário)
        refPrice.current?.focus();
        setTimeout(() => refPrice.current?.select(), 50);
        focou = true;
      }

      if (focou) setFocoInicialFeito(true);
    }, 600); // Delay maior para garantir animação e preenchimento

    return () => clearTimeout(timer);
  }, [descricao, marca, tamanho, analisandoIA, focoInicialFeito]);
  // Removemos priceInput das dependências para não refocar ao digitar!

  /**
   * Intercepta o click no input de foto para mostrar dica contextual na primeira vez.
   */
  const interceptarClickFoto = (e: React.MouseEvent<HTMLInputElement>) => {
    if (tutorialFoto.deveExibir()) {
      e.preventDefault();
      setInputPendente(e.currentTarget);
      setMostraTutorialFoto(true);
    }
  };

  const lidarComSelecaoImagem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setErro(null);
      try {
        const imagemBase64 = await comprimirImagem(e.target.files[0], 0.6, 500);
        setImagemParaRecorte(imagemBase64);
        setMostraRecorte(true);
        e.target.value = '';
      } catch (err) {
        setErro('Erro ao carregar imagem.');
      }
    }
  };

  const aoConfirmarRecorte = async (fotoRecortadaBase64: string) => {
    setMostraRecorte(false);
    setImagem(fotoRecortadaBase64);
    setImagemParaRecorte(null);

    const precisaOcr = !descricao || !marca;

    if (!precisaOcr) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
      return;
    }

    setAnalisandoIA(true);
    setFocoInicialFeito(false); // Permite refocar após IA preencher
    try {
      const dadosExtraidos = await extrairDadosDoRotulo(fotoRecortadaBase64);
      if (dadosExtraidos) {
        if (dadosExtraidos.descricao) setDescricao(dadosExtraidos.descricao);
        if (dadosExtraidos.marca) setMarca(dadosExtraidos.marca);
        if (dadosExtraidos.tamanho) setTamanho(dadosExtraidos.tamanho);
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([50, 50, 50]);
      }
    } catch (err: any) {
      console.error('Erro no processamento IA:', err);
      setErro(`Não foi possível ler o rótulo automaticamente, mas a foto foi salva.`);
    } finally {
      setAnalisandoIA(false);
    }
  };

  const aoCancelarRecorte = () => {
    setMostraRecorte(false);
    setImagemParaRecorte(null);
  };

  const removerFoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setImagem(undefined);
  };

  const lidarMudancaPreco = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorDigitado = e.target.value;
    const apenasDigitos = valorDigitado.replace(/\D/g, '');

    if (!apenasDigitos) {
      setPriceInput('');
      return;
    }

    const valorNumerico = parseInt(apenasDigitos, 10) / 100;
    const valorFormatado = valorNumerico.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    setPriceInput(valorFormatado);
  };

  const validarESalvar = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setCampoComErro(null);

    if (!imagem) {
      setErro('A foto do produto é obrigatória.');
      return;
    }

    if (!descricao.trim()) {
      setErro('O nome do produto é obrigatório.');
      setCampoComErro('descricao');
      refDescricao.current?.focus();
      return;
    }

    if (!marca.trim()) {
      setErro('A marca do produto é obrigatória.');
      setCampoComErro('marca');
      refMarca.current?.focus();
      return;
    }

    if (!tamanho.trim()) {
      setErro('O tamanho do produto é obrigatório.');
      setCampoComErro('tamanho');
      refTamanho.current?.focus();
      return;
    }

    if (!REGEX_UNIDADE.test(tamanho)) {
      setErro('Tamanho inválido (Ex: 1L, 500g).');
      setCampoComErro('tamanho');
      refTamanho.current?.focus();
      return;
    }

    const precoLimpo = priceInput.replace(/\./g, '').replace(',', '.');
    const precoNumerico = parseFloat(precoLimpo);

    if (isNaN(precoNumerico) || precoNumerico <= 0) {
      setErro('O preço é obrigatório.');
      setCampoComErro('price');
      refPrice.current?.focus();
      return;
    }

    const novoProduto: Produto = {
      codigo_barras: gtinInicial,
      descricao,
      marca,
      tamanho,
      preco_estimado: precoNumerico,
      imagem,
    };

    aoSalvar(novoProduto);
  };

  const classeInput =
    'w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-bold placeholder-gray-400 focus:ring-2 focus:ring-verde-500 outline-none transition-colors';
  const classeLabel = 'block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1';
  const origemCosmos = !!dadosPrePreenchidos && !produtoExistente;

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col h-full overflow-hidden">
      <div className="bg-verde-600 text-white p-4 shadow-md flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={aoCancelar}
          className="p-2 -ml-2 hover:bg-verde-700 rounded-full transition-colors"
        >
          <i className="fas fa-arrow-left"></i>
        </button>
        <h2 className="font-bold text-lg leading-none">
          {produtoExistente ? 'Editar Produto' : 'Novo Produto'}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 flex flex-col [&::-webkit-scrollbar]:hidden">
        {mostraRecorte && imagemParaRecorte && (
          <ModalRecorte
            imagem={imagemParaRecorte}
            aoConfirmar={aoConfirmarRecorte}
            aoCancelar={aoCancelarRecorte}
          />
        )}
        {/* Dica contextual de foto - primeira vez que usa câmera */}
        {mostraTutorialFoto && (
          <TutorialFoto
            aoFechar={() => {
              setMostraTutorialFoto(false);
              // Dispara o click pendente após fechar o tutorial
              if (inputPendente) {
                inputPendente.click();
                setInputPendente(null);
              }
            }}
          />
        )}
        <style>{`
          @keyframes border-spin {
            100% { transform: rotate(360deg); }
          }
        `}</style>

        <form id="form-produto" onSubmit={validarESalvar} className="flex flex-col gap-3 h-full">
          {/* Banner de Campos Faltantes */}
          {temCamposFaltantes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <i className="fas fa-lightbulb text-amber-500 mt-0.5"></i>
              <div>
                <p className="text-amber-800 text-sm font-medium">Complete os dados para melhorar o catálogo</p>
                <p className="text-amber-600 text-xs mt-0.5">
                  Campos faltantes: {camposFaltantes.map(c => c === 'imagem' ? 'foto' : c).join(', ')}
                </p>
              </div>
            </div>
          )}

          {/* FOTO */}
          <div
            className={`transition-all duration-300 ${!imagem ? 'ring-2 ring-red-100 rounded-xl p-1 bg-red-50' : ''
              }`}
          >
            {!imagem ? (
              <div className="flex gap-3 items-stretch h-36">
                <div className="w-32 shrink-0 relative rounded-xl border-2 border-dashed border-gray-300 bg-white flex flex-col items-center justify-center text-gray-400 group cursor-pointer">
                  {analisandoIA ? (
                    <div className="flex flex-col items-center animate-pulse">
                      <i className="fas fa-spinner fa-spin text-2xl mb-1"></i>
                      <span className="text-[10px] font-bold uppercase">Lendo...</span>
                    </div>
                  ) : (
                    <>
                      <i className="fas fa-images text-3xl mb-2 opacity-50"></i>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                        Galeria
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onClick={interceptarClickFoto}
                    onChange={lidarComSelecaoImagem}
                    disabled={analisandoIA}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
                <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3 flex flex-col justify-between shadow-sm relative overflow-hidden">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="bg-blue-100 p-1 rounded-full text-blue-600">
                        <i className="fas fa-camera text-xs"></i>
                      </div>
                      <span className="font-bold text-blue-800 text-xs uppercase">
                        Foto Obrigatória
                      </span>
                    </div>
                    <p className="text-[11px] text-blue-700 leading-tight">
                      {origemCosmos
                        ? 'Confirmar visual do produto.'
                        : 'Tire foto para preenchimento IA.'}
                    </p>
                  </div>

                  {/* Botão com Borda Rainbow Animada Corrigida */}
                  <label
                    className={`w-full relative group cursor-pointer rounded-lg overflow-hidden p-[3px] transition-all active:scale-95 ${analisandoIA ? 'cursor-wait opacity-80' : 'shadow-lg'
                      }`}
                  >
                    {/* Gradient Layer */}
                    {!analisandoIA && (
                      <div
                        className="absolute inset-[-500%] bg-[conic-gradient(from_0deg,#ff0000,#ff8800,#ffff00,#00ff00,#0000ff,#8800ff,#ff0000)]"
                        style={{ animation: 'border-spin 3s linear infinite' }}
                      ></div>
                    )}

                    {/* Content Layer */}
                    <div className="relative w-full h-full rounded-[5px] flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-700 to-indigo-700 text-white z-10">
                      {analisandoIA ? (
                        <i className="fas fa-spinner fa-spin"></i>
                      ) : (
                        <i className="fas fa-camera text-sm"></i>
                      )}
                      <span className="font-bold text-xs uppercase tracking-wide">
                        {analisandoIA ? 'Processando...' : 'AUTO PREENCHER'}
                      </span>
                    </div>

                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onClick={interceptarClickFoto}
                      onChange={lidarComSelecaoImagem}
                      disabled={analisandoIA}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center shrink-0 animate-fade-in">
                <div className="relative group">
                  <div
                    className={`w-32 h-32 rounded-xl overflow-hidden border-2 border-dashed flex items-center justify-center relative transition-colors ${imagem ? 'border-verde-500 bg-white shadow-sm' : 'border-gray-300'
                      }`}
                  >
                    <img
                      src={imagem}
                      alt="Preview"
                      className="w-full h-full object-contain p-1"
                    />
                    <button
                      type="button"
                      onClick={removerFoto}
                      className="absolute top-1 right-1 bg-red-500 text-white w-7 h-7 rounded-full shadow-lg flex items-center justify-center hover:bg-red-600 z-20"
                    >
                      <i className="fas fa-trash-alt text-xs"></i>
                    </button>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={lidarComSelecaoImagem}
                      disabled={analisandoIA}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-100 py-2 px-3 rounded-lg text-center border border-gray-200 flex items-center justify-center gap-2 shrink-0">
            <i className="fas fa-barcode text-gray-400"></i>
            <span className="font-mono font-bold text-gray-600 text-sm tracking-wider">
              {gtinInicial}
            </span>
          </div>

          <div className="flex flex-col gap-3 flex-1">
            <div>
              <label className={classeLabel}>Produto</label>
              <input
                ref={refDescricao}
                value={descricao}
                onChange={e => {
                  setDescricao(e.target.value);
                  if (campoComErro === 'descricao') setCampoComErro(null);
                }}
                className={`${classeInput} ${analisandoIA ? 'animate-pulse bg-gray-600' : ''} ${campoComErro === 'descricao' ? 'border-red-500 ring-2 ring-red-400' : ''
                  }`}
                placeholder="Ex: Leite Integral"
                disabled={analisandoIA}
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-[3]">
                <label className={classeLabel}>
                  Marca
                  {camposFaltantes.includes('marca') && (
                    <span className="text-amber-500 ml-1" title="Campo faltante">⚠️</span>
                  )}
                </label>
                <input
                  ref={refMarca}
                  value={marca}
                  onChange={e => {
                    setMarca(e.target.value);
                    if (campoComErro === 'marca') setCampoComErro(null);
                  }}
                  className={`${classeInput} ${analisandoIA ? 'animate-pulse bg-gray-600' : ''} ${campoComErro === 'marca' ? 'border-red-500 ring-2 ring-red-400' : ''
                    } ${camposFaltantes.includes('marca') && !marca ? 'border-amber-400 ring-1 ring-amber-300' : ''}`}
                  placeholder="Ex: Longa Vida"
                  disabled={analisandoIA}
                />
              </div>
              <div className="flex-[2]">
                <label className={classeLabel}>
                  Tamanho
                  {camposFaltantes.includes('tamanho') && (
                    <span className="text-amber-500 ml-1" title="Campo faltante">⚠️</span>
                  )}
                </label>
                <input
                  ref={refTamanho}
                  value={tamanho}
                  onChange={e => {
                    setTamanho(e.target.value);
                    if (campoComErro === 'tamanho') setCampoComErro(null);
                  }}
                  className={`${classeInput} ${tamanho && !REGEX_UNIDADE.test(tamanho) ? 'border-red-400 text-red-100' : ''
                    } ${analisandoIA ? 'animate-pulse bg-gray-600' : ''} ${campoComErro === 'tamanho' ? 'border-red-500 ring-2 ring-red-400' : ''
                    } ${camposFaltantes.includes('tamanho') && !tamanho ? 'border-amber-400 ring-1 ring-amber-300' : ''}`}
                  placeholder="Ex: 1L"
                  disabled={analisandoIA}
                />
              </div>
            </div>
            <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
              <label className="block text-xs font-bold text-verde-700 uppercase tracking-wide mb-1">
                Preço Unitário (R$) <span className="text-red-500">*</span>
              </label>
              <input
                ref={refPrice}
                type="tel"
                inputMode="decimal"
                value={priceInput}
                onFocus={e => e.target.select()}
                onChange={e => {
                  lidarMudancaPreco(e);
                  if (campoComErro === 'price') setCampoComErro(null);
                }}
                className={`w-full p-2 bg-white border-2 rounded-lg text-gray-900 font-bold text-2xl placeholder-gray-300 focus:outline-none shadow-sm ${campoComErro === 'price'
                  ? 'border-red-500 ring-2 ring-red-400'
                  : 'border-verde-500'
                  }`}
                placeholder="0,00"
              />
              <p className="text-[10px] text-gray-500 mt-1 text-right">
                Toque para selecionar tudo
              </p>
            </div>
          </div>

          {erro && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100 font-bold flex items-center animate-fade-in">
              <i className="fas fa-exclamation-triangle mr-2"></i> {erro}
            </div>
          )}

          <div className="pt-4 pb-8 mt-auto">
            <button
              type="submit"
              onClick={validarESalvar}
              disabled={analisandoIA}
              className={`w-full text-white py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${analisandoIA
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-verde-600 hover:bg-verde-700 active:scale-95'
                }`}
            >
              {analisandoIA ? 'Processando...' : 'Salvar Produto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
