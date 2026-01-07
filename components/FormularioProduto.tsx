import React, { useState, useEffect } from 'react';
import { Produto } from '../types';
import { REGEX_UNIDADE } from '../constants';
import { comprimirImagem } from '../services/utilitarios';
import { extrairDadosDoRotulo } from '../services/ia';

interface PropsFormulario {
  codigoInicial: string;
  aoSalvar: (produto: Produto) => void;
  aoCancelar: () => void;
  produtoExistente?: Produto | null;
}

export const FormularioProduto: React.FC<PropsFormulario> = ({ 
  codigoInicial, 
  aoSalvar, 
  aoCancelar,
  produtoExistente 
}) => {
  // Estados do formulário
  const [nome, setNome] = useState('');
  const [marca, setMarca] = useState('');
  const [tamanho, setTamanho] = useState('');
  const [preco, setPreco] = useState('');
  const [foto, setFoto] = useState<string | undefined>(undefined);
  const [erro, setErro] = useState<string | null>(null);
  
  // Estados de processamento
  const [analisandoIA, setAnalisandoIA] = useState(false);

  // Preencher formulário se for edição
  useEffect(() => {
    if (produtoExistente) {
      setNome(produtoExistente.nome);
      setMarca(produtoExistente.marca);
      setTamanho(produtoExistente.tamanho_massa);
      setPreco(produtoExistente.preco_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
      setFoto(produtoExistente.foto_base64);
    }
  }, [produtoExistente]);

  // Handler unificado para seleção de imagem (Câmera ou Galeria)
  const lidarComSelecaoImagem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setErro(null);
      setAnalisandoIA(true);
      
      try {
        // 1. Comprime a imagem
        const imagemBase64 = await comprimirImagem(e.target.files[0]);
        
        // 2. Define como foto do produto imediatamente
        setFoto(imagemBase64);

        // 3. Tenta extrair dados com IA (Nome, Marca, Tamanho)
        const dadosExtraidos = await extrairDadosDoRotulo(imagemBase64);
        
        if (dadosExtraidos) {
          if (dadosExtraidos.nome) setNome(dadosExtraidos.nome);
          if (dadosExtraidos.marca) setMarca(dadosExtraidos.marca);
          if (dadosExtraidos.tamanho) setTamanho(dadosExtraidos.tamanho);
          
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([50, 50, 50]);
        }
      } catch (err) {
        console.error("Erro no processamento de imagem/IA:", err);
        setErro("Não conseguimos ler os dados do rótulo automaticamente. Por favor, preencha os dados manualmente.");
      } finally {
        setAnalisandoIA(false);
      }
    }
  };

  const removerFoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setFoto(undefined);
  };

  const lidarMudancaPreco = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorDigitado = e.target.value;
    const apenasDigitos = valorDigitado.replace(/\D/g, "");

    if (!apenasDigitos) {
      setPreco("");
      return;
    }

    const valorNumerico = parseInt(apenasDigitos, 10) / 100;
    const valorFormatado = valorNumerico.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    setPreco(valorFormatado);
  };

  const validarESalvar = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (tamanho && !REGEX_UNIDADE.test(tamanho)) {
      setErro('Tamanho inválido (Ex: 1L, 500g).');
      return;
    }

    const precoLimpo = preco.replace(/\./g, '').replace(',', '.');
    const precoNumerico = parseFloat(precoLimpo);

    if (isNaN(precoNumerico) || precoNumerico <= 0) {
      setErro('O preço é obrigatório.');
      return;
    }

    if (!nome.trim()) {
      setErro('O nome do produto é obrigatório.');
      return;
    }

    const novoProduto: Produto = {
      codigo_barras: codigoInicial,
      nome,
      marca: marca || 'Genérica',
      tamanho_massa: tamanho || '-',
      preco_unitario: precoNumerico,
      foto_base64: foto
    };

    aoSalvar(novoProduto);
  };

  const classeInput = "w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-bold placeholder-gray-400 focus:ring-2 focus:ring-verde-500 outline-none transition-colors";
  const classeLabel = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1";

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col h-full overflow-hidden">
      <div className="bg-verde-600 text-white p-4 shadow-md flex items-center gap-3 shrink-0">
        <button onClick={aoCancelar} className="p-2 -ml-2 hover:bg-verde-700 rounded-full transition-colors">
          <i className="fas fa-arrow-left"></i>
        </button>
        <h2 className="font-bold text-lg leading-none">
          {produtoExistente ? 'Editar Produto' : 'Novo Produto'}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 flex flex-col [&::-webkit-scrollbar]:hidden">
        <form id="form-produto" onSubmit={validarESalvar} className="flex flex-col gap-3 h-full">
          {!foto && !produtoExistente ? (
            <div className="flex gap-3 items-stretch h-36">
              <div className="w-32 shrink-0 relative rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center text-gray-400 group hover:bg-gray-100 transition-colors cursor-pointer">
                {analisandoIA ? (
                   <div className="flex flex-col items-center animate-pulse">
                     <i className="fas fa-spinner fa-spin text-2xl mb-1"></i>
                     <span className="text-[10px] font-bold uppercase">Lendo...</span>
                   </div>
                ) : (
                  <>
                    <i className="fas fa-images text-3xl mb-2 opacity-50 group-hover:opacity-70 transition-opacity"></i>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Galeria</span>
                  </>
                )}
                <input type="file" accept="image/*" onChange={lidarComSelecaoImagem} disabled={analisandoIA} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              </div>

              <div className="flex-1 bg-blue-50 border border-blue-100 rounded-xl p-3 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="bg-blue-100 p-1 rounded-full text-blue-600"><i className="fas fa-magic text-xs"></i></div>
                    <span className="font-bold text-blue-800 text-xs uppercase">IA Integrada</span>
                  </div>
                  <p className="text-[11px] text-blue-700 leading-tight">Tire foto frontal do rótulo. Nós preenchemos os dados para você.</p>
                </div>
                <label className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-xs cursor-pointer transition-all select-none ${analisandoIA ? 'bg-blue-200 text-blue-800 cursor-wait' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm active:scale-95'}`}>
                   {analisandoIA ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-camera"></i>}
                   <span>{analisandoIA ? 'Processando' : 'Usar Câmera'}</span>
                   <input type="file" accept="image/*" capture="environment" onChange={lidarComSelecaoImagem} disabled={analisandoIA} className="hidden" />
                </label>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center shrink-0 animate-fade-in">
              <div className="relative group">
                <div className={`w-32 h-32 rounded-xl overflow-hidden border-2 border-dashed flex items-center justify-center relative transition-colors ${foto ? 'border-verde-500 bg-white shadow-sm' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}>
                  {foto ? (
                    <>
                      <img src={foto} alt="Preview" className="w-full h-full object-contain p-1" />
                      <button onClick={removerFoto} className="absolute top-1 right-1 bg-red-500 text-white w-7 h-7 rounded-full shadow-lg flex items-center justify-center hover:bg-red-600 active:scale-95 transition-transform z-20" title="Remover foto">
                        <i className="fas fa-trash-alt text-xs"></i>
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-gray-400">
                      <i className="fas fa-camera text-3xl mb-1 opacity-40"></i>
                      <span className="text-[10px] font-semibold text-center leading-tight">Adicionar<br/>Foto</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={lidarComSelecaoImagem} disabled={analisandoIA} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-100 py-2 px-3 rounded-lg text-center border border-gray-200 flex items-center justify-center gap-2 shrink-0">
             <i className="fas fa-barcode text-gray-400"></i> 
             <span className="font-mono font-bold text-gray-600 text-sm tracking-wider">{codigoInicial}</span>
          </div>

          <div className="flex flex-col gap-3 flex-1">
            <div>
              <label className={classeLabel}>Nome do Produto</label>
              <input value={nome} onChange={e => setNome(e.target.value)} className={`${classeInput} ${analisandoIA ? 'animate-pulse bg-gray-600' : ''}`} placeholder="Ex: Leite Integral" disabled={analisandoIA} />
            </div>
            <div className="flex gap-3">
              <div className="flex-[3]">
                <label className={classeLabel}>Marca</label>
                <input value={marca} onChange={e => setMarca(e.target.value)} className={`${classeInput} ${analisandoIA ? 'animate-pulse bg-gray-600' : ''}`} placeholder="Ex: Longa Vida" disabled={analisandoIA} />
              </div>
              <div className="flex-[2]">
                <label className={classeLabel}>Tamanho</label>
                <input value={tamanho} onChange={e => setTamanho(e.target.value)} className={`${classeInput} ${tamanho && !REGEX_UNIDADE.test(tamanho) ? 'border-red-400 text-red-100' : ''} ${analisandoIA ? 'animate-pulse bg-gray-600' : ''}`} placeholder="Ex: 1L" disabled={analisandoIA} />
              </div>
            </div>
            <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
               <label className="block text-xs font-bold text-verde-700 uppercase tracking-wide mb-1">Preço Unitário (R$) <span className="text-red-500">*</span></label>
               <input type="tel" inputMode="numeric" value={preco} onChange={lidarMudancaPreco} className="w-full p-2 bg-white border-2 border-verde-500 rounded-lg text-gray-900 font-bold text-2xl placeholder-gray-300 focus:outline-none shadow-sm" placeholder="0,00" autoFocus={!analisandoIA && !produtoExistente} />
              <p className="text-[10px] text-gray-500 mt-1 text-right">Digite manualmente</p>
            </div>
          </div>
          {erro && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100 font-bold flex items-center animate-fade-in">
              <i className="fas fa-exclamation-triangle mr-2"></i> {erro}
            </div>
          )}
          <div className="h-2 shrink-0"></div>
        </form>
      </div>

      <div className="p-4 bg-white border-t border-gray-100 shrink-0">
        <button onClick={validarESalvar} disabled={analisandoIA} className={`w-full text-white py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${analisandoIA ? 'bg-gray-400 cursor-not-allowed' : 'bg-verde-600 hover:bg-verde-700 active:scale-95'}`}>
          {analisandoIA ? 'Processando...' : 'Salvar Produto'}
        </button>
      </div>
    </div>
  );
};