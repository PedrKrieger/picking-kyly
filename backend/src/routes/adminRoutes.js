const express = require('express');
const adminController = require('../controllers/adminController');

const router = express.Router();

router.get('/dashboard', adminController.dashboard);
router.get('/caixas', adminController.listarCaixas);
router.get('/ocorrencias', adminController.listarOcorrencias);

module.exports = router;
