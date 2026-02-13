/**
 * Serviço de integração com API Bluesoft Cosmos.
 *
 * Documentação: https://cosmos.bluesoft.com.br/api
 */

import { Produto } from '../types';
import { padronizarDadosProduto } from './ia';
import { formatarTitulo, extrairTamanho } from './utilitarios';
import { CosmosAdapter } from './adapters/cosmos.adapter';

/**
 * Em desenvolvimento e produção, SEMPRE usa o proxy serverless.
 * O token Cosmos fica no servidor — o frontend NUNCA tem acesso.
 */
const COSMOS_API_URL = '/api/cosmos/gtin';

/**
 * Interface exata dos dados retornados pela API Cosmos.
 */
export interface ProdutoCosmosResponse {
  gtin: number;
  description: string;
  avg_price: number;
  max_price: number;
  price: string;
  thumbnail: string;
  brand: {
    name: string;
    picture: string;
  };
  gpc: {
    code: string;
    description: string;
  };
  ncm: {
    code: string;
    description: string;
    full_description: string;
  };
  gross_weight: number;
  net_weight: number;
  width: number;
  height: number;
  length: number;
}

/**
 * Busca informações de um produto pelo código de barras (GTIN) na API Cosmos.
 *
 * :param gtin: Código de barras do produto
 * :returns: Dados do produto formatados para o nosso app ou null se não encontrado
 */
export async function buscarProdutoCosmos(gtin: string): Promise<Produto | null> {
  try {
    // Sempre via proxy — token fica no servidor
    const url = `${COSMOS_API_URL}/${gtin}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      // Produto não encontrado na base
      return null;
    }

    if (!response.ok) {
      console.warn(`[Cosmos] Erro HTTP ${response.status}: ${response.statusText}`);
      return null;
    }

    const dados: ProdutoCosmosResponse = await response.json();
    console.log('[Cosmos] Resposta Bruta:', dados);

    // Adapter converte para o modelo de domínio (pt-BR)
    const produto = CosmosAdapter.paraDominio(dados);

    // 2. Padronização via IA (Melhoria de Qualidade de Dados)
    if (produto.descricao) {
      // Monta um contexto rico para a IA (igual ao OpenFoodFacts)
      const contexto = `Produto: ${produto.descricao}. Marca: ${produto.marca || '?'}. Tamanho: ${produto.tamanho || '?'}`;

      try {
        const dadosPadronizados = await padronizarDadosProduto(contexto);

        if (dadosPadronizados) {
          // Atualiza/Limpa os dados com o retorno da IA
          if (dadosPadronizados.descricao) produto.descricao = dadosPadronizados.descricao;
          if (dadosPadronizados.marca && dadosPadronizados.marca !== 'Genérica') produto.marca = dadosPadronizados.marca;
          // Padroniza tamanho conforme SI (kg, g, mg, L, ml, m, cm, mm)
          if (dadosPadronizados.tamanho) {
            produto.tamanho = extrairTamanho(dadosPadronizados.tamanho) || dadosPadronizados.tamanho;
          }
        }
      } catch (err) {
        console.warn('[Cosmos] Falha na padronização IA (usando dados originais):', err);
      }
    }

    return produto;
  } catch (erro: any) {
    // Trata erros de rede/CORS sem quebrar a app
    if (erro instanceof TypeError && erro.message.includes('fetch')) {
      console.warn('[Cosmos] Falha de conexão ou CORS (Verifique Proxy):', erro.message);
    } else {
      console.error('[Cosmos] Erro na requisição:', erro);
    }
    return null;
  }
}
