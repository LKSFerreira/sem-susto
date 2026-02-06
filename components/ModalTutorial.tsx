import React, { useState, useEffect } from 'react';

// VERSÃO DO TUTORIAL: Incrementar quando houver mudanças significativas
// Isso força usuários que viram versões antigas a verem a nova versão
const CHAVE_TUTORIAL_VISTO = 'sem_susto_tutorial_v3';

interface PropsModalTutorial {
  aoFechar: () => void;
}

/**
 * Tutorial visual de primeiro acesso.
 *
 * Foco em elementos visuais com mínimo texto.
 * Usuários ignoram texto - absorvem imagens e ícones.
 */
export const ModalTutorial: React.FC<PropsModalTutorial> = ({ aoFechar }) => {
  const [slideAtual, setSlideAtual] = useState(0);
  const totalSlides = 2; // Intro + Scanner (Foto movida para TutorialFoto contextual)

  const avancar = () => {
    if (slideAtual < totalSlides - 1) {
      setSlideAtual(prev => prev + 1);
    } else {
      finalizarTutorial();
    }
  };

  const voltar = () => {
    if (slideAtual > 0) {
      setSlideAtual(prev => prev - 1);
    }
  };

  const finalizarTutorial = () => {
    localStorage.setItem(CHAVE_TUTORIAL_VISTO, 'true');
    aoFechar();
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col">
      {/* Camada de desfoque sobre o app */}
      <div className="absolute inset-0 bg-gradient-to-b from-verde-600/95 to-verde-800/95 backdrop-blur-sm"></div>

      {/* Conteúdo do tutorial */}
      <div className="relative flex-1 flex flex-col z-10">
        {/* Botão Pular - sempre visível */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={finalizarTutorial}
            className="text-white font-bold px-4 py-2 rounded-full bg-red-500 hover:bg-red-600 transition-colors text-sm shadow-lg"
          >
            Pular
          </button>
        </div>

        {/* Área do Slide */}
        <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
          {/* Slide 0: Introdução - O que é o app */}
          {slideAtual === 0 && (
            <div className="flex flex-col items-center text-center animate-fade-in max-w-sm">
              {/* Título e subtítulo */}
              <h1 className="text-white text-2xl font-bold mb-2">Boas Vindas</h1>
              <p className="text-white/70 text-base mb-6">Sem susto na hora do caixa</p>

              {/* Fluxo visual: Escanear → Total → Sem susto */}
              <div className="flex flex-col items-center gap-6 mb-8">
                {/* Passo 1: Escanear produto */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                    <i className="fas fa-barcode text-white text-3xl"></i>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-white text-lg font-semibold">Escaneou?</span>
                  </div>
                </div>

                {/* Seta para baixo */}
                <i className="fas fa-arrow-down text-white/40 text-xl"></i>

                {/* Passo 2: Ver total em tempo real */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                    <i className="fas fa-calculator text-white text-3xl"></i>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-white text-lg font-semibold">Somou!</span>
                  </div>
                </div>

                {/* Seta para baixo */}
                <i className="fas fa-arrow-down text-white/40 text-xl"></i>

                {/* Passo 3: Resultado - sem susto no caixa */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center border-2 border-white/40">
                    <i className="fas fa-smile-beam text-blue-500 text-3xl"></i>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-white text-lg font-bold">Sem Susto!</span>
                  </div>
                </div>
              </div>

              {/* Ilustração de comparação visual: confuso vs tranquilo */}
              <div className="flex items-center gap-6 bg-white/10 px-6 py-4 rounded-2xl">
                {/* Antes: surpresa no caixa */}
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-red-500/30 rounded-full flex items-center justify-center mb-1">
                    <i className="fas fa-surprise text-red-400 text-2xl"></i>
                  </div>
                  <span className="text-red-400 text-xs font-bold">Antes</span>
                </div>

                {/* Seta */}
                <i className="fas fa-arrow-right text-white/40 text-lg"></i>

                {/* Depois: tranquilo */}
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-blue-500/30 rounded-full flex items-center justify-center mb-1">
                    <i className="fas fa-smile text-blue-500 text-2xl"></i>
                  </div>
                  <span className="text-blue-400 text-xs font-bold">Depois</span>
                </div>
              </div>
            </div>
          )}

          {/* Slide 1: Scanner de Código de Barras */}
          {slideAtual === 1 && (
            <div className="flex flex-col items-center text-center animate-fade-in max-w-sm">
              {/* Ilustração visual do scanner - formato retangular horizontal */}
              <div className="relative w-72 h-40 mb-6">
                {/* Moldura do visor */}
                <div className="absolute inset-0 border-4 border-white/30 rounded-2xl">
                  {/* Cantos destacados */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                </div>

                {/* Linha de scan animada */}
                <div className="absolute left-4 right-4 top-1/2 h-1 bg-red-400 rounded-full animate-pulse shadow-lg shadow-red-500/50"></div>

                {/* Código de barras estilizado - altura uniforme, larguras variadas */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-[2px]">
                  {[2, 1, 3, 1, 2, 1, 1, 3, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 3, 1, 2].map(
                    (w, i) => (
                      <div
                        key={i}
                        className="bg-white h-16 rounded-sm"
                        style={{ width: `${w * 2}px` }}
                      ></div>
                    )
                  )}
                </div>

                {/* Setas indicando centralização */}
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 text-white text-2xl animate-bounce-right">
                  <i className="fas fa-chevron-right"></i>
                </div>
                <div className="absolute -right-2 top-1/2 -translate-y-1/2 text-white text-2xl animate-bounce-left">
                  <i className="fas fa-chevron-left"></i>
                </div>
              </div>

              {/* Ícone de check animado */}
              <div className="flex items-center gap-3 bg-white/20 px-6 py-3 rounded-full mb-4">
                <i className="fas fa-barcode text-white text-2xl"></i>
                <i className="fas fa-arrow-right text-white/50"></i>
                <i className="fas fa-bullseye text-white text-2xl"></i>
              </div>

              {/* Texto mínimo */}
              <p className="text-white/80 text-lg font-medium">Centralize o código</p>
            </div>
          )}
        </div>

        {/* Navegação inferior - mais próxima do centro */}
        <div className="p-6 pb-8">
          {/* Indicadores de progresso */}
          <div className="flex justify-center gap-2 mb-4">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${i === slideAtual ? 'w-8 bg-white' : 'w-2 bg-white/30'
                  }`}
              ></div>
            ))}
          </div>

          {/* Botões de navegação */}
          <div className="flex gap-3">
            {slideAtual > 0 && (
              <button
                onClick={voltar}
                className="w-14 h-14 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
              >
                <i className="fas fa-arrow-left text-white text-xl"></i>
              </button>
            )}

            <button
              onClick={avancar}
              className="flex-1 h-14 bg-verde-500 text-white font-bold rounded-full flex items-center justify-center gap-2 shadow-lg hover:bg-verde-600 active:scale-95 transition-all"
            >
              {slideAtual === totalSlides - 1 ? (
                <>
                  <i className="fas fa-check"></i>
                  <span>Começar</span>
                </>
              ) : (
                <>
                  <span>Próximo</span>
                  <i className="fas fa-arrow-right"></i>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Estilos para animações customizadas */}
        <style>{`
        @keyframes bounce-right {
          0%, 100% { transform: translateY(-50%) translateX(0); }
          50% { transform: translateY(-50%) translateX(4px); }
        }
        @keyframes bounce-left {
          0%, 100% { transform: translateY(-50%) translateX(0); }
          50% { transform: translateY(-50%) translateX(-4px); }
        }
        .animate-bounce-right { animation: bounce-right 1s infinite; }
        .animate-bounce-left { animation: bounce-left 1s infinite; }
      `}</style>
      </div>
    </div>
  );
};

/**
 * Hook para verificar se deve mostrar o tutorial.
 */
export const useTutorialPrimeiroAcesso = () => {
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    const jaVisto = localStorage.getItem(CHAVE_TUTORIAL_VISTO);
    if (!jaVisto) {
      setMostrar(true);
    }
  }, []);

  const fechar = () => setMostrar(false);

  return { mostrar, fechar };
};
