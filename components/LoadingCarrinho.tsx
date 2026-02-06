import React from 'react';

interface LoadingCarrinhoProps {
    visivel: boolean;
    titulo?: string;
    subtitulo?: string;
}

export const LoadingCarrinho: React.FC<LoadingCarrinhoProps> = ({
    visivel,
    titulo = "Buscando produtos...",
    subtitulo = "Estamos enchendo seu carrinho!"
}) => {
    if (!visivel) return null;

    return (
        <div className="fixed inset-0 z-[90] bg-gradient-to-b from-verde-600/95 to-verde-800/95 backdrop-blur-sm flex items-center justify-center overflow-hidden">
            <div className="flex flex-col items-center gap-6 animate-fade-in z-10">
                {/* Carrinho de compras com produtos caindo dentro */}
                {/* 
          === ÁREA DA ANIMAÇÃO DO CARRINHO === 
          Usamos 'relative' para que os elementos filhos com 'absolute' se posicionem
          em relação a esta caixa, e não à tela inteira.
        */}
                <div className="relative">

                    {/* 
            1. CHUVA DE ITENS:
            Itens que caem de cima. Usamos um .map para criar vários.
          */}
                    {['🍎', '🍕', '🍔', '🍫', '🍪', '🥚', '🧃'].map((emoji, i) => (
                        <div
                            key={i}
                            /* z-10: Colocamos um z-index baixo para ficar ATRÁS do carrinho (que será z-40) */
                            className="absolute text-2xl z-10"
                            style={{
                                left: '50%', // Centraliza no meio do container
                                top: '-75px', // Começa 75px acima do topo (fora da visão inicial)

                                /* 
                                   Cálculo Matemático para Espalhar:
                                   (i % 8): Cria um ciclo de 0 a 7.
                                   - 2: Desloca para esquerda.
                                   * 15: Multiplica os pixels.
                                   Resultado: Espalha os itens horizontalmente de forma variada.
                                */
                                marginLeft: `${(i % 6 - 4) * 15}px`,

                                /* 
                                   Animação definida no CSS abaixo:
                                   - 1.0s: Tempo para cair (rápido!)
                                   - ease-in: Começa devagar e acelera (gravidade)
                                   - delay dinâmico (i * 0.3s): Para não caírem todos juntos
                                   - infinite: Repete para sempre
                                */
                                animation: `cairNoCarrinho 1.0s ease-in ${i * 0.3}s infinite`,
                                opacity: 0 // Começa invisível
                            }}
                        >
                            {emoji}
                        </div>
                    ))}

                    {/* 
            2. O CARRINHO (EMOJI GIGANTE):
            z-40: Z-Index alto para ficar NA FRENTE dos itens de chuva e do fundo.
            Como o emoji tem partes transparentes, vemos o que está atrás (z-20, z-30).
          */}
                    <div className="text-9xl text-gray-200 relative z-40" style={{ filter: 'drop-shadow(0 10px 10px rgba(0,0,0,0.1))' }}>🛒</div>

                    {/* 
            3. PREENCHIMENTO VISUAL (CAMADAS):
            Simula que o carrinho já tem coisas dentro. Dividimos em camadas de profundidade.
            Delays sincronizados para aparecerem APÓS a chuva cair (1.0s).
          */}

                    {/* Camada 1: FUNDO (Mais longe) -> Delays: 1.0s a 1.3s */}
                    <div className="absolute top-[50%] left-[30%] text-2xl z-20 opacity-0" style={{ animation: 'aparecer 0.4s ease-out 1.0s forwards' }}>🥫</div>
                    <div className="absolute top-[55%] left-[40%] text-2xl z-20 opacity-0" style={{ animation: 'aparecer 0.4s ease-out 1.1s forwards' }}>🥩</div>
                    <div className="absolute top-[53%] left-[55%] text-2xl z-20 opacity-0" style={{ animation: 'aparecer 0.4s ease-out 1.2s forwards' }}>🥚</div>
                    <div className="absolute top-[45%] left-[20%] text-2xl z-20 opacity-0" style={{ animation: 'aparecer 0.4s ease-out 1.3s forwards' }}>🥥</div>
                    <div className="absolute top-[47%] left-[13%] text-2xl z-20 opacity-0" style={{ animation: 'aparecer 0.4s ease-out 1.4s forwards' }}>🥛</div>
                    <div className="absolute top-[55%] left-[50%] text-2xl z-20 opacity-0" style={{ animation: 'aparecer 0.4s ease-out 1.5s forwards' }}>🧈</div>

                    {/* Camada 2: MEIO (Intermediária) -> Delays: 1.5s a 1.9s */}
                    <div className="absolute top-[40%] left-[25%] text-xl z-30 opacity-0" style={{ animation: 'aparecer 0.4s ease-out 1.60s forwards' }}>🧃</div>
                    <div className="absolute top-[30%] left-[20%] text-xl z-30 opacity-0" style={{ animation: 'aparecer 0.4s ease-out 1.65s forwards' }}>🍯</div>
                    <div className="absolute top-[35%] left-[35%] text-xl z-30 opacity-0" style={{ animation: 'aparecer 0.4s ease-out 1.70s forwards' }}>🍎</div>
                    <div className="absolute top-[40%] left-[50%] text-xl z-30 opacity-0" style={{ animation: 'aparecer 0.4s ease-out 1.75s forwards' }}>🧀</div>
                    <div className="absolute top-[38%] left-[40%] text-xl z-30 opacity-0" style={{ animation: 'aparecer 0.4s ease-out 1.80s forwards' }}>🥦</div>
                    <div className="absolute top-[33%] left-[55%] text-xl z-30 opacity-0" style={{ animation: 'aparecer 0.4s ease-out 1.85s forwards' }}>🥑</div>
                    <div className="absolute top-[30%] left-[60%] text-xl z-30 opacity-0" style={{ animation: 'aparecer 0.4s ease-out 1.90s forwards' }}>🍇</div>
                    <div className="absolute top-[42%] left-[15%] text-xl z-30 opacity-0" style={{ animation: 'aparecer 0.4s ease-out 1.95s forwards' }}>🍆</div>

                    {/* Camada 3: TOPO (Transbordando) -> Delays: 2.0s a 2.4s */}
                    <div className="absolute top-[25%] left-[15%] text-lg z-35 opacity-0" style={{ animation: 'aparecer 0.4s ease-out 2.0s forwards' }}>🥪</div>
                    <div className="absolute top-[20%] left-[35%] text-lg z-35 opacity-0" style={{ animation: 'aparecer 0.4s ease-out 2.1s forwards' }}>🍫</div>
                    <div className="absolute top-[15%] left-[55%] text-lg z-35 opacity-0" style={{ animation: 'aparecer 0.4s ease-out 2.2s forwards' }}>🍕</div>
                    <div className="absolute top-[23%] left-[45%] text-lg z-35 opacity-0" style={{ animation: 'aparecer 0.4s ease-out 2.3s forwards' }}>🍪</div>
                    <div className="absolute top-[10%] left-[40%] text-lg z-35 opacity-0" style={{ animation: 'aparecer 0.4s ease-out 2.4s forwards' }}>🍞</div>
                    <div className="absolute top-[18%] left-[25%] text-lg z-35 opacity-0" style={{ animation: 'aparecer 0.4s ease-out 2.5s forwards' }}>🍗</div>
                    <div className="absolute top-[12%] left-[65%] text-lg z-35 opacity-0" style={{ animation: 'aparecer 0.4s ease-out 2.6s forwards' }}>🍩</div>
                    <div className="absolute top-[25%] left-[50%] text-lg z-35 opacity-0" style={{ animation: 'aparecer 0.4s ease-out 2.7s forwards' }}>🥜</div>

                    {/* Camada 4: SUPERLOTAÇÃO (Topo Extra) -> Delays: 2.3s a 2.6s */}
                    <div className="absolute top-[5%] left-[30%] text-lg z-35 opacity-0" style={{ animation: 'aparecer 0.4s ease-out 2.85s forwards' }}>🥞</div>
                    <div className="absolute top-[8%] left-[50%] text-lg z-35 opacity-0" style={{ animation: 'aparecer 0.4s ease-out 2.95s forwards' }}>🥐</div>
                    <div className="absolute top-[2%] left-[45%] text-lg z-35 opacity-0" style={{ animation: 'aparecer 0.4s ease-out 3.00s forwards' }}>🥖</div>
                    <div className="absolute top-[10%] left-[20%] text-lg z-35 opacity-0" style={{ animation: 'aparecer 0.4s ease-out 3.05s forwards' }}>🌽</div>
                    <div className="absolute top-[6%] left-[60%] text-lg z-35 opacity-0" style={{ animation: 'aparecer 0.4s ease-out 3.10s forwards' }}>🥔</div>
                </div>

                {/* Mensagem amigável */}
                <div className="text-center">
                    <p className="text-white text-xl font-bold mb-2">{titulo}</p>
                    <p className="text-white/70 text-sm">{subtitulo}</p>
                </div>

                {/* Spinner circular de progresso */}
                <div className="w-12 h-12 rounded-full border-4 border-white/30 border-t-white animate-spin"></div>
            </div>

            {/* CSS para animações */}
            <style>{`
        @keyframes cairNoCarrinho {
          0% { 
            transform: translateY(0) scale(1); 
            opacity: 1; 
          }
          70% { 
            opacity: 1; 
          }
          100% { 
            transform: translateY(80px) scale(0.5); 
            opacity: 0; 
          }
        }
        @keyframes aparecer {
          0% { opacity: 0; transform: scale(0) translateY(-10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
        </div>
    );
};
