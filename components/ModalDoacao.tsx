import React, { useState } from 'react';
// O navegador exige caminhos relativos iniciando com ./ ou ../ para módulos locais
import dadosPix from '../chave_pix/chave_pix.json' assert { type: 'json' };

interface PropsModalDoacao {
  aoFechar: () => void;
}

export const ModalDoacao: React.FC<PropsModalDoacao> = ({ aoFechar }) => {
  const [copiado, setCopiado] = useState<string | null>(null);

  const copiarTexto = (texto: string, tipo: string) => {
    navigator.clipboard.writeText(texto);
    setCopiado(tipo);
    
    // Feedback tátil
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
    
    setTimeout(() => setCopiado(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-80 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-verde-600 to-verde-500 p-4 text-white text-center relative">
          <button 
            onClick={aoFechar}
            className="absolute top-3 right-3 text-white/80 hover:text-white p-2"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
          <div className="mb-2 bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto backdrop-blur-sm">
            <i className="fas fa-heart text-2xl animate-pulse"></i>
          </div>
          <h2 className="font-bold text-lg">Gostou do App?</h2>
          <p className="text-xs text-verde-100 px-4">
            O Preço Certo é gratuito. Se ele te ajuda a economizar, considere fazer uma doação de qualquer valor!
          </p>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          
          {/* QR Code */}
          <div className="flex flex-col items-center">
            <div className="border-2 border-dashed border-gray-300 p-2 rounded-lg bg-gray-50 mb-2">
              {dadosPix.qrcode_pix_base64 && dadosPix.qrcode_pix_base64.length > 50 ? (
                <img 
                  src={dadosPix.qrcode_pix_base64} 
                  alt="QR Code Pix" 
                  className="w-40 h-40 object-contain"
                />
              ) : (
                <div className="w-40 h-40 flex items-center justify-center text-center text-xs text-gray-400">
                  QR Code Placeholder<br/>(Configure no JSON)
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 font-medium">Escaneie o QR Code no app do seu banco</p>
          </div>

          <div className="border-t border-gray-100 my-1"></div>

          {/* Botões de Cópia */}
          <div className="flex flex-col gap-3">
            
            {/* Pix Copia e Cola */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Pix Copia e Cola</label>
              <div className="flex gap-2">
                <input 
                  readOnly 
                  value={dadosPix.copia_e_cola_pix} 
                  className="flex-1 bg-gray-100 text-xs text-gray-600 p-2 rounded border border-gray-200 truncate font-mono"
                />
                <button 
                  onClick={() => copiarTexto(dadosPix.copia_e_cola_pix, 'copia')}
                  className={`px-3 py-2 rounded text-xs font-bold transition-all w-24 flex items-center justify-center gap-1
                    ${copiado === 'copia' ? 'bg-green-100 text-green-700' : 'bg-verde-600 text-white hover:bg-verde-700'}
                  `}
                >
                  {copiado === 'copia' ? <><i className="fas fa-check"></i> Copiado</> : <><i className="fas fa-copy"></i> Copiar</>}
                </button>
              </div>
            </div>

            {/* Chave Aleatória/Email/CPF */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Chave Pix</label>
              <div className="flex gap-2">
                <input 
                  readOnly 
                  value={dadosPix.chave_aleatoria_pix} 
                  className="flex-1 bg-gray-100 text-xs text-gray-600 p-2 rounded border border-gray-200 truncate font-mono"
                />
                <button 
                  onClick={() => copiarTexto(dadosPix.chave_aleatoria_pix, 'chave')}
                  className={`px-3 py-2 rounded text-xs font-bold transition-all w-24 flex items-center justify-center gap-1
                    ${copiado === 'chave' ? 'bg-green-100 text-green-700' : 'bg-verde-600 text-white hover:bg-verde-700'}
                  `}
                >
                  {copiado === 'chave' ? <><i className="fas fa-check"></i> Copiado</> : <><i className="fas fa-copy"></i> Copiar</>}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-3 text-center">
          <button onClick={aoFechar} className="text-gray-500 text-sm font-semibold hover:text-gray-800">
            Talvez depois
          </button>
        </div>
      </div>
    </div>
  );
};