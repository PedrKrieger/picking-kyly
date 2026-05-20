const db = require('../config/database');

function criarErro(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function montarItem(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    caixa_id: row.caixa_id,
    produto_id: row.produto_id,
    endereco_id: row.endereco_id,
    quantidade_solicitada: row.quantidade_solicitada,
    quantidade_coletada: row.quantidade_coletada,
    status: row.status,
    ordem_coleta: row.ordem_coleta,
    produto: {
      id: row.produto_id,
      referencia: row.referencia,
      descricao: row.produto_descricao,
      cor: row.cor,
      tamanho: row.tamanho,
      codigo_sku: row.codigo_sku
    },
    endereco: {
      id: row.endereco_id,
      codigo: row.endereco_codigo,
      andar_rua: row.andar_rua,
      secao: row.secao,
      posicao_nivel: row.posicao_nivel,
      descricao: row.endereco_descricao
    }
  };
}

async function buscarColeta(client, coletaId, usarLock = false) {
  const lock = usarLock ? 'for update' : '';
  const result = await client.query(
    `select id, caixa_id, usuario_id, supervisor_id, status, inicio, fim, observacao
     from coletas
     where id = $1
     ${lock}`,
    [coletaId]
  );

  if (result.rowCount === 0) {
    throw criarErro('Coleta nao encontrada', 404);
  }

  return result.rows[0];
}

