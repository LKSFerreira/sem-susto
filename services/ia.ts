import { GoogleGenAI, Type, Schema } from "@google/genai";

// Inicializa o cliente com a chave de API do ambiente
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Definição do esquema de resposta esperado (JSON)
const esquemaProduto: Schema = {
  type: Type.OBJECT,
  properties: {
    nome: {
      type: Type.STRING,
      description: "O nome principal do produto (ex: Leite Integral, Arroz Agulhinha).",
    },
    marca: {
      type: Type.STRING,
      description: "A marca do fabricante (ex: Nestlé, Tio João, Omo).",
    },
    tamanho: {
      type: Type.STRING,
      description: "O peso líquido ou volume com unidade (ex: 1kg, 500ml, 2L).",
    },
  },
  required: ["nome"], // Pelo menos o nome tentamos garantir
};

/**
 * Envia uma imagem base64 para o Gemini e tenta extrair os dados do produto.
 * @param imagemBase64 String completa da imagem (data:image/jpeg;base64,...)
 */
export const extrairDadosDoRotulo = async (imagemBase64: string) => {
  try {
    // Remove o prefixo do Data URI para enviar apenas os bytes
    const dadosImagem = imagemBase64.split(',')[1];

    const prompt = `Analise esta imagem de um rótulo de produto de supermercado.
    Extraia o Nome do Produto, a Marca e o Tamanho/Peso Líquido.
    Se alguma informação não estiver visível, deixe em branco ou tente inferir pelo contexto visual.
    Responda EXCLUSIVAMENTE em JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: dadosImagem
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: esquemaProduto,
        temperature: 0.1 // Baixa temperatura para ser mais determinístico/preciso
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;

  } catch (error) {
    console.error("Erro na análise de IA:", error);
    throw new Error("Não foi possível ler o rótulo. Tente novamente com uma foto mais nítida.");
  }
};