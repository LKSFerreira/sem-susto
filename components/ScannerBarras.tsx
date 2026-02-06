import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface PropsScanner {
  aoLerCodigo: (codigo: string) => void;
  aoCancelar: () => void;
}

export const ScannerBarras: React.FC<PropsScanner> = ({ aoLerCodigo, aoCancelar }) => {
  const [codigoManual, setCodigoManual] = useState('');
  const [statusCamera, setStatusCamera] = useState<'iniciando' | 'ativa' | 'erro'>('iniciando');
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  // Referência para o scanner e controle de inicialização
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerMountingRef = useRef(false);
  // Controle de estado do scanner para evitar chamar stop() quando não está rodando
  const scannerAtivoRef = useRef(false);

  useEffect(() => {
    // ID único para esta instância do componente
    const elementoId = 'leitor-codigo-barras';

    // Pequeno timeout para garantir renderização do DOM
    const iniciarScanner = async () => {
      // Evita reentrância
      if (scannerMountingRef.current) return;
      scannerMountingRef.current = true;

      try {
        // Limpeza de segurança
        const container = document.getElementById(elementoId);
        if (container) container.innerHTML = '';

        // Se já existe instância global falha, tenta parar
        if (scannerRef.current) {
          try {
            await scannerRef.current.stop();
          } catch (e) { }
        }

        const scanner = new Html5Qrcode(elementoId);
        scannerRef.current = scanner;

        // Configuração de formatos comuns de código de barras
        const config = {
          fps: 10,
          qrbox: { width: 250, height: 150 }, // Retângulo paisagem para barras
          aspectRatio: 1.0,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
        };

        await scanner.start(
          { facingMode: 'environment' },
          config,
          codigoDecodificado => {
            // Feedback tátil
            try {
              if (navigator.vibrate) navigator.vibrate(200);
            } catch (e) { }

            // Pausa e retorna
            scanner.pause(true);
            scannerAtivoRef.current = false; // Marca como pausado
            aoLerCodigo(codigoDecodificado);
          },
          erro => { } // Ignora erros de frame
        );

        scannerAtivoRef.current = true; // Scanner está rodando
        setStatusCamera('ativa');
      } catch (erro) {
        setStatusCamera('erro');
        const msg = erro instanceof Error ? erro.message : String(erro);

        // Em PC desktop ou sem permissão, isso é esperado. Não é um erro fatal.
        if (msg.includes('NotFound') || msg.includes('Permission') || msg.includes('PermissionDeniedError')) {
          console.warn('Scanner indisponível (Câmera não encontrada ou permissão negada):', msg);
          if (msg.includes('NotFound')) setMensagemErro('Câmera não encontrada. Digite o código manualmente abaixo.');
          else setMensagemErro('Acesso à câmera negado. Digite o código manualmente abaixo.');
        } else {
          console.error('Erro fatal scanner:', msg);
          setMensagemErro('Erro ao acessar câmera. Digite o código manualmente abaixo.');
        }

        // Se falhou ao iniciar, não devemos tentar parar no cleanup
        scannerRef.current = null;
      } finally {
        scannerMountingRef.current = false;
      }
    };

    const timeoutId = setTimeout(iniciarScanner, 100);

    return () => {
      clearTimeout(timeoutId);
      scannerMountingRef.current = false;
      // Só tenta parar se o scanner estiver realmente ativo
      if (scannerRef.current && scannerAtivoRef.current) {
        scannerAtivoRef.current = false;
        scannerRef.current.stop().catch(() => { });
      }
      scannerRef.current = null;
    };
  }, [aoLerCodigo]);

  const lidarComEnvioManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (codigoManual.trim().length > 0) {
      // Não precisamos parar o scanner explicitamente aqui,
      // pois o aoLerCodigo vai desmontar o componente e
      // a função de limpeza do useEffect vai parar a câmera.
      // Isso evita condições de corrida onde o stop() trava.
      aoLerCodigo(codigoManual.trim());
    }
  };

  const fecharScanner = () => {
    // Só tenta parar se o scanner estiver realmente ativo
    if (scannerRef.current && scannerAtivoRef.current) {
      scannerAtivoRef.current = false;
      scannerRef.current
        .stop()
        .catch(() => { })
        .finally(() => {
          scannerRef.current = null;
          aoCancelar();
        });
    } else {
      scannerRef.current = null;
      aoCancelar();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="bg-gray-800 text-white p-4 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-lg">
            <i className="fas fa-barcode mr-2"></i>Scanner
          </h3>
          <button onClick={fecharScanner} className="text-gray-400 hover:text-white p-2">
            <i className="fas fa-times fa-lg"></i>
          </button>
        </div>

        {/* Área da Câmera */}
        <div className="bg-black relative grow flex items-center justify-center overflow-hidden min-h-[300px]">
          <div id="leitor-codigo-barras" className="w-full h-full"></div>

          {/* Overlay: Iniciando */}
          {statusCamera === 'iniciando' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10 bg-black">
              <div className="animate-pulse mb-4">
                <i className="fas fa-camera fa-3x text-gray-600"></i>
              </div>
              <p className="text-gray-400">Iniciando câmera...</p>
              <p className="text-xs text-gray-600 mt-2">Certifique-se de permitir o acesso.</p>
            </div>
          )}

          {/* Overlay: Erro */}
          {statusCamera === 'erro' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10 bg-gray-900 p-6 text-center">
              <i className="fas fa-exclamation-circle fa-3x text-red-500 mb-4"></i>
              <p className="font-bold mb-2 text-lg">{mensagemErro}</p>
              <p className="text-sm text-gray-400 mb-4">
                Por favor, digite o código manualmente abaixo.
              </p>
              <button
                onClick={fecharScanner}
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Voltar
              </button>
            </div>
          )}
        </div>

        {/* Fallback Manual */}
        <div className="p-4 bg-gray-100 shrink-0 border-t border-gray-200">
          <form onSubmit={lidarComEnvioManual} className="flex gap-2">
            <input
              type="tel"
              inputMode="numeric"
              value={codigoManual}
              onChange={e => setCodigoManual(e.target.value)}
              placeholder="Digite o código de barras..."
              className="flex-1 p-3 bg-white border border-gray-300 rounded text-gray-900 font-bold focus:ring-2 focus:ring-verde-500 outline-none shadow-sm"
              autoFocus={statusCamera === 'erro'}
            />
            <button
              type="submit"
              className="bg-verde-600 text-white px-6 rounded font-bold hover:bg-verde-700 transition-colors shadow-sm"
            >
              OK
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
