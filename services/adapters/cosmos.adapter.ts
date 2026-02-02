import { Produto } from '../../types';
import { ProdutoCosmosResponse } from '../cosmos';
import { formatarTitulo, extrairTamanho } from '../utilitarios'; // Assume que extrairTamanho será exportado de utilitarios ou movido para lá

/**
 * Adapter para converter dados da API Cosmos (Inglês/Estrutura Fixa)
 * para o Modelo de Domínio da Aplicação (Português/Flexível).
 */
export class CosmosAdapter {
    static paraDominio(cosmosData: ProdutoCosmosResponse): Produto {
        return {
            codigo_barras: String(cosmosData.gtin),
            descricao: formatarTitulo(cosmosData.description),
            marca: formatarTitulo(cosmosData.brand?.name || ''),
            tamanho: extrairTamanho(cosmosData.description) || '',
            preco_estimado: cosmosData.avg_price || 0,
            imagem: cosmosData.thumbnail || undefined
        };
    }
}
