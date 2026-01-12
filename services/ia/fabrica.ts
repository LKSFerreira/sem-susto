import { ServicoLeituraRotulo } from "./tipos";
import { ServicoIAGemini } from "./gemini";
import { ServicoIAOpenRouter } from "./openrouter";
import { ServicoIAGroq } from "./groq";
import { ServicoIAMock } from "./mock";

export class FabricaServicoIA {
  static criar(): ServicoLeituraRotulo {
    // Prioriza variável dedicada para Groq, se não tenta a genérica
    const apiKey = import.meta.env.VITE_GROQ_TOKEN || import.meta.env.VITE_OPENROUTER_TOKEN;
    
    // Se não tiver chave válida, usa Mock
    if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
      console.log("🏭 FabricaIA: Sem chave válida, usando MOCK.");
      return new ServicoIAMock();
    }

    // Padrão agora é Groq (Mais rápido e Free Tier generoso)
    console.log("🏭 FabricaIA: Usando serviço GROQ");
    return new ServicoIAGroq(apiKey);
    
    // Fallback ou toggle manual poderia ser implementado aqui
  }
}

// Instância singleton para uso no app
export const servicoIA = FabricaServicoIA.criar();
