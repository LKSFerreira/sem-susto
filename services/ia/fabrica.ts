import { ServicoLeituraRotulo } from "./tipos";
import { ServicoIAGroq } from "./groq";
import { ServicoIAMock } from "./mock";

export class FabricaServicoIA {
  static criar(): ServicoLeituraRotulo {
    const apiKey = import.meta.env.VITE_GROQ_TOKEN;
    
    // Sem chave válida → Mock (modo offline/demonstração)
    if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
      console.log("🏭 FabricaIA: Sem chave válida, usando MOCK.");
      return new ServicoIAMock();
    }

    // Groq: Free tier generoso, modelos Meta Llama
    console.log("🏭 FabricaIA: Usando serviço GROQ");
    return new ServicoIAGroq(apiKey);
  }
}

// Instância singleton para uso no app
export const servicoIA = FabricaServicoIA.criar();
