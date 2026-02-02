import OpenAI from 'openai';
import { ServicoLeituraRotulo, DadosProdutoExtraidos } from "./tipos";

import { logger } from "../logger";
import { formatarTitulo } from "../utilitarios";

export class ServicoIAGroq implements ServicoLeituraRotulo {
  private client: OpenAI;

  // Modelos Atualizados (Baseado na lista Free Tier)
  // Vision: Llama 4 Scout (Multimodal)
  private readonly modeloVision: string = 'meta-llama/llama-4-scout-17b-16e-instruct';

  // Texto: Llama 3.1 8B Instant (Alta velocidade, alto RPD)
  private readonly modeloTexto: string = 'llama-3.1-8b-instant';

  constructor(apiKey: string) {
    logger.info("⚡ Inicializando Groq (Via OpenAI SDK)", { visionModel: this.modeloVision, textModel: this.modeloTexto });

    this.client = new OpenAI({
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey: apiKey,
      dangerouslyAllowBrowser: true,
    });
  }

  async extrairDados(imagemBase64: string): Promise<DadosProdutoExtraidos | null> {
    try {
      logger.info("📤 Enviando imagem para Groq Vision...", { model: this.modeloVision });

      const dataUri = imagemBase64.startsWith('data:')
        ? imagemBase64
        : `data:image/jpeg;base64,${imagemBase64}`;

      const prompt = `Analise este rótulo de produto. Extraia Nome, Marca e Tamanho/Peso.
      Responda EXCLUSIVAMENTE um JSON puro, sem markdown, no formato:
      { "descricao": "...", "marca": "...", "tamanho": "..." }
      
      Regras:
      1. descricao: Nome completo e claro do produto.
      2. marca: Marca do fabricante (ex: Coca-Cola, Nestlé).
      3. tamanho: Peso/Volume com unidade (ex: 350ml, 1kg).`;

      const completion = await this.client.chat.completions.create({
        model: this.modeloVision,
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

      if (respostaTexto) {
        const jsonMatch = respostaTexto.match(/\{[\s\S]*\}/);
        const jsonLimpo = jsonMatch ? jsonMatch[0] : respostaTexto;
        const dados = JSON.parse(jsonLimpo) as DadosProdutoExtraidos;

        // Padronização Title Case
        if (dados.descricao) dados.descricao = formatarTitulo(dados.descricao);
        if (dados.marca) dados.marca = formatarTitulo(dados.marca);

        return dados;
      }

      return null;

    } catch (error: any) {
      logger.error("❌ Erro Groq Vision", error);
      throw error;
    }
  }

  async extrairDadosDeTexto(textoEntrada: string): Promise<DadosProdutoExtraidos | null> {
    try {
      logger.info("📝 Padronizando dados via Groq...", { model: this.modeloTexto });

      const prompt = `Analise o seguinte texto de produto: "${textoEntrada}".
      
      Tarefa: Padronizar e extrair Nome, Marca e Tamanho.
      1. descricao: Nome descritivo (Title Case). Remova códigos estranhos.
      2. marca: Marca do fabricante. Se não tiver, tente inferir ou use "Genérica".
      3. tamanho: Peso/Volume padronizado (ex: 2L, 500g, 350ml).
      
      SEM PREAMBULO. APENAS JSON:
      { "descricao": "...", "marca": "...", "tamanho": "..." }`;

      const completion = await this.client.chat.completions.create({
        model: this.modeloTexto,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      const respostaTexto = completion.choices[0]?.message?.content;

      if (respostaTexto) {
        const dados = JSON.parse(respostaTexto) as DadosProdutoExtraidos;

        // Padronização final via código (segurança)
        if (dados.descricao) dados.descricao = formatarTitulo(dados.descricao);
        if (dados.marca) dados.marca = formatarTitulo(dados.marca);
        if (dados.tamanho) dados.tamanho = dados.tamanho.toUpperCase();

        return dados;
      }
      return null;

    } catch (error) {
      console.warn("Erro ao padronizar texto Groq:", error);
      return null;
    }
  }
}
