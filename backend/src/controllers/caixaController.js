const db = require('../config/database');

async function buscarPorPapeleta(req, res) {
  try {
    const { codigo } = req.params;

    const caixaResult = await db.query(
      `select id, codigo_papeleta, numero_caixa, pedido, cliente, status,
              usuario_responsavel_id, supervisor_id, data_abertura,
              data_finalizacao, data_criacao, data_atualizacao
       from caixas
       where codigo_papeleta = $1
       limit 1`,
      [codigo]
    );

    if (caixaResult.rowCount === 0) {
      return res.status(404).json({
        erro: 'Caixa nao encontrada'
      });
    }

    const caixa = caixaResult.rows[0];

    const itensResult = await db.query(
      `select
         ci.id,
         ci.caixa_id,
         ci.produto_id,
         ci.endereco_id,
         ci.quantidade_solicitada,
         ci.quantidade_coletada,
         ci.status,
         ci.ordem_coleta,
         p.referencia,
         p.descricao as produto_descricao,
         p.cor,
         p.tamanho,
         p.codigo_sku,
         e.codigo as endereco_codigo,
         e.andar_rua,
         e.secao,
         e.posicao_nivel,
         e.descricao as endereco_descricao
       from caixa_itens ci
       join produtos p on p.id = ci.produto_id
       join enderecos_picking e on e.id = ci.endereco_id
       where ci.caixa_id = $1
       order by ci.ordem_coleta asc, ci.id asc`,
      [caixa.id]
    );

    return res.json({
      caixa,
      itens: itensResult.rows.map((item) => ({
        id: item.id,
        caixa_id: item.caixa_id,
        produto_id: item.produto_id,
        endereco_id: item.endereco_id,
        quantidade_solicitada: item.quantidade_solicitada,
        quantidade_coletada: item.quantidade_coletada,
        status: item.status,
        ordem_coleta: item.ordem_coleta,
        produto: {
          id: item.produto_id,
          referencia: item.referencia,
          descricao: item.produto_descricao,
          cor: item.cor,
          tamanho: item.tamanho,
          codigo_sku: item.codigo_sku
        },
        endereco: {
          id: item.endereco_id,
          codigo: item.endereco_codigo,
          andar_rua: item.andar_rua,
          secao: item.secao,
          posicao_nivel: item.posicao_nivel,
          descricao: item.endereco_descricao
        }
      }))
    });
  } catch (error) {
    console.error('Erro ao buscar caixa por papeleta:', error);
    return res.status(500).json({
      erro: 'Erro ao buscar caixa'
    });
  }
}

module.exports = {
  buscarPorPapeleta
};
