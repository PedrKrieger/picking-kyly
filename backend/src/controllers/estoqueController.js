const db = require('../config/database');

function mensagemStatusPeca(status) {
  if (status === 'DISPONIVEL') {
    return 'Peca disponivel em estoque.';
  }

  if (status === 'COLETADA') {
    return 'Peca ja coletada e nao esta mais disponivel no estoque.';
  }

  return `Peca com status ${status}.`;
}

async function listarEstoque(req, res) {
  try {
    const busca = req.query.busca ? `%${String(req.query.busca).trim()}%` : null;

    const result = await db.query(
      `with estoque as (
         select
           produto_id,
           count(*)::int as total_disponivel
         from pecas
         where status = 'DISPONIVEL'
         group by produto_id
       ),
       pedidos as (
         select
           produto_id,
           coalesce(sum(quantidade_solicitada), 0)::int as quantidade_solicitada_caixas,
           coalesce(sum(quantidade_coletada), 0)::int as quantidade_coletada_caixas
         from caixa_itens
         group by produto_id
       )
       select
         p.id as produto_id,
         p.referencia,
         p.descricao,
         p.cor,
         p.tamanho,
         p.codigo_sku,
         coalesce(e.total_disponivel, 0) as total_disponivel,
         coalesce(pd.quantidade_solicitada_caixas, 0) as quantidade_solicitada_caixas,
         coalesce(pd.quantidade_coletada_caixas, 0) as quantidade_coletada_caixas,
         coalesce(e.total_disponivel, 0) as saldo_disponivel_estimado
       from produtos p
       left join estoque e on e.produto_id = p.id
       left join pedidos pd on pd.produto_id = p.id
       where p.ativo = true
         and coalesce(e.total_disponivel, 0) > 0
         and (
           $1::text is null
           or p.referencia ilike $1
           or p.descricao ilike $1
           or p.cor ilike $1
           or p.tamanho ilike $1
           or p.codigo_sku ilike $1
           or exists (
             select 1
             from pecas pc_busca
             where pc_busca.produto_id = p.id
               and pc_busca.status = 'DISPONIVEL'
               and (
                 pc_busca.codigo_barras_unico ilike $1
                 or pc_busca.codigo_barras_secundario ilike $1
               )
           )
         )
       order by p.referencia asc, p.cor asc, p.tamanho asc`,
      [busca]
    );

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Erro ao listar estoque:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao listar estoque'
    });
  }
}

async function listarPecasProduto(req, res) {
  try {
    const { produtoId } = req.params;
    const busca = req.query.busca ? `%${String(req.query.busca).trim()}%` : null;

    const result = await db.query(
      `select
         pc.id,
         pc.codigo_barras_unico,
         pc.codigo_barras_secundario,
         pc.status,
         pc.data_criacao,
         pc.data_atualizacao,
         p.id as produto_id,
         p.referencia,
         p.descricao,
         p.cor,
         p.tamanho,
         p.codigo_sku
       from pecas pc
       join produtos p on p.id = pc.produto_id
       where pc.produto_id = $1
         and pc.status = 'DISPONIVEL'
         and (
           $2::text is null
           or pc.codigo_barras_unico ilike $2
           or pc.codigo_barras_secundario ilike $2
         )
       order by pc.id asc`,
      [produtoId, busca]
    );

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Erro ao listar pecas do produto:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao listar pecas do produto'
    });
  }
}

async function buscarPecaPorCodigo(req, res) {
  try {
    const { codigo } = req.params;

    const result = await db.query(
      `select
         pc.id,
         pc.codigo_barras_unico,
         pc.codigo_barras_secundario,
         pc.status,
         pc.data_criacao,
         pc.data_atualizacao,
         p.id as produto_id,
         p.referencia,
         p.descricao,
         p.cor,
         p.tamanho,
         p.codigo_sku,
         ultima.coleta_id,
         ultima.caixa_item_id,
         ultima.codigo_lido,
         ultima.resultado,
         ultima.mensagem,
         ultima.data_hora as data_bipagem,
         c.id as caixa_id,
         c.codigo_papeleta,
         c.numero_caixa,
         c.pedido,
         c.cliente,
         co.status as coleta_status,
         u.id as usuario_id,
         u.nome as usuario_nome
       from pecas pc
       join produtos p on p.id = pc.produto_id
       left join lateral (
         select ci.coleta_id, ci.caixa_item_id, ci.codigo_lido, ci.resultado, ci.mensagem, ci.data_hora
         from coleta_itens ci
         where ci.peca_id = pc.id
         order by ci.data_hora desc, ci.id desc
         limit 1
       ) ultima on true
       left join coletas co on co.id = ultima.coleta_id
       left join caixas c on c.id = co.caixa_id
       left join usuarios u on u.id = co.usuario_id
       where pc.codigo_barras_unico = $1
          or pc.codigo_barras_secundario = $1
       limit 1`,
      [codigo]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Peca nao encontrada'
      });
    }

    const row = result.rows[0];

    return res.json({
      success: true,
      message: mensagemStatusPeca(row.status),
      data: {
        id: row.id,
        codigo_barras_unico: row.codigo_barras_unico,
        codigo_barras_secundario: row.codigo_barras_secundario,
        status: row.status,
        status_mensagem: mensagemStatusPeca(row.status),
        data_criacao: row.data_criacao,
        data_atualizacao: row.data_atualizacao,
        produto: {
          id: row.produto_id,
          referencia: row.referencia,
          descricao: row.descricao,
          cor: row.cor,
          tamanho: row.tamanho,
          codigo_sku: row.codigo_sku
        },
        coleta: row.status === 'COLETADA' && row.coleta_id ? {
          id: row.coleta_id,
          status: row.coleta_status,
          data_bipagem: row.data_bipagem,
          codigo_lido: row.codigo_lido,
          resultado: row.resultado,
          mensagem: row.mensagem,
          caixa: {
            id: row.caixa_id,
            codigo_papeleta: row.codigo_papeleta,
            numero_caixa: row.numero_caixa,
            pedido: row.pedido,
            cliente: row.cliente
          },
          usuario: {
            id: row.usuario_id,
            nome: row.usuario_nome
          }
        } : null
      }
    });
  } catch (error) {
    console.error('Erro ao buscar peca por codigo:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar peca'
    });
  }
}

module.exports = {
  listarEstoque,
  listarPecasProduto,
  buscarPecaPorCodigo
};
