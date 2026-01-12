import OpenAI from 'openai';
import { ServicoLeituraRotulo, DadosProdutoExtraidos } from "./tipos";
import { logger } from "../logger";

export class ServicoIAGroq implements ServicoLeituraRotulo {
  private client: OpenAI;
  // Modelo Vision atualizado (Llama 3.2 foi substituído pelo Llama 4 Scout/Maverick)
  // Baseado na lista fornecida: meta-llama/llama-4-scout-17b-16e-instruct
  // Este modelo é multimodal e suporta visão.
  // Limite gratuito: ~1.000 requisições/dia (RPD).
  private readonly modelo: string = 'meta-llama/llama-4-scout-17b-16e-instruct';

  constructor(apiKey: string) {
    logger.info("⚡ Inicializando Groq (Via OpenAI SDK)", { model: this.modelo });
    
    this.client = new OpenAI({
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, // Client-side execution
    });
  }

  async extrairDados(imagemBase64: string): Promise<DadosProdutoExtraidos | null> {
    try {
      logger.info("📤 Enviando imagem para Groq...");
      
      const dataUri = imagemBase64.startsWith('data:') 
        ? imagemBase64 
        : `data:image/jpeg;base64,${imagemBase64}`;

      const prompt = `Analise este rótulo de produto. Extraia Nome, Marca e Tamanho/Peso.
      Responda EXCLUSIVAMENTE um JSON puro, sem markdown, no formato:
      { "nome": "...", "marca": "...", "tamanho": "..." }
      
      Regras:
      1. Se não encontrar a marca, use "Genérica".
      2. Se não encontrar peso/tamanho, use "-".
      3. Seja preciso no nome.`;

      logger.info("Payload preparado. Iniciando request...", { model: this.modelo });

      const completion = await this.client.chat.completions.create({
        model: this.modelo,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: dataUri
                }
              }
            ]
          },
        ],
        temperature: 0.1,
        max_tokens: 1024,
      });

      const respostaTexto = completion.choices[0]?.message?.content;
      logger.info("📥 Resposta recebida!", { raw: respostaTexto?.substring(0, 100) + '...' });

      if (respostaTexto) {
        // Limpeza agressiva do JSON (Groq às vezes manda texto junto)
        const jsonMatch = respostaTexto.match(/\{[\s\S]*\}/);
        const jsonLimpo = jsonMatch ? jsonMatch[0] : respostaTexto;

        const dados = JSON.parse(jsonLimpo) as DadosProdutoExtraidos;
        logger.success("✅ Dados extraídos com sucesso", dados);
        return dados;
      }

      return null;

    } catch (error: any) {
      logger.error("❌ Erro Groq", error);
      
      let msgErro = "Falha ao analisar rótulo com Groq.";
      
      if (error instanceof OpenAI.APIError) {
        msgErro = `Erro ${error.status}: ${error.message}`;
      } else if (error?.message) {
        msgErro += ` Detalhes: ${error.message}`;
      }

      throw new Error(msgErro);
    }
  }
}
