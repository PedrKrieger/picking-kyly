const express = require('express');
const estoqueController = require('../controllers/estoqueController');

const router = express.Router();

router.get('/', estoqueController.listarEstoque);
router.get('/produto/:produtoId/pecas', estoqueController.listarPecasProduto);
router.get('/peca/:codigo', estoqueController.buscarPecaPorCodigo);

module.exports = router;
