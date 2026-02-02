import { Produto } from '../../types';
import { formatarTitulo, extrairTamanho } from '../utilitarios';

export interface ProdutoOFFResponse {
    code: string;
    product?: {
        product_name?: string;
        product_name_pt?: string;
        brands?: string;
        quantity?: string;
        image_url?: string;
        image_front_url?: string;
        selected_images?: {
            front?: {
                display?: {
                    [key: string]: string;
                };
            };
        };
    };
    status: number;
}

export class OpenFoodFactsAdapter {
    static paraDominio(dados: ProdutoOFFResponse): Produto {
        const p = dados.product || {};

        const nomeBruto = p.product_name_pt || p.product_name || '';
        const descricao = nomeBruto ? formatarTitulo(nomeBruto) : 'Produto sem nome';

        const marcaBruta = p.brands || '';
        const marca = marcaBruta ? formatarTitulo(marcaBruta) : 'Genérica';

        const tamanho = p.quantity || extrairTamanho(descricao) || '';

        // Preferência por imagem display em pt, ou geral, ou url direta
        let imagem = p.image_url || p.image_front_url;

        // Se a imagem selecionada estiver disponível
        if (!imagem && p.selected_images?.front?.display) {
            // Tenta "pt" primeiro, senão pega a primeira disponível
            imagem = p.selected_images.front.display['pt'] || Object.values(p.selected_images.front.display)[0];
        }

        return {
            codigo_barras: dados.code,
            descricao,
            marca,
            tamanho: tamanho.toUpperCase(),
            preco_estimado: 0,
            imagem
        };
    }
}
