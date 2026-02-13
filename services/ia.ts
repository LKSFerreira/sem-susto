import { servicoIA } from "./ia/fabrica";

/**
 * Entidade para abstrair o uso da IA no sistema.
 * Atualmente suporta: Groq (Meta Llama), Mock.
 * Configuração: chave GROQ_TOKEN fica no servidor (api/ia/analisar.ts).
 */
export const extrairDadosDoRotulo = async (imagemBase64: string) => {
  return await servicoIA.extrairDados(imagemBase64);
};

export const padronizarDadosProduto = async (texto: string) => {
  return await servicoIA.extrairDadosDeTexto(texto);
};