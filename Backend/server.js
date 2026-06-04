const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const db = require('./config/db');
require('dotenv').config();

const authMiddleware = require('./middlewares/auth');
const apiController = require('./controllers/apiController');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ==========================================
// ROTAS DA API
// ==========================================

// Autenticação
app.post('/api/auth/register', apiController.register);
app.post('/api/auth/login', apiController.login);

// Fazendas (Protegidas)
app.get('/api/fazendas', authMiddleware, apiController.getFazendas);
app.post('/api/fazendas', authMiddleware, apiController.createFazenda);

// Animais (Protegidas)
app.get('/api/animais', authMiddleware, apiController.getAnimais);
app.post('/api/animais', authMiddleware, apiController.createAnimal);
app.put('/api/animais/:id', authMiddleware, apiController.updateAnimal);
app.post('/api/animais/:id/transferir', authMiddleware, apiController.transferirAnimal);

// Relatórios
app.get('/api/relatorios/rebanho/pdf/:fazendaId', authMiddleware, apiController.generateRelatorioRebanho);

// Middleware de Tratamento de Erros Global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
});

// ==========================================
// CRON JOBS (Substitui o EVENT do MySQL)
// ==========================================
// Executa todos os dias à meia-noite
cron.schedule('0 0 * * *', async () => {
  console.log('⏳ Executando Recálculo de Métricas do Dashboard...');
  try {
    await db.query(`
      INSERT INTO dashboard_metricas_fazenda (fazenda_id, total_animais, media_dep_leite, media_dep_peso, media_consanguinidade)
      SELECT 
          fazenda_id,
          COUNT(id) as total_animais,
          AVG(dep_leite_kg) as media_dep_leite,
          AVG(dep_peso_kg) as media_dep_peso,
          AVG(coeficiente_consanguinidade) as media_consanguinidade
      FROM animais
      WHERE status <> 'Descartado'
      GROUP BY fazenda_id
      ON CONFLICT (fazenda_id) DO UPDATE SET
          total_animais = EXCLUDED.total_animais,
          media_dep_leite = EXCLUDED.media_dep_leite,
          media_dep_peso = EXCLUDED.media_dep_peso,
          media_consanguinidade = EXCLUDED.media_consanguinidade,
          ultima_atualizacao = CURRENT_TIMESTAMP;
    `);
    console.log('✅ Métricas do Dashboard atualizadas com sucesso.');
  } catch (error) {
    console.error('❌ Erro ao atualizar métricas:', error.message);
  }
});

// Iniciar Servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor Gametech rodando na porta ${PORT}`);
});