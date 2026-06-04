const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');

// ==========================================
// AUTH CONTROLLER
// ==========================================
exports.register = async (req, res) => {
  const { nome, email, senha, cpf } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);
    
    const result = await db.query(
      'INSERT INTO usuarios (nome, email, senha_hash, cpf) VALUES ($1, $2, $3, $4) RETURNING id, nome, email',
      [nome, email, senhaHash, cpf]
    );
    res.status(201).json({ message: 'Usuário criado com sucesso', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao registrar usuário', details: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, senha } = req.body;
  try {
    const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'Credenciais inválidas' });

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(senha, user.senha_hash);
    if (!isMatch) return res.status(400).json({ error: 'Credenciais inválidas' });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    
    delete user.senha_hash; // Remove a senha antes de devolver pro frontend
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: 'Erro no login', details: err.message });
  }
};

// ==========================================
// FAZENDAS CONTROLLER
// ==========================================
exports.getFazendas = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM fazendas WHERE usuario_id = $1', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createFazenda = async (req, res) => {
  const { nome, cnpj, cep, endereco, cidade, estado, area } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO fazendas (usuario_id, nome, cnpj, cep, endereco, cidade, estado, area) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.user.id, nome, cnpj, cep, endereco, cidade, estado, area]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// ANIMAIS CONTROLLER
// ==========================================
exports.getAnimais = async (req, res) => {
  const { fazendaId } = req.query;
  try {
    // Valida se a fazenda pertence ao usuário
    const checkFazenda = await db.query('SELECT id FROM fazendas WHERE id = $1 AND usuario_id = $2', [fazendaId, req.user.id]);
    if (checkFazenda.rows.length === 0) return res.status(403).json({ error: 'Acesso negado à fazenda.' });

    const result = await db.query('SELECT * FROM animais WHERE fazenda_id = $1 ORDER BY criado_em DESC', [fazendaId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createAnimal = async (req, res) => {
  const { id, fazenda_id, especie, raca, sexo, dataNascimento, peso, status, pai, mae, ecc, saude } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO animais (id, fazenda_id, especie, raca, sexo, data_nascimento, peso, status, pai_id, mae_id, ecc, saude, historico_peso) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [id, fazenda_id, especie, raca, sexo, dataNascimento, peso, status, pai || null, mae || null, ecc, saude, JSON.stringify([peso])]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateAnimal = async (req, res) => {
  const { id } = req.params;
  const { peso, status, ecc, saude, isFavorito, foto } = req.body;
  
  try {
    // Busca peso antigo para atualizar histórico
    const animal = await db.query('SELECT historico_peso FROM animais WHERE id = $1', [id]);
    let historico = animal.rows[0].historico_peso || [];
    if(peso) historico.push(peso);

    const result = await db.query(
      `UPDATE animais SET peso = $1, status = $2, ecc = $3, saude = $4, is_favorito = $5, foto = $6, historico_peso = $7, atualizado_em = CURRENT_TIMESTAMP 
       WHERE id = $8 RETURNING *`,
      [peso, status, ecc, saude, isFavorito, foto, JSON.stringify(historico), id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.transferirAnimal = async (req, res) => {
  const { id } = req.params;
  const { novaFazendaId } = req.body;
  try {
    const result = await db.query('UPDATE animais SET fazenda_id = $1 WHERE id = $2 RETURNING *', [novaFazendaId, id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// RELATÓRIOS CONTROLLER (PDF Generator)
// ==========================================
exports.generateRelatorioRebanho = async (req, res) => {
  const { fazendaId } = req.params;
  try {
    const animais = await db.query('SELECT id, especie, raca, peso, status FROM animais WHERE fazenda_id = $1', [fazendaId]);
    
    const doc = new PDFDocument({ margin: 50 });
    
    // Configura Headers para forçar download do PDF
    res.setHeader('Content-disposition', `attachment; filename=Relatorio_Rebanho_Fazenda_${fazendaId}.pdf`);
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    // Cabeçalho
    doc.fontSize(20).text('Relatório Zootécnico de Rebanho', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Data da Emissão: ${new Date().toLocaleDateString('pt-BR')}`);
    doc.text(`Total de Animais: ${animais.rows.length}`);
    doc.moveDown(2);

    // Tabela Simples
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Brinco / ID', 50, doc.y, { continued: true }).text('Espécie / Raça', 150, doc.y, { continued: true }).text('Peso (kg)', 350, doc.y, { continued: true }).text('Status', 450, doc.y);
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    doc.font('Helvetica');
    animais.rows.forEach(a => {
      doc.text(a.id, 50, doc.y, { continued: true })
         .text(`${a.especie} / ${a.raca}`, 150, doc.y, { continued: true })
         .text(a.peso.toString(), 350, doc.y, { continued: true })
         .text(a.status, 450, doc.y);
      doc.moveDown(0.8);
    });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar PDF', details: err.message });
  }
};