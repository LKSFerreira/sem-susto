import { ServicoLeituraRotulo, DadosProdutoExtraidos } from "./tipos";

/**
 * Mock para testes ou uso gratuito/offline.
 * Retorna dados fictícios ou aleatórios baseados no tamanho da string da imagem.
 */
export class ServicoIAMock implements ServicoLeituraRotulo {
  async extrairDados(imagemBase64: string): Promise<DadosProdutoExtraidos | null> {
    // Simula delay de rede
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.info("MOCK IA: Analisando imagem (simulação)...");

    // Retorna dados fixos para teste
    return {
      descricao: "Produto Teste Mockado",
      marca: "Marca Genérica",
      tamanho: "1kg"
    };
  }

  async extrairDadosDeTexto(descricao: string): Promise<DadosProdutoExtraidos | null> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      descricao: descricao,
      marca: "Marca Mockada Texto",
      tamanho: "500g"
    };
  }
}
