import { Produto } from '../../types';
import { formatarTitulo, extrairTamanho, construirUrlImagemOFF } from '../utilitarios';

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

        const tamanho = p.quantity ? extrairTamanho(p.quantity) || p.quantity : extrairTamanho(descricao) || 'Sem Tamanho';

        // Preferência por imagem display em pt, ou geral, ou url direta
        let imagem = p.image_front_url || p.image_url;

        // Se não tem URL direta, tenta construir a partir do objeto selected
        if (!imagem && p.selected_images?.front?.display) {
            // Tenta "pt" primeiro, senão pega a primeira disponível
            imagem = p.selected_images.front.display['pt'] || Object.values(p.selected_images.front.display)[0];
        }

        // Último caso: tenta construir a URL baseada no código (tentativa padronizada)
        if (!imagem) {
            imagem = construirUrlImagemOFF(dados.code) ?? undefined;
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
