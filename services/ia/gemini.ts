import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ServicoLeituraRotulo, DadosProdutoExtraidos } from "./tipos";
import { formatarTitulo } from "../utilitarios";

export class ServicoIAGemini implements ServicoLeituraRotulo {
  private ai: GoogleGenAI | null = null;
  private readonly modelo: string = 'gemini-2.0-flash-exp';

  constructor(apiKey: string) {
    if (apiKey && apiKey !== 'PLACEHOLDER_API_KEY') {
      this.ai = new GoogleGenAI({ apiKey });
    } else {
      console.warn("Serviço Gemini inicializado sem chave de API válida.");
    }
  }

  private getEsquemaProduto(): Schema {
    return {
      type: Type.OBJECT,
      properties: {
        descricao: { type: Type.STRING, description: "Nome principal do produto." },
        marca: { type: Type.STRING, description: "Marca do fabricante." },
        tamanho: { type: Type.STRING, description: "Peso líquido ou volume (ex: 1kg, 500ml)." },
      },
      required: ["descricao"],
    };
  }

  async extrairDados(imagemBase64: string): Promise<DadosProdutoExtraidos | null> {
    if (!this.ai) {
      throw new Error("Chave de API do Gemini não configurada. Verifique suas variáveis de ambiente.");
    }

    try {
      // Remove cabeçalho data:image se existir, para garantir apenas o base64
      const dadosImagem = imagemBase64.includes(',')
        ? imagemBase64.split(',')[1]
        : imagemBase64;

      const prompt = `Analise este rótulo de produto. Extraia Nome, Marca e Tamanho/Peso. Responda apenas JSON.`;

      const response = await this.ai.models.generateContent({
        model: this.modelo,
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: dadosImagem } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: this.getEsquemaProduto(),
          temperature: 0.1
        }
      });

      if (response.text) {
        const dados = JSON.parse(response.text) as DadosProdutoExtraidos;
        if (dados.descricao) dados.descricao = formatarTitulo(dados.descricao);
        if (dados.marca) dados.marca = formatarTitulo(dados.marca);
        return dados;
      }
      return null;

    } catch (error) {
      console.error("Erro na análise Gemini:", error);
      throw new Error("Falha ao analisar rótulo com Gemini.");
    }
  }

  async extrairDadosDeTexto(descricao: string): Promise<DadosProdutoExtraidos | null> {
    if (!this.ai) return null;

    try {
      const prompt = `Analise esta descrição de produto: "${descricao}". 
      Extraia a Marca e o Tamanho/Peso. 
      Retorne também uma versão limpa da descrição (sem códigos estranhos). 
      Responda apenas JSON.`;

      const response = await this.ai.models.generateContent({
        model: this.modelo,
        contents: {
          parts: [{ text: prompt }]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: this.getEsquemaProduto(),
          temperature: 0.1
        }
      });

      if (response.text) {
        const dados = JSON.parse(response.text) as DadosProdutoExtraidos;
        if (dados.descricao) dados.descricao = formatarTitulo(dados.descricao);
        if (dados.marca) dados.marca = formatarTitulo(dados.marca);
        return dados;
      }
      return null;

    } catch (error) {
      console.warn("Erro ao extrair dados de texto Gemini:", error);
      return null; // Falha silenciosa para texto, não bloqueante
    }
  }
}
