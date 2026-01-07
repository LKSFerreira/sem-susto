import React, { useState, useEffect } from 'react';
// Nota: Em um ambiente real, importariamos 'html5-qrcode' aqui.
// import { Html5QrcodeScanner } from "html5-qrcode";

interface PropsScanner {
  aoLerCodigo: (codigo: string) => void;
  aoCancelar: () => void;
}

export const ScannerBarras: React.FC<PropsScanner> = ({ aoLerCodigo, aoCancelar }) => {
  const [codigoManual, setCodigoManual] = useState('');
  const [erroCamera, setErroCamera] = useState<string | null>(null);

  // Efeito didático: Simulação de inicialização de câmera
  useEffect(() => {
    // Aqui inicializariamos a lib html5-qrcode.
    // Como estamos num ambiente controlado, vamos simular a UI de scanner
    // e permitir a entrada manual como fallback robusto.
    console.log("Inicializando scanner...");
    
    return () => {
      console.log("Limpando scanner...");
    };
  }, []);

  const lidarComEnvioManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (codigoManual.trim().length > 0) {
      aoLerCodigo(codigoManual);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg overflow-hidden shadow-2xl relative">
        
        {/* Cabeçalho do Scanner */}
        <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
          <h3 className="font-bold text-lg"><i className="fas fa-barcode mr-2"></i>Scanner</h3>
          <button onClick={aoCancelar} className="text-gray-400 hover:text-white">
            <i className="fas fa-times fa-lg"></i>
          </button>
        </div>

        {/* Área da Câmera (Simulada/Placeholder) */}
        <div className="bg-black h-64 flex items-center justify-center relative overflow-hidden group">
          
          {/* Mira do Scanner (Overlay) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-40 border-2 border-verde-500 rounded opacity-70 animate-pulse relative">
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-500 shadow-[0_0_10px_rgba(255,0,0,0.8)]"></div>
            </div>
          </div>

          {!erroCamera ? (
            <div className="text-gray-400 text-center p-4">
              <p className="mb-2"><i className="fas fa-camera fa-2x"></i></p>
              <p className="text-sm">A câmera seria ativada aqui com <code>html5-qrcode</code>.</p>
              <p className="text-xs mt-2 text-gray-500">Para teste, use a entrada manual abaixo.</p>
            </div>
          ) : (
             <div className="text-red-400 p-4 text-center">{erroCamera}</div>
          )}
        </div>

        {/* Fallback Manual */}
        <div className="p-4 bg-gray-100">
          <form onSubmit={lidarComEnvioManual} className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-700">Não conseguiu ler? Digite:</label>
            <div className="flex gap-2">
              <input
                type="tel"
                inputMode="numeric"
                value={codigoManual}
                onChange={(e) => setCodigoManual(e.target.value)}
                placeholder="Ex: 789123..."
                className="flex-1 p-3 bg-gray-700 border border-gray-600 rounded text-white font-bold placeholder-gray-400 focus:ring-2 focus:ring-verde-500 outline-none transition-colors"
                autoFocus
              />
              <button 
                type="submit"
                className="bg-verde-600 text-white px-5 py-2 rounded font-bold hover:bg-verde-700 transition-colors shadow-sm"
              >
                OK
              </button>
            </div>
            
            {/* Botões rápidos para teste rápido */}
            <div className="mt-2 text-xs text-gray-500 flex gap-2 flex-wrap">
              <button type="button" onClick={() => aoLerCodigo("7891000100103")} className="underline hover:text-verde-600">
                Leite (Teste)
              </button>
              <button type="button" onClick={() => aoLerCodigo("7891000200201")} className="underline hover:text-verde-600">
                Arroz (Teste)
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};