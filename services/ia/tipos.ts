/**
 * Estrutura de dados retornada pela IA ao analisar um rótulo.
 */
export interface DadosProdutoExtraidos {
  descricao?: string;
  marca?: string;
  tamanho?: string;
}

/**
 * Interface para serviços de leitura de rótulos via IA.
 * Permite trocar o provedor (Gemini, OpenAI, Mock) sem afetar a UI.
 */
export interface ServicoLeituraRotulo {
  /**
   * Extrai dados de um rótulo a partir de uma imagem.
   * @param imagemBase64 Imagem codificada em base64 (sem prefixo data:image...)
   */
  extrairDados(imagemBase64: string): Promise<DadosProdutoExtraidos | null>;

  /**
   * Extrai dados estruturados a partir de uma descrição de texto.
   * Útil quando a API retorna descrição mas falta marca ou tamanho.
   */
  extrairDadosDeTexto(descricao: string): Promise<DadosProdutoExtraidos | null>;
}
