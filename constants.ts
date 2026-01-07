// Regex para validar unidades de medida (Ex: 1L, 500ml, 2kg)
export const REGEX_UNIDADE = /^\d+(\.\d+)?\s?(L|ml|cm|mm|m|mg|g|kg|cm²)$/i;

// Chave para persistência no LocalStorage
export const CHAVE_STORAGE_CARRINHO = 'preco_certo_carrinho_v1';
export const CHAVE_STORAGE_CATALOGO = 'preco_certo_catalogo_v1';

// Imagem placeholder (SVG Data URI)
// Ícone: Sacola de compras verde estilizada com fundo suave, substituindo a cesta cinza.
export const IMAGEM_PADRAO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' fill='%23f0fdf4'/%3E%3Cpath d='M192 144V96c0-35.3 28.7-64 64-64s64 28.7 64 64v48' fill='none' stroke='%2315803d' stroke-width='32' stroke-linecap='round'/%3E%3Cpath d='M160 144h192c8.8 0 16 7.2 16 16v32H144v-32c0-8.8 7.2-16 16-16z' fill='%2316a34a'/%3E%3Cpath d='M144 192h224l-24 240c-1.6 16-16 28-32 28H200c-16 0-30.4-12-32-28L144 192z' fill='%2322c55e'/%3E%3Ccircle cx='256' cy='300' r='32' fill='%23dcfce7' opacity='0.4'/%3E%3C/svg%3E";