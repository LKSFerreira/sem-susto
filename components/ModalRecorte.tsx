import React, { useRef, useState } from 'react';
import Cropper, { ReactCropperElement } from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import { comprimirImagemBase64 } from '../services/utilitarios';

interface Props {
  imagem: string;
  aoConfirmar: (areaRecorte: any) => void;
  aoCancelar: () => void;
}

export const ModalRecorte: React.FC<Props> = ({ imagem, aoConfirmar, aoCancelar }) => {
  const cropperRef = useRef<ReactCropperElement>(null);
  const [processando, setProcessando] = useState(false);

  const finalizarRecorte = async () => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      setProcessando(true);

      // Obtém o canvas recortado diretamente do CropperJS
      // Limitamos a resolução para não pesar na compressão
      const canvas = cropper.getCroppedCanvas({
        maxWidth: 1024,
        maxHeight: 1024,
        imageSmoothingQuality: 'high',
      });

      if (canvas) {
        // Converte para Base64 (qualidade alta inicial)
        const base64Bruto = canvas.toDataURL('image/jpeg', 0.9);

        // Comprime para reduzir tamanho antes de salvar no banco
        // Usa qualidade 0.7 e largura máxima de 400px (ideal para thumbnails)
        const base64Comprimido = await comprimirImagemBase64(base64Bruto, 0.7, 400);

        aoConfirmar(base64Comprimido);
      }
      setProcessando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black bg-opacity-95 flex flex-col animate-fade-in">
      <div className="flex-1 relative bg-black flex items-center justify-center p-4">
        <Cropper
          src={imagem}
          style={{ height: '100%', width: '100%' }}
          initialAspectRatio={0} // 0 = Livre (Free)
          aspectRatio={NaN} // Permite mudar a proporção livremente
          guides={true}
          viewMode={1} // Restringe o crop para dentro da imagem
          dragMode="move" // Permite mover a imagem
          responsive={true}
          autoCropArea={0.8} // Começa selecionando 80% da imagem
          checkOrientation={false}
          ref={cropperRef}
          background={false}
          className="max-h-[77vh]"
        />
      </div>

      <div className="bg-white p-4 pb-8 rounded-t-2xl shadow-2xl flex flex-col gap-3 animate-slide-up shrink-0 relative z-[70]">
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto" />

        <div className="flex gap-3 pt-1">
          <button
            onClick={aoCancelar}
            disabled={processando}
            className="w-14 items-center justify-center font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl active:scale-95 transition-transform flex"
            aria-label="Cancelar"
          >
            <i className="fas fa-times text-lg"></i>
          </button>

          <button
            onClick={finalizarRecorte}
            disabled={processando}
            className="flex-1 py-3.5 font-bold text-white bg-verde-600 rounded-xl shadow-lg hover:bg-verde-700 active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:bg-gray-400"
          >
            {processando ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
            <span>CONFIRMAR</span>
          </button>
        </div>
      </div>
    </div>
  );
};
