const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const caixaRoutes = require('./routes/caixaRoutes');
const coletaRoutes = require('./routes/coletaRoutes');
const adminRoutes = require('./routes/adminRoutes');
const estoqueRoutes = require('./routes/estoqueRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    mensagem: 'API do sistema de picking por coletor de codigo de barras'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/caixas', caixaRoutes);
app.use('/api/coletas', coletaRoutes);
app.use('/api/admin/estoque', estoqueRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).json({
    erro: 'Rota nao encontrada'
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    erro: 'Erro interno do servidor'
  });
});

module.exports = app;
