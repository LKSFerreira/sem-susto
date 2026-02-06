import React, { useState } from 'react';

/**
 * Número do WhatsApp do desenvolvedor para contato.
 * Formato: código do país + DDD + número (sem espaços ou traços)
 */
const WHATSAPP_DESENVOLVEDOR = '5517996510506';

interface PropsModalContato {
    aoFechar: () => void;
}

/**
 * Modal de contato via WhatsApp.
 *
 * Permite que o usuário envie uma mensagem diretamente para o desenvolvedor
 * através do WhatsApp, usando a API de links wa.me.
 *
 * **Exemplo:**
 *
 * .. code-block:: tsx
 *
 *     <ModalContato aoFechar={() => setMostrar(false)} />
 */
export const ModalContato: React.FC<PropsModalContato> = ({ aoFechar }) => {
    const [nome, setNome] = useState('');
    const [mensagem, setMensagem] = useState('');

    /**
     * Abre o WhatsApp com a mensagem formatada.
     * Usa o link wa.me que funciona em mobile e desktop.
     */
    const enviarMensagem = () => {
        // Monta a mensagem com identificação
        const textoCompleto = `Olá! Meu nome é ${nome}.\n\n${mensagem}`;

        // Codifica para URL
        const textoEncoded = encodeURIComponent(textoCompleto);

        // Abre o WhatsApp (funciona em mobile e web)
        window.open(`https://wa.me/${WHATSAPP_DESENVOLVEDOR}?text=${textoEncoded}`, '_blank');

        // Feedback tátil
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(50);
        }

        aoFechar();
    };

    // Validação: ambos os campos são obrigatórios
    const formularioValido = nome.trim().length > 0 && mensagem.trim().length > 0;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-80 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative">

                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-green-500 p-4 text-white text-center relative">
                    <button
                        onClick={aoFechar}
                        className="absolute top-3 right-3 text-white/80 hover:text-white p-2"
                    >
                        <i className="fas fa-times text-xl"></i>
                    </button>
                    <div className="mb-2 bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto backdrop-blur-sm">
                        <i className="fab fa-whatsapp text-2xl"></i>
                    </div>
                    <h2 className="font-bold text-lg">Fale Conosco</h2>
                    <p className="text-xs text-green-100 px-4">
                        Dúvidas, sugestões ou feedback? Manda uma mensagem!
                    </p>
                </div>

                {/* Body */}
                <div className="p-5 flex flex-col gap-4">

                    {/* Campo Nome */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                            Seu Nome *
                        </label>
                        <input
                            type="text"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            placeholder="Como podemos te chamar?"
                            className="bg-gray-50 text-sm text-gray-700 p-3 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all"
                        />
                    </div>

                    {/* Campo Mensagem */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                            Mensagem *
                        </label>
                        <textarea
                            value={mensagem}
                            onChange={(e) => setMensagem(e.target.value)}
                            placeholder="Escreva sua mensagem aqui..."
                            rows={4}
                            className="bg-gray-50 text-sm text-gray-700 p-3 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all resize-none"
                        />
                    </div>

                    {/* Botão Enviar */}
                    <button
                        onClick={enviarMensagem}
                        disabled={!formularioValido}
                        className={`w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all
              ${formularioValido
                                ? 'bg-green-600 hover:bg-green-700 active:scale-95'
                                : 'bg-gray-300 cursor-not-allowed'
                            }`}
                    >
                        <i className="fab fa-whatsapp text-xl"></i>
                        Abrir WhatsApp
                    </button>

                </div>

                {/* Footer */}
                <div className="bg-gray-50 p-3 text-center">
                    <button onClick={aoFechar} className="text-gray-500 text-sm font-semibold hover:text-gray-800">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};
