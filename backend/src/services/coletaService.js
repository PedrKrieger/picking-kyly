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
    caixa_item_id: row.id,
    caixa_id: row.caixa_id,
    produto_id: row.produto_id,
    endereco_id: row.endereco_id,
    referencia: row.referencia,
    descricao: row.produto_descricao,
    cor: row.cor,
    tamanho: row.tamanho,
    codigo_sku: row.codigo_sku,
    endereco: row.endereco_codigo,
    andar_rua: row.andar_rua,
    secao: row.secao,
    posicao_nivel: row.posicao_nivel,
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
    endereco_detalhe: {
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
       and ci.quantidade_coletada < ci.quantidade_solicitada
       and ci.status in ('PENDENTE', 'EM_COLETA', 'PARCIAL', 'PULADO')
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

    const caixa = caixaResult.rows[0];

    const existenteResult = await client.query(
      `select id, caixa_id, usuario_id, supervisor_id, status, inicio, fim, observacao
       from coletas
       where caixa_id = $1 and status = 'ABERTA'
       order by inicio desc, id desc
       limit 1`,
      [caixaId]
    );

    if (existenteResult.rowCount > 0) {
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
        mensagem: 'Coleta aberta ja existente',
        existente: true,
        coleta: existenteResult.rows[0]
      };
    }

    if (caixa.status === 'PARCIAL') {
      await client.query(
        `update caixa_itens
         set status = 'PENDENTE',
             data_atualizacao = current_timestamp
         where caixa_id = $1
           and status = 'PULADO'
           and quantidade_coletada < quantidade_solicitada`,
        [caixaId]
      );
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

async function biparPeca(coletaId, caixaItemId, codigoPeca) {
  const client = await db.getClient();
  const coletaIdNumerico = Number(coletaId);
  const caixaItemIdNumerico = Number(caixaItemId);

  try {
    await client.query('begin');

    const coleta = await buscarColeta(client, coletaIdNumerico, true);

    if (coleta.status !== 'ABERTA') {
      throw criarErro('Esta coleta nao esta aberta');
    }

    const caixaItemResult = await client.query(
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
       where ci.id = $1
       for update of ci`,
      [caixaItemIdNumerico]
    );

    if (caixaItemResult.rowCount === 0) {
      throw criarErro('Item da caixa nao encontrado', 404);
    }

    const caixaItem = montarItem(caixaItemResult.rows[0]);

    if (Number(caixaItem.caixa_id) !== Number(coleta.caixa_id)) {
      throw criarErro('Item nao pertence a caixa desta coleta');
    }

    if (Number(caixaItem.quantidade_coletada || 0) >= Number(caixaItem.quantidade_solicitada || 0)) {
      const registro = await registrarBipagem(client, {
        coletaId: coletaIdNumerico,
        caixaItemId: caixaItem.id,
        pecaId: null,
        codigoLido: codigoPeca,
        resultado: 'QUANTIDADE_EXCEDIDA',
        mensagem: 'Item ja coletado'
      });

      await client.query('commit');

      return {
        success: false,
        sucesso: false,
        resultado: 'QUANTIDADE_EXCEDIDA',
        message: 'Item ja coletado',
        mensagem: 'Item ja coletado',
        registro
      };
    }

    const pecaResult = await client.query(
      `select id, codigo_barras_unico, codigo_barras_secundario, produto_id, status
       from pecas
       where codigo_barras_unico = $1
          or codigo_barras_secundario = $1
       limit 1
       for update`,
      [codigoPeca]
    );

    if (pecaResult.rowCount === 0) {
      const registro = await registrarBipagem(client, {
        coletaId: coletaIdNumerico,
        caixaItemId: caixaItem.id,
        pecaId: null,
        codigoLido: codigoPeca,
        resultado: 'SKU_INVALIDO',
        mensagem: 'Peca nao cadastrada'
      });

      await client.query('commit');

      return {
        success: false,
        sucesso: false,
        resultado: 'SKU_INVALIDO',
        message: 'Peca nao cadastrada',
        mensagem: 'Peca nao cadastrada',
        registro
      };
    }

    const peca = pecaResult.rows[0];

    if (peca.status !== 'DISPONIVEL') {
      const registro = await registrarBipagem(client, {
        coletaId: coletaIdNumerico,
        caixaItemId: caixaItem.id,
        pecaId: peca.id,
        codigoLido: codigoPeca,
        resultado: 'PECA_SEM_SALDO',
        mensagem: 'Peca sem saldo'
      });

      await client.query('commit');

      return {
        success: false,
        sucesso: false,
        resultado: 'PECA_SEM_SALDO',
        message: 'Peca sem saldo',
        mensagem: 'Peca sem saldo',
        registro
      };
    }

    if (Number(peca.produto_id) !== Number(caixaItem.produto_id)) {
      const registro = await registrarBipagem(client, {
        coletaId: coletaIdNumerico,
        caixaItemId: caixaItem.id,
        pecaId: peca.id,
        codigoLido: codigoPeca,
        resultado: 'SKU_INVALIDO',
        mensagem: 'SKU nao pertence a caixa'
      });

      await client.query('commit');

      return {
        success: false,
        sucesso: false,
        resultado: 'SKU_INVALIDO',
        message: 'SKU nao pertence a caixa',
        mensagem: 'SKU nao pertence a caixa',
        registro
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
      [caixaItem.id]
    );

    await client.query(
      `update pecas
       set status = 'COLETADA',
           data_atualizacao = now()
       where id = $1`,
      [peca.id]
    );

    const registro = await registrarBipagem(client, {
      coletaId: coletaIdNumerico,
      caixaItemId: caixaItem.id,
      pecaId: peca.id,
      codigoLido: codigoPeca,
      resultado: 'SUCESSO',
      mensagem: 'Peca coletada com sucesso'
    });

    const itemAtualizado = itemAtualizadoResult.rows[0];
    const itemFinalizado = itemAtualizado.status === 'COLETADO';
    const proximoItemDepois = await buscarProximoItemDaCaixa(client, coleta.caixa_id);
    const mensagemSucesso = proximoItemDepois
      ? 'Peca coletada com sucesso'
      : 'Peca coletada com sucesso. Sem item pendente. Finalize a caixa.';

    await client.query('commit');

    return {
      success: true,
      sucesso: true,
      resultado: 'SUCESSO',
      message: mensagemSucesso,
      mensagem: mensagemSucesso,
      itemFinalizado,
      temProximoItem: Boolean(proximoItemDepois),
      temItem: Boolean(proximoItemDepois),
      item: proximoItemDepois,
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

    const ordemResult = await client.query(
      `select coalesce(max(ordem_coleta), 0)::int as maior_ordem
       from caixa_itens
       where caixa_id = $1`,
      [coleta.caixa_id]
    );
    const novaOrdem = Number(ordemResult.rows[0].maior_ordem || 0) + 1;

    await client.query(
      `update caixa_itens
       set status = $1,
           ordem_coleta = $2,
           data_atualizacao = current_timestamp
       where id = $3`,
      [novoStatus, novaOrdem, caixaItemId]
    );

    const ocorrenciaExistenteResult = await client.query(
      `select id
       from ocorrencias
       where caixa_id = $1
         and caixa_item_id = $2
         and tipo = 'FALTA_ESTOQUE'
       limit 1`,
      [coleta.caixa_id, caixaItemId]
    );

    if (ocorrenciaExistenteResult.rowCount === 0) {
      await client.query(
        `insert into ocorrencias
           (caixa_id, caixa_item_id, peca_id, usuario_id, tipo, descricao,
            data_hora, data_criacao, data_atualizacao)
         values ($1, $2, null, $3, 'FALTA_ESTOQUE', $4, now(), now(), now())`,
        [coleta.caixa_id, caixaItemId, coleta.usuario_id, mensagemPulo]
      );
    }

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
      success: true,
      message: proximoItem
        ? 'Item pulado com sucesso'
        : 'Item pulado com sucesso. Sem item pendente. Finalize a caixa.',
      mensagem: proximoItem
        ? 'Item pulado com sucesso'
        : 'Item pulado com sucesso. Sem item pendente. Finalize a caixa.',
      temItem: Boolean(proximoItem),
      item: proximoItem,
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
  const coletaIdNumerico = Number(coletaId);

  try {
    await client.query('begin');

    const coleta = await buscarColeta(client, coletaIdNumerico, true);
    const caixaId = Number(coleta.caixa_id);

    const pendentesResult = await client.query(
      `select count(*)::int as pendentes
       from caixa_itens
       where caixa_id = $1
         and quantidade_coletada < quantidade_solicitada`,
      [caixaId]
    );

    const pendentes = Number(pendentesResult.rows[0].pendentes || 0);

    if (pendentes === 0) {
      const coletaResult = await client.query(
        `update coletas
         set status = 'FINALIZADA',
             fim = current_timestamp,
             data_atualizacao = current_timestamp
         where id = $1
         returning id, caixa_id, usuario_id, supervisor_id, status, inicio, fim, observacao`,
        [coletaIdNumerico]
      );

      const caixaResult = await client.query(
        `update caixas
         set status = 'FINALIZADA',
             data_finalizacao = current_timestamp,
             data_atualizacao = current_timestamp
         where id = $1
         returning id, codigo_papeleta, numero_caixa, pedido, cliente, status, data_finalizacao`,
        [caixaId]
      );

      await client.query('commit');

      return {
        success: true,
        status: 'FINALIZADA',
        message: 'Caixa finalizada',
        mensagem: 'Caixa finalizada',
        coleta: coletaResult.rows[0],
        caixa: caixaResult.rows[0]
      };
    }

    const coletaResult = await client.query(
      `update coletas
       set status = 'PARCIAL',
           fim = current_timestamp,
           data_atualizacao = current_timestamp
       where id = $1
       returning id, caixa_id, usuario_id, supervisor_id, status, inicio, fim, observacao`,
      [coletaIdNumerico]
    );

    const caixaResult = await client.query(
      `update caixas
       set status = 'PARCIAL',
           data_atualizacao = current_timestamp
       where id = $1
       returning id, codigo_papeleta, numero_caixa, pedido, cliente, status, data_finalizacao`,
      [caixaId]
    );

    await client.query('commit');

    return {
      success: true,
      status: 'PARCIAL',
      message: 'Caixa com picking parcial',
      mensagem: 'Caixa com picking parcial',
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
