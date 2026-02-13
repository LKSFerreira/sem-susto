import { ServicoLeituraRotulo } from "./tipos";
import { ServicoIAGroq } from "./groq";
import { ServicoIAMock } from "./mock";

export class FabricaServicoIA {
  static criar(): ServicoLeituraRotulo {
    // Em modo de teste/demonstração, a variável VITE_MOCK_IA=true ativa o mock.
    // Caso contrário, SEMPRE usa o proxy serverless (sem chave no frontend).
    const usarMock = import.meta.env.VITE_MOCK_IA === 'true';

    if (usarMock) {
      console.log("🏭 FabricaIA: Usando MOCK (modo demonstração).");
      return new ServicoIAMock();
    }

    // O proxy serverless cuida da chave — o frontend não precisa dela
    console.log("🏭 FabricaIA: Usando serviço GROQ (via proxy serverless)");
    return new ServicoIAGroq();
  }
}

// Instância singleton para uso no app
export const servicoIA = FabricaServicoIA.criar();
