const express = require('express');
const coletaController = require('../controllers/coletaController');

const router = express.Router();

router.post('/iniciar', coletaController.iniciar);
router.get('/:coletaId/proximo-item', coletaController.buscarProximoItem);
router.post('/bipar-peca', coletaController.biparPeca);
router.post('/pular-item', coletaController.pularItem);
router.post('/finalizar', coletaController.finalizar);
router.post('/salvar-parcial', coletaController.salvarParcial);

module.exports = router;
