import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from '../_lib/banco';
import { calcularHash, formatoTokenEhValido } from '../_lib/tokens';
import { hashear, verificarRateLimit, registrarTentativa } from '../_lib/rate_limiter';

/**
 * Endpoint para ativar um token premium em um dispositivo.
 *
 * **Uso:** POST /api/tokens/ativar
 * **Body:** { "token": "SEM-SUSTO-A7X9K2B", "fingerprint": "abc123..." }
 *
 * Fluxo:
 * 1. Rate limiting (verifica IP)
 * 2. Busca token no banco
 * 3. Verifica status (valido/ativo/expirado)
 * 4. Vincula dispositivo (máx 2, cooldown 24h)
 * 5. Se primeira ativação: inicia countdown
 * 6. Retorna dados para cache no localStorage
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ erro: 'Método não permitido' });
    }

    // Extrai dados de identificação da requisição
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'desconhecido';
    const userAgent = (req.headers['user-agent'] as string) || 'desconhecido';
    const ipHash = hashear(ip);
    const userAgentHash = hashear(userAgent);

    // 1. Rate limiting
    const limiteResult = await verificarRateLimit(ipHash);

    if (!limiteResult.permitido) {
        return res.status(429).json({ erro: limiteResult.motivo });
    }

    // 2. Valida body
    const { token, fingerprint } = req.body || {};

    if (!token || typeof token !== 'string') {
        return res.status(400).json({ erro: 'Campo "token" é obrigatório' });
    }

    if (!formatoTokenEhValido(token)) {
        return res.status(400).json({ erro: 'Formato de token inválido' });
    }

    if (!fingerprint || typeof fingerprint !== 'string' || fingerprint.length > 64) {
        return res.status(400).json({ erro: 'Campo "fingerprint" inválido (máx 64 caracteres)' });
    }

    const tokenHash = calcularHash(token);
    const fingerprintHash = hashear(fingerprint);

    try {
        // 3. Busca token no banco
        const resultadoToken = await pool.query(
            'SELECT id, plano, status, duracao_dias, ativado_em, expira_em FROM tokens WHERE token_hash = $1',
            [tokenHash]
        );

        if (resultadoToken.rows.length === 0) {
            // Token inexistente — registra tentativa suspeita
            await registrarTentativa({
                ipHash,
                userAgentHash,
                fingerprintHash,
                tokenHashTentado: tokenHash,
                resultado: 'token_inexistente',
            });

            return res.status(404).json({ erro: 'Token não encontrado' });
        }

        const tokenDados = resultadoToken.rows[0];

        // 4. Verifica expiração lazy
        if (tokenDados.status === 'ativo' && tokenDados.expira_em && new Date(tokenDados.expira_em) < new Date()) {
            await pool.query(
                'UPDATE tokens SET status = $1 WHERE token_hash = $2',
                ['expirado', tokenHash]
            );
            tokenDados.status = 'expirado';
        }

        if (tokenDados.status === 'expirado') {
            await registrarTentativa({
                ipHash,
                userAgentHash,
                fingerprintHash,
                tokenHashTentado: tokenHash,
                resultado: 'token_expirado',
            });

            return res.status(410).json({ erro: 'Token expirado. Contribua novamente para renovar.' });
        }

        // 5. Verifica limite de dispositivos
        const resultadoDispositivos = await pool.query(
            'SELECT fingerprint_hash, vinculado_em FROM dispositivos WHERE token_hash = $1',
            [tokenHash]
        );

        const dispositivosVinculados = resultadoDispositivos.rows;
        const dispositivoJaVinculado = dispositivosVinculados.some(
            (d: any) => d.fingerprint_hash === fingerprintHash
        );

        if (!dispositivoJaVinculado) {
            // Dispositivo novo — verifica se pode vincular
            if (dispositivosVinculados.length >= 2) {
                await registrarTentativa({
                    ipHash,
                    userAgentHash,
                    fingerprintHash,
                    tokenHashTentado: tokenHash,
                    resultado: 'bloqueado_limite_dispositivos',
                });

                return res.status(403).json({ erro: 'Limite de 2 dispositivos atingido.' });
            }

            // Verifica cooldown de 24h entre dispositivos diferentes
            if (dispositivosVinculados.length > 0) {
                const ultimoVinculo = new Date(dispositivosVinculados[dispositivosVinculados.length - 1].vinculado_em);
                const horasDesdeUltimo = (Date.now() - ultimoVinculo.getTime()) / (1000 * 60 * 60);

                if (horasDesdeUltimo < 24) {
                    const horasRestantes = Math.ceil(24 - horasDesdeUltimo);

                    await registrarTentativa({
                        ipHash,
                        userAgentHash,
                        fingerprintHash,
                        tokenHashTentado: tokenHash,
                        resultado: 'bloqueado_cooldown_24h',
                    });

                    return res.status(429).json({
                        erro: `Aguarde ${horasRestantes}h para vincular outro dispositivo.`,
                    });
                }
            }

            // Vincula novo dispositivo
            await pool.query(
                'INSERT INTO dispositivos (token_hash, fingerprint_hash) VALUES ($1, $2)',
                [tokenHash, fingerprintHash]
            );
        }

        // 6. Se primeira ativação: inicia countdown
        if (tokenDados.status === 'valido') {
            const agora = new Date();
            const expiraEm = new Date(agora.getTime() + tokenDados.duracao_dias * 24 * 60 * 60 * 1000);

            await pool.query(
                'UPDATE tokens SET status = $1, ativado_em = $2, expira_em = $3 WHERE token_hash = $4',
                ['ativo', agora.toISOString(), expiraEm.toISOString(), tokenHash]
            );

            tokenDados.status = 'ativo';
            tokenDados.ativado_em = agora;
            tokenDados.expira_em = expiraEm;
        }

        // 7. Registra tentativa de sucesso
        await registrarTentativa({
            ipHash,
            userAgentHash,
            fingerprintHash,
            tokenHashTentado: tokenHash,
            resultado: 'sucesso',
        });

        // 8. Calcula dias restantes
        const diasRestantes = tokenDados.expira_em
            ? Math.max(0, Math.ceil((new Date(tokenDados.expira_em).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            : tokenDados.duracao_dias;

        // Retorna dados para cache no localStorage do frontend
        return res.status(200).json({
            status: tokenDados.status,
            plano: tokenDados.plano,
            dias_restantes: diasRestantes,
            expira_em: tokenDados.expira_em,
        });
    } catch (erro: any) {
        console.error('[Tokens/Ativar] Erro:', erro.message);
        return res.status(500).json({ erro: 'Erro interno' });
    }
}
