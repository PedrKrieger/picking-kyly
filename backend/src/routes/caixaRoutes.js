const express = require('express');
const caixaController = require('../controllers/caixaController');

const router = express.Router();

router.get('/papeleta/:codigo', caixaController.buscarPorPapeleta);

module.exports = router;
