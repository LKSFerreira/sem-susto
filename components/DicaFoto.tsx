import React from 'react';

// Chave para controlar exibição única da dica de foto
const CHAVE_DICA_FOTO_VISTA = 'sem_susto_dica_foto_v1';

interface PropsDicaFoto {
    aoFechar: () => void;
}

/**
 * Modal contextual que aparece na primeira vez que o usuário
 * usa a câmera/galeria no formulário de produto.
 * 
 * Ensina como tirar uma boa foto para a IA processar.
 */
export const DicaFoto: React.FC<PropsDicaFoto> = ({ aoFechar }) => {
    const fecharESalvar = () => {
        localStorage.setItem(CHAVE_DICA_FOTO_VISTA, 'true');
        aoFechar();
    };

    return (
        <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
                    <div className="flex items-center gap-2">
                        <i className="fas fa-lightbulb text-yellow-300"></i>
                        <h3 className="font-bold text-lg">Dica para a IA ler melhor</h3>
                    </div>
                </div>

                {/* Conteúdo */}
                <div className="p-5">
                    {/* Lista de dicas com ícones e texto */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center shrink-0">
                                <i className="fas fa-sun text-yellow-500"></i>
                            </div>
                            <div>
                                <p className="font-medium text-gray-800">Boa iluminação</p>
                                <p className="text-sm text-gray-500">Evite sombras e fotos escuras</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                                <i className="fas fa-search-plus text-blue-500"></i>
                            </div>
                            <div>
                                <p className="font-medium text-gray-800">Texto visível</p>
                                <p className="text-sm text-gray-500">Aproxime para ver nome e marca</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-verde-100 rounded-full flex items-center justify-center shrink-0">
                                <i className="fas fa-hand-paper text-verde-600"></i>
                            </div>
                            <div>
                                <p className="font-medium text-gray-800">Mãos firmes</p>
                                <p className="text-sm text-gray-500">Evite tremer para não borrar</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Botão */}
                <div className="p-4 pt-0">
                    <button
                        onClick={fecharESalvar}
                        className="w-full bg-verde-600 text-white font-bold py-3 rounded-xl hover:bg-verde-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <i className="fas fa-check"></i>
                        Entendi!
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * Hook para verificar se deve mostrar a dica de foto.
 */
export const useDicaFotoPrimeiroUso = () => {
    const deveExibir = () => {
        return !localStorage.getItem(CHAVE_DICA_FOTO_VISTA);
    };

    const marcarComoVista = () => {
        localStorage.setItem(CHAVE_DICA_FOTO_VISTA, 'true');
    };

    return { deveExibir, marcarComoVista };
};
