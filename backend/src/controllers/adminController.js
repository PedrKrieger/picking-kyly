const db = require('../config/database');

async function dashboard(req, res) {
  try {
    const caixasResult = await db.query(
      `select
         count(*)::int as total_caixas,
         count(*) filter (where status = 'AGUARDANDO')::int as total_caixas_aguardando,
         count(*) filter (where status = 'EM_COLETA')::int as total_caixas_em_coleta,
         count(*) filter (where status = 'FINALIZADA')::int as total_caixas_finalizadas,
         count(*) filter (where status = 'PARCIAL')::int as total_caixas_parciais
       from caixas`
    );

    const pecasResult = await db.query(
      `select count(*)::int as total_pecas_coletadas
       from pecas
       where status = 'COLETADA'`
    );

    const ocorrenciasResult = await db.query(
      `select count(*)::int as total_ocorrencias
       from ocorrencias`
    );

    return res.json({
      ...caixasResult.rows[0],
      total_pecas_coletadas: pecasResult.rows[0].total_pecas_coletadas,
      total_ocorrencias: ocorrenciasResult.rows[0].total_ocorrencias
    });
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
    return res.status(500).json({
      erro: 'Erro ao carregar dashboard'
    });
  }
}

async function listarCaixas(req, res) {
  try {
    const result = await db.query(
      `select
         c.id,
         c.codigo_papeleta,
         c.numero_caixa,
         c.pedido,
         c.cliente,
         c.status,
         count(ci.id)::int as quantidade_itens,
         coalesce(sum(ci.quantidade_solicitada), 0)::int as quantidade_solicitada,
         coalesce(sum(ci.quantidade_coletada), 0)::int as quantidade_coletada,
         case
           when coalesce(sum(ci.quantidade_solicitada), 0) = 0 then 0
           else round(
             (coalesce(sum(ci.quantidade_coletada), 0)::numeric
              / nullif(sum(ci.quantidade_solicitada), 0)::numeric) * 100,
             2
           )
         end as percentual_progresso
       from caixas c
       left join caixa_itens ci on ci.caixa_id = c.id
       group by c.id
       order by c.data_criacao desc, c.id desc`
    );

    return res.json({
      caixas: result.rows
    });
  } catch (error) {
    console.error('Erro ao listar caixas:', error);
    return res.status(500).json({
      erro: 'Erro ao listar caixas'
    });
  }
}

async function listarOcorrencias(req, res) {
  try {
    const result = await db.query(
      `select
         o.id,
         o.tipo,
         o.descricao,
         o.data_hora,
         c.id as caixa_id,
         c.codigo_papeleta,
         c.numero_caixa,
         c.pedido,
         c.cliente,
         p.id as produto_id,
         p.referencia,
         p.descricao as produto_descricao,
         p.cor,
         p.tamanho,
         u.id as usuario_id,
         u.nome as usuario_nome
       from ocorrencias o
       join caixas c on c.id = o.caixa_id
       left join caixa_itens ci on ci.id = o.caixa_item_id
       left join produtos p on p.id = ci.produto_id
       left join usuarios u on u.id = o.usuario_id
       order by o.data_hora desc, o.id desc`
    );

    return res.json({
      ocorrencias: result.rows
    });
  } catch (error) {
    console.error('Erro ao listar ocorrencias:', error);
    return res.status(500).json({
      erro: 'Erro ao listar ocorrencias'
    });
  }
}

module.exports = {
  dashboard,
  listarCaixas,
  listarOcorrencias
};
