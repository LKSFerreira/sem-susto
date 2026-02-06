import React from 'react';

// Chave para controlar exibição única do tutorial de foto
const CHAVE_TUTORIAL_FOTO_VISTO = 'sem_susto_tutorial_foto_v1';

interface PropsTutorialFoto {
    aoFechar: () => void;
}

/**
 * Modal contextual que aparece na primeira vez que o usuário
 * usa a câmera/galeria no formulário de produto.
 * 
 * Mostra comparação visual: foto ruim vs foto boa.
 * Design igual ao slide 3 do tutorial antigo.
 */
export const TutorialFoto: React.FC<PropsTutorialFoto> = ({ aoFechar }) => {
    const fecharESalvar = () => {
        localStorage.setItem(CHAVE_TUTORIAL_FOTO_VISTO, 'true');
        aoFechar();
    };

    return (
        <div className="fixed inset-0 z-[110] bg-gradient-to-b from-verde-600/95 to-verde-800/95 backdrop-blur-sm flex flex-col items-center justify-center p-6">

            {/* Botão Pular (canto superior direito) */}
            <button
                onClick={fecharESalvar}
                className="absolute top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-red-600 transition-colors shadow-lg"
            >
                Pular
            </button>

            {/* Conteúdo Central */}
            <div className="flex flex-col items-center text-center animate-fade-in max-w-sm">

                {/* Comparação visual: foto ruim vs foto boa */}
                <div className="flex gap-4 mb-6 items-center justify-center">

                    {/* 
                        =============== LADO ESQUERDO: FOTO RUIM (SIMULADA) ===============
                        Aqui usamos a MESMA estrutura do produto, mas com "defeitos" visuais aplicados via CSS.
                    */}
                    <div className="relative group">
                        {/* Container da foto (Moldura) */}
                        <div className="w-32 h-44 bg-gray-800 rounded-xl flex items-center justify-center overflow-hidden border-4 border-red-500/50 shadow-inner relative">

                            {/* Defeito 1: Flash estourado (Mancha branca de luz) */}
                            <div className="absolute top-4 right-6 w-8 h-8 bg-white/10 rounded-full blur-xl z-20"></div>

                            {/* 
                                PRODUTO RUIM 
                                scale-75:    Diminui o tamanho (parece longe)
                                rotate-6:    Gira um pouco (torta)
                                blur-[1.5px]: Borra a imagem (sem foco)
                                brightness-50: Escurece a imagem (pouca luz)
                                opacity-70:  Deixa meio transparente (fantasma)
                            */}
                            <div className="w-24 h-32 bg-white rounded-lg flex flex-col items-center p-2 shadow-sm transform scale-85 rotate-20 blur-[1.5px] brightness-50 opacity-90 transition-all">
                                {/* Header do Rótulo */}
                                <div className="w-full h-8 bg-blue-600 rounded-t-md mb-2 flex items-center justify-center">
                                    <span className="text-white text-[8px] font-bold tracking-widest">CEREAL</span>
                                </div>

                                {/* Imagem do Produto (Emoji) */}
                                <div className="text-5xl mb-2 drop-shadow-md">🥣</div>

                                {/* Linhas de texto simuladas */}
                                <div className="w-full space-y-1.5 px-1">
                                    <div className="w-3/4 h-2.5 bg-gray-800 rounded-sm mx-auto"></div>
                                    <div className="w-1/2 h-2 bg-verde-600 rounded-sm mx-auto"></div>
                                    <div className="flex justify-between mt-2 px-1">
                                        <div className="w-1/3 h-1.5 bg-gray-400 rounded-sm"></div>
                                        <div className="w-1/4 h-1.5 bg-gray-400 rounded-sm"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Alerta Invisível (Acessibilidade) */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="sr-only">Foto Ruim</span>
                            </div>
                        </div>
                        {/* X vermelho no canto */}
                        <div className="absolute -bottom-3 -right-3 w-9 h-9 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white z-30">
                            <i className="fas fa-times text-white text-lg"></i>
                        </div>
                    </div>

                    {/* Seta de Transição */}
                    <div className="flex items-center text-white/80 drop-shadow-lg">
                        <i className="fas fa-arrow-right text-3xl"></i>
                    </div>

                    {/* 
                        =============== LADO DIREITO: FOTO BOA (PERFEITA) ===============
                        Mesma estrutura HTML, mas sem os defeitos e com escala normal (scale-100).
                    */}
                    <div className="relative group">
                        <div className="w-32 h-44 bg-gray-900 rounded-xl flex items-center justify-center overflow-hidden border-4 border-verde-500 shadow-2xl relative">

                            {/* 
                                PRODUTO BOM
                                scale-100: Tamanho original (preenche a tela)
                                sem blur, sem rotate, sem brightness reduzido
                            */}
                            <div className="w-24 h-32 bg-white rounded-lg flex flex-col items-center p-2 shadow-sm transform scale-100 transition-transform">
                                {/* Header do Rótulo */}
                                <div className="w-full h-8 bg-blue-600 rounded-t-md mb-2 flex items-center justify-center">
                                    <span className="text-white text-[8px] font-bold tracking-widest">CEREAL</span>
                                </div>

                                {/* Imagem do Produto (Emoji) */}
                                <div className="text-5xl mb-2 drop-shadow-md">🥣</div>

                                {/* Linhas de texto simuladas (Legíveis) */}
                                <div className="w-full space-y-1.5 px-1">
                                    <div className="w-3/4 h-2.5 bg-gray-800 rounded-sm mx-auto"></div>
                                    <div className="w-1/2 h-2 bg-verde-600 rounded-sm mx-auto"></div>
                                    <div className="flex justify-between mt-2 px-1">
                                        <div className="w-1/3 h-1.5 bg-gray-400 rounded-sm"></div>
                                        <div className="w-1/4 h-1.5 bg-gray-400 rounded-sm"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Marcas de Corte (Foco da Câmera) */}
                            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-verde-400/80"></div>
                            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-verde-400/80"></div>
                            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-verde-400/80"></div>
                            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-verde-400/80"></div>

                        </div>
                        {/* Check verde de sucesso */}
                        <div className="absolute -bottom-3 -right-3 w-9 h-9 bg-verde-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white z-30">
                            <i className="fas fa-check text-white text-lg"></i>
                        </div>

                        {/* Estrelinha de Sucesso (Bounce Animation) */}
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce shadow-lg border-2 border-white z-30">
                            <i className="fas fa-star text-yellow-800 text-sm"></i>
                        </div>
                    </div>
                </div>

                {/* Ícones com textos explicativos agradáveis */}
                <div className="flex flex-col gap-3 w-full max-w-xs mb-20">
                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 flex items-center gap-3 border border-white/20">
                        <div className="w-10 h-10 bg-verde-100 rounded-full flex items-center justify-center shrink-0">
                            <i className="fas fa-camera text-verde-600"></i>
                        </div>
                        <span className="text-white font-medium text-lg text-left">Foto legível</span>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 flex items-center gap-3 border border-white/20">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                            <i className="fas fa-tag text-blue-600"></i>
                        </div>
                        <span className="text-white font-medium text-lg text-left">Rótulo da frente</span>
                    </div>
                </div>
            </div>

            {/* Botão Entendi (rodapé) */}
            <button
                onClick={fecharESalvar}
                className="bg-verde-500 text-white font-bold py-4 px-12 rounded-xl hover:bg-verde-600 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg"
            >
                <i className="fas fa-check"></i>
                Entendi!
            </button>
        </div>
    );
};

/**
 * Hook para verificar se deve mostrar o tutorial de foto.
 */
export const useTutorialFotoPrimeiroUso = () => {
    const deveExibir = () => {
        return !localStorage.getItem(CHAVE_TUTORIAL_FOTO_VISTO);
    };

    const marcarComoVista = () => {
        localStorage.setItem(CHAVE_TUTORIAL_FOTO_VISTO, 'true');
    };

    return { deveExibir, marcarComoVista };
};
