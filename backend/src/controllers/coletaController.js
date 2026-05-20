const coletaService = require('../services/coletaService');

async function iniciar(req, res) {
  try {
    const { caixaId, usuarioId, supervisorId } = req.body;

    if (!caixaId || !usuarioId || !supervisorId) {
      return res.status(400).json({
        erro: 'caixaId, usuarioId e supervisorId sao obrigatorios'
      });
    }

    const resultado = await coletaService.iniciarColeta(caixaId, usuarioId, supervisorId);
    return res.status(resultado.existente ? 200 : 201).json(resultado);
  } catch (error) {
    console.error('Erro ao iniciar coleta:', error);
    return res.status(error.statusCode || 500).json({
      erro: error.message || 'Erro ao iniciar coleta'
    });
  }
}

async function buscarProximoItem(req, res) {
  try {
    const { coletaId } = req.params;

    const proximoItem = await coletaService.buscarProximoItem(coletaId);

    if (!proximoItem) {
      return res.json({
        mensagem: 'Nao ha proximo item. A coleta pode ser finalizada.',
        proximoItem: null
      });
    }

    return res.json({
      proximoItem
    });
  } catch (error) {
    console.error('Erro ao buscar proximo item:', error);
    return res.status(error.statusCode || 500).json({
      erro: error.message || 'Erro ao buscar proximo item'
    });
  }
}

async function biparPeca(req, res) {
  try {
    const { coletaId, codigoPeca } = req.body;

    if (!coletaId || !codigoPeca) {
      return res.status(400).json({
        erro: 'coletaId e codigoPeca sao obrigatorios'
      });
    }

    const resultado = await coletaService.biparPeca(coletaId, codigoPeca);

    if (!resultado.sucesso) {
      return res.status(400).json(resultado);
    }

    return res.json(resultado);
  } catch (error) {
    console.error('Erro ao bipar peca:', error);
    return res.status(error.statusCode || 500).json({
      erro: error.message || 'Erro ao bipar peca'
    });
  }
}

async function pularItem(req, res) {
  try {
    const { coletaId, caixaItemId, motivo } = req.body;

    if (!coletaId || !caixaItemId || !motivo) {
      return res.status(400).json({
        erro: 'coletaId, caixaItemId e motivo sao obrigatorios'
      });
    }

    const resultado = await coletaService.pularItem(coletaId, caixaItemId, motivo);
    return res.json(resultado);
  } catch (error) {
    console.error('Erro ao pular item:', error);
    return res.status(error.statusCode || 500).json({
      erro: error.message || 'Erro ao pular item'
    });
  }
}

async function finalizar(req, res) {
  try {
    const { coletaId } = req.body;

    if (!coletaId) {
      return res.status(400).json({
        erro: 'coletaId e obrigatorio'
      });
    }

    const resultado = await coletaService.finalizarColeta(coletaId);
    return res.json(resultado);
  } catch (error) {
    console.error('Erro ao finalizar coleta:', error);
    return res.status(error.statusCode || 500).json({
      erro: error.message || 'Erro ao finalizar coleta'
    });
  }
}

async function salvarParcial(req, res) {
  try {
    const { coletaId, observacao } = req.body;

    if (!coletaId) {
      return res.status(400).json({
        erro: 'coletaId e obrigatorio'
      });
    }

    const resultado = await coletaService.salvarParcial(coletaId, observacao);
    return res.json(resultado);
  } catch (error) {
    console.error('Erro ao salvar parcial:', error);
    return res.status(error.statusCode || 500).json({
      erro: error.message || 'Erro ao salvar parcial'
    });
  }
}

module.exports = {
  iniciar,
  buscarProximoItem,
  biparPeca,
  pularItem,
  finalizar,
  salvarParcial
};
