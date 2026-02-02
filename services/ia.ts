import { servicoIA } from "./ia/fabrica";

/**
 * Entidade para abstrair o uso da IA no sistema.
 * Atualmente suporta: Gemini, Mock.
 * Configuração via variável de ambiente: VITE_OPENROUTER_TOKEN ou VITE_GOOGLE_TOKEN.
 */
export const extrairDadosDoRotulo = async (imagemBase64: string) => {
  return await servicoIA.extrairDados(imagemBase64);
};

export const padronizarDadosProduto = async (texto: string) => {
  return await servicoIA.extrairDadosDeTexto(texto);
};