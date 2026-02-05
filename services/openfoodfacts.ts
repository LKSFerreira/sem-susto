import { Produto } from '../types';
import { OpenFoodFactsAdapter, ProdutoOFFResponse } from './adapters/openfoodfacts.adapter';
import { padronizarDadosProduto } from './ia';
import { extrairTamanho } from './utilitarios';

const OFF_API_URL = 'https://world.openfoodfacts.org/api/v2/product';

// OFF = OpenFoodFacts
export async function buscarProdutoOFF(gtin: string): Promise<Produto | null> {
    try {
        const response = await fetch(`${OFF_API_URL}/${gtin}.json`, {
            method: 'GET',
            headers: {
                'User-Agent': 'SemSusto/1.0', // User-Agent é obrigatório/recomendado pela OFF
            },
        });

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            console.warn(`[OFF] Erro HTTP ${response.status}: ${response.statusText}`);
            return null;
        }

        const dados: ProdutoOFFResponse = await response.json();

        if (dados.status !== 1 || !dados.product) {
            return null; // Produto não encontrado ou status inválido
        }

        // 1. Converte para Domínio (Formato Bruto/Original)
        const produto = OpenFoodFactsAdapter.paraDominio(dados);

        // 2. Padronização via IA (Melhoria de Qualidade de Dados)
        if (produto.descricao) {
            // Monta um contexto rico para a IA
            const contexto = `Produto: ${produto.descricao}. Marca: ${produto.marca || '?'}. Tamanho: ${produto.tamanho || '?'}`;

            try {
                // Chama o serviço de IA para limpar/padronizar os textos
                const dadosPadronizados = await padronizarDadosProduto(contexto);

                if (dadosPadronizados) {
                    if (dadosPadronizados.descricao) produto.descricao = dadosPadronizados.descricao;
                    // Só substitui a marca se a IA retornou algo útil e não "Genérica"
                    if (dadosPadronizados.marca && dadosPadronizados.marca !== 'Genérica') produto.marca = dadosPadronizados.marca;
                    // Padroniza tamanho conforme SI (kg, g, mg, L, ml, m, cm, mm)
                    if (dadosPadronizados.tamanho) {
                        produto.tamanho = extrairTamanho(dadosPadronizados.tamanho) || dadosPadronizados.tamanho;
                    }
                }
            } catch (err) {
                console.warn('[OFF] Falha na padronização IA (usando dados originais):', err);
            }
        }

        return produto;

    } catch (erro) {
        console.error('[OFF] Erro na requisição:', erro);
        return null;
    }
}
