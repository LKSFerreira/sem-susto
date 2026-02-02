/**
 * Serviço de integração com API Bluesoft Cosmos.
 *
 * Documentação: https://cosmos.bluesoft.com.br/api
 */

import { Produto } from '../types';
import { padronizarDadosProduto } from './ia';
import { formatarTitulo } from './utilitarios';
import { CosmosAdapter } from './adapters/cosmos.adapter';

// Em desenvolvimento, usa o proxy configurado no vite.config.ts para evitar CORS.
// Em produção, usa API Route serverless (/api/cosmos) que faz proxy.
const IS_DEV = import.meta.env.DEV;
const COSMOS_API_URL = IS_DEV ? '/api-cosmos' : '/api/cosmos';
const COSMOS_TOKEN = import.meta.env.VITE_COSMOS_TOKEN;

if (!COSMOS_TOKEN) {
  console.warn('⚠️ Token COSMOS não configurado (.env)');
}

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
    const response = await fetch(`${COSMOS_API_URL}/gtins/${gtin}.json`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Cosmos-API-Request',
        'Content-Type': 'application/json',
        'X-Cosmos-Token': COSMOS_TOKEN,
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
          if (dadosPadronizados.tamanho) produto.tamanho = dadosPadronizados.tamanho.toUpperCase();
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