async function buscarProximoItemDaCaixa(client, caixaId, usarLock = false, ignorarCaixaItemId = null) {
  const lock = usarLock ? 'for update of ci' : '';
  const result = await client.query(
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
       and ci.status in ('PENDENTE', 'EM_COLETA', 'PARCIAL')
       and ci.quantidade_coletada < ci.quantidade_solicitada
       and ($2::bigint is null or ci.id <> $2)
     order by ci.ordem_coleta asc, ci.id asc
     limit 1
     ${lock}`,
    [caixaId, ignorarCaixaItemId]
  );

  return montarItem(result.rows[0]);
}

async function registrarBipagem(client, dados) {
  const {
    coletaId,
    caixaItemId,
    pecaId,
    codigoLido,
    resultado,
    mensagem
  } = dados;

  const result = await client.query(
    `insert into coleta_itens
       (coleta_id, caixa_item_id, peca_id, codigo_lido, resultado, mensagem,
        data_hora, data_criacao, data_atualizacao)
     values ($1, $2, $3, $4, $5, $6, now(), now(), now())
     returning id, coleta_id, caixa_item_id, peca_id, codigo_lido, resultado, mensagem, data_hora`,
    [coletaId, caixaItemId, pecaId, codigoLido, resultado, mensagem]
  );

  return result.rows[0];
}

async function iniciarColeta(caixaId, usuarioId, supervisorId) {
  const client = await db.getClient();

  try {
    await client.query('begin');

    const caixaResult = await client.query(
      `select id, status
       from caixas
       where id = $1
       for update`,
      [caixaId]
    );

    if (caixaResult.rowCount === 0) {
      throw criarErro('Caixa nao encontrada', 404);
    }

    const existenteResult = await client.query(
      `select id, caixa_id, usuario_id, supervisor_id, status, inicio, fim, observacao
       from coletas
       where caixa_id = $1 and status = 'ABERTA'
       order by inicio desc, id desc
       limit 1`,
      [caixaId]
    );

    if (existenteResult.rowCount > 0) {
      await client.query('commit');
      return {
        mensagem: 'Coleta aberta ja existente',
        existente: true,
        coleta: existenteResult.rows[0]
      };
    }

    const coletaResult = await client.query(
      `insert into coletas
         (caixa_id, usuario_id, supervisor_id, status, inicio, data_criacao, data_atualizacao)
       values ($1, $2, $3, 'ABERTA', now(), now(), now())
       returning id, caixa_id, usuario_id, supervisor_id, status, inicio, fim, observacao`,
      [caixaId, usuarioId, supervisorId]
    );

    await client.query(
      `update caixas
       set status = 'EM_COLETA',
           usuario_responsavel_id = $1,
           supervisor_id = $2,
           data_abertura = coalesce(data_abertura, now()),
           data_atualizacao = now()
       where id = $3`,
      [usuarioId, supervisorId, caixaId]
    );

    await client.query('commit');

    return {
      mensagem: 'Coleta iniciada com sucesso',
      existente: false,
      coleta: coletaResult.rows[0]
    };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function buscarProximoItem(coletaId) {
  const client = await db.getClient();

  try {
    const coleta = await buscarColeta(client, coletaId);
    return buscarProximoItemDaCaixa(client, coleta.caixa_id);
  } finally {
    client.release();
  }
}

async function biparPeca(coletaId, codigoPeca) {
  const client = await db.getClient();

  try {
    await client.query('begin');

    const coleta = await buscarColeta(client, coletaId, true);

    if (coleta.status !== 'ABERTA') {
      throw criarErro('Esta coleta nao esta aberta');
    }

    const proximoItem = await buscarProximoItemDaCaixa(client, coleta.caixa_id, true);

    if (!proximoItem) {
      throw criarErro('Nao ha item pendente para bipagem');
    }

    const pecaResult = await client.query(
      `select id, codigo_barras_unico, codigo_barras_secundario, produto_id, status
       from pecas
       where codigo_barras_unico = $1
       limit 1
       for update`,
      [codigoPeca]
    );

    if (pecaResult.rowCount === 0) {
      const registro = await registrarBipagem(client, {
        coletaId,
        caixaItemId: proximoItem.id,
        pecaId: null,
        codigoLido: codigoPeca,
        resultado: 'SKU_INVALIDO',
        mensagem: 'Peca nao cadastrada'
      });

      await client.query('commit');

      return {
        sucesso: false,
        resultado: 'SKU_INVALIDO',
        mensagem: 'Peca nao cadastrada',
        registro,
        proximoItem
      };
    }

    const peca = pecaResult.rows[0];

    if (peca.status !== 'DISPONIVEL') {
      const registro = await registrarBipagem(client, {
        coletaId,
        caixaItemId: proximoItem.id,
        pecaId: peca.id,
        codigoLido: codigoPeca,
        resultado: 'PECA_SEM_SALDO',
        mensagem: 'Peca sem saldo'
      });

      await client.query('commit');

      return {
        sucesso: false,
        resultado: 'PECA_SEM_SALDO',
        mensagem: 'Peca sem saldo',
        registro,
        proximoItem
      };
    }

    if (peca.produto_id !== proximoItem.produto_id) {
      const registro = await registrarBipagem(client, {
        coletaId,
        caixaItemId: proximoItem.id,
        pecaId: peca.id,
        codigoLido: codigoPeca,
        resultado: 'SKU_INVALIDO',
        mensagem: 'SKU nao pertence a caixa'
      });

      await client.query('commit');

      return {
        sucesso: false,
        resultado: 'SKU_INVALIDO',
        mensagem: 'SKU nao pertence a caixa',
        registro,
        proximoItem
      };
    }

    if (proximoItem.quantidade_coletada >= proximoItem.quantidade_solicitada) {
      const registro = await registrarBipagem(client, {
        coletaId,
        caixaItemId: proximoItem.id,
        pecaId: peca.id,
        codigoLido: codigoPeca,
        resultado: 'QUANTIDADE_EXCEDIDA',
        mensagem: 'Quantidade solicitada ja atendida'
      });

      await client.query('commit');

      return {
        sucesso: false,
        resultado: 'QUANTIDADE_EXCEDIDA',
        mensagem: 'Quantidade solicitada ja atendida',
        registro,
        proximoItem
      };
    }

    const itemAtualizadoResult = await client.query(
      `update caixa_itens
       set quantidade_coletada = quantidade_coletada + 1,
           status = case
             when quantidade_coletada + 1 >= quantidade_solicitada then 'COLETADO'
             else 'EM_COLETA'
           end,
           data_atualizacao = now()
       where id = $1
       returning id, quantidade_solicitada, quantidade_coletada, status`,
      [proximoItem.id]
    );

    await client.query(
      `update pecas
       set status = 'COLETADA',
           data_atualizacao = now()
       where id = $1`,
      [peca.id]
    );

    const registro = await registrarBipagem(client, {
      coletaId,
      caixaItemId: proximoItem.id,
      pecaId: peca.id,
      codigoLido: codigoPeca,
      resultado: 'SUCESSO',
      mensagem: 'Peca coletada com sucesso'
    });

    const itemAtualizado = itemAtualizadoResult.rows[0];
    const itemFinalizado = itemAtualizado.status === 'COLETADO';
    const proximoItemDepois = await buscarProximoItemDaCaixa(client, coleta.caixa_id);

    await client.query('commit');

    return {
      sucesso: true,
      resultado: 'SUCESSO',
      mensagem: itemFinalizado
        ? 'SKU finalizada, seguindo para o proximo endereco'
        : 'Peca coletada com sucesso',
      itemAtualizado,
      registro,
      proximoItem: proximoItemDepois
    };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function pularItem(coletaId, caixaItemId, motivo) {
  const client = await db.getClient();

  try {
    await client.query('begin');

    const coleta = await buscarColeta(client, coletaId, true);

    if (coleta.status !== 'ABERTA') {
      throw criarErro('Esta coleta nao esta aberta');
    }

    const itemResult = await client.query(
      `select id, caixa_id, quantidade_solicitada, quantidade_coletada
       from caixa_itens
       where id = $1 and caixa_id = $2
       for update`,
      [caixaItemId, coleta.caixa_id]
    );

    if (itemResult.rowCount === 0) {
      throw criarErro('Item da caixa nao encontrado nesta coleta', 404);
    }

    const item = itemResult.rows[0];
    const quantidadeColetada = Number(item.quantidade_coletada || 0);
    const quantidadeSolicitada = Number(item.quantidade_solicitada || 0);
    const novoStatus = quantidadeColetada > 0 && quantidadeColetada < quantidadeSolicitada
      ? 'PARCIAL'
      : 'PULADO';
    const codigoLido = `ITEM_PULADO_${caixaItemId}`;
    const mensagemPulo = motivo || 'Item pulado pelo operador';

    await client.query(
      `update caixa_itens
       set status = $1,
           data_atualizacao = now()
       where id = $2`,
      [novoStatus, caixaItemId]
    );

    await client.query(
      `insert into ocorrencias
         (caixa_id, caixa_item_id, peca_id, usuario_id, tipo, descricao,
          data_hora, data_criacao, data_atualizacao)
       values ($1, $2, null, $3, 'FALTA_ESTOQUE', $4, now(), now(), now())`,
      [coleta.caixa_id, caixaItemId, coleta.usuario_id, mensagemPulo]
    );

    const registro = await registrarBipagem(client, {
      coletaId,
      caixaItemId,
      pecaId: null,
      codigoLido,
      resultado: 'ITEM_PULADO',
      mensagem: mensagemPulo
    });

    const proximoItem = await buscarProximoItemDaCaixa(client, coleta.caixa_id, false, caixaItemId);

    await client.query('commit');

    return {
      mensagem: proximoItem ? 'Item pulado com sucesso' : 'Sem item pendente. Finalize a caixa.',
      statusItem: novoStatus,
      registro,
      proximoItem
    };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function finalizarColeta(coletaId) {
  const client = await db.getClient();

  try {
    await client.query('begin');

    const coleta = await buscarColeta(client, coletaId, true);

    const pendentesResult = await client.query(
      `select count(*)::int as total
       from caixa_itens
       where caixa_id = $1
         and status <> 'COLETADO'`,
      [coleta.caixa_id]
    );

    const todosColetados = pendentesResult.rows[0].total === 0;
    const statusFinal = todosColetados ? 'FINALIZADA' : 'PARCIAL';
    const mensagem = todosColetados ? 'Caixa finalizada' : 'Caixa com picking parcial';

    const coletaResult = await client.query(
      `update coletas
       set status = $1,
           fim = now(),
           data_atualizacao = now()
       where id = $2
       returning id, caixa_id, usuario_id, supervisor_id, status, inicio, fim, observacao`,
      [statusFinal, coletaId]
    );

    const caixaResult = await client.query(
      `update caixas
       set status = $1,
           data_finalizacao = now(),
           data_atualizacao = now()
       where id = $2
       returning id, codigo_papeleta, numero_caixa, pedido, cliente, status, data_finalizacao`,
      [statusFinal, coleta.caixa_id]
    );

    await client.query('commit');

    return {
      mensagem,
      coleta: coletaResult.rows[0],
      caixa: caixaResult.rows[0]
    };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function salvarParcial(coletaId, observacao) {
  const client = await db.getClient();

  try {
    await client.query('begin');

    const coleta = await buscarColeta(client, coletaId, true);

    const coletaResult = await client.query(
      `update coletas
       set status = 'PARCIAL',
           observacao = $1,
           fim = now(),
           data_atualizacao = now()
       where id = $2
       returning id, caixa_id, usuario_id, supervisor_id, status, inicio, fim, observacao`,
      [observacao || null, coletaId]
    );

    const caixaResult = await client.query(
      `update caixas
       set status = 'PARCIAL',
           data_finalizacao = now(),
           data_atualizacao = now()
       where id = $1
       returning id, codigo_papeleta, numero_caixa, pedido, cliente, status, data_finalizacao`,
      [coleta.caixa_id]
    );

    await client.query('commit');

    return {
      mensagem: 'Caixa salva como picking parcial',
      coleta: coletaResult.rows[0],
      caixa: caixaResult.rows[0]
    };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  iniciarColeta,
  buscarProximoItem,
  biparPeca,
  pularItem,
  finalizarColeta,
  salvarParcial
};
