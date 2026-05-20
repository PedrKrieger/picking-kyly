const db = require('../config/database');

async function loginColetor(req, res) {
  try {
    const { codigoSupervisor, codigoUsuario } = req.body;

    if (!codigoSupervisor || !codigoUsuario) {
      return res.status(400).json({
        erro: 'Codigo do supervisor e codigo do usuario sao obrigatorios'
      });
    }

    const supervisorResult = await db.query(
      `select id, nome, codigo_barras, turno, ativo
       from supervisores
       where codigo_barras = $1 and ativo = true
       limit 1`,
      [codigoSupervisor]
    );

    if (supervisorResult.rowCount === 0) {
      return res.status(404).json({
        erro: 'Supervisor nao encontrado ou inativo'
      });
    }

    const usuarioResult = await db.query(
      `select id, nome, codigo_barras, email, perfil, ativo
       from usuarios
       where codigo_barras = $1 and ativo = true
       limit 1`,
      [codigoUsuario]
    );

    if (usuarioResult.rowCount === 0) {
      return res.status(404).json({
        erro: 'Usuario nao encontrado ou inativo'
      });
    }

    return res.json({
      mensagem: 'Login realizado com sucesso',
      supervisor: supervisorResult.rows[0],
      usuario: usuarioResult.rows[0]
    });
  } catch (error) {
    console.error('Erro no login do coletor:', error);
    return res.status(500).json({
      erro: 'Erro ao realizar login no coletor'
    });
  }
}

module.exports = {
  loginColetor
};
