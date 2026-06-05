const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const PDFDocument = require('pdfkit');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_gametech_2026';

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'gametech_ia_db',
  password: process.env.DB_PASSWORD || 'adm',
  port: process.env.DB_PORT || 5432,
});

// Middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;
  if (!token) return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Sessão expirada ou token inválido.' });
  }
};

// =======================
// ROTAS DE AUTENTICAÇÃO
// =======================
app.post('/api/auth/register', async (req, res) => {
  const { nome, email, senha, cpf } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);
    // Insere com a hash na coluna correta para evitar o erro do Bcrypt no login
    const result = await pool.query(
      'INSERT INTO usuarios (nome, email, senha_hash, cpf) VALUES ($1, $2, $3, $4) RETURNING id, nome, email, cpf',
      [nome, email, senhaHash, cpf]
    );
    res.status(201).json({ message: 'Conta criada', user: result.rows[0] });
  } catch (err) {
    res.status(400).json({ error: 'Erro ao registar (Email ou CPF já existem)' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, senha } = req.body;
  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'Credenciais inválidas' });
    
    const user = result.rows[0];
    
    // Proteção rigorosa contra erro "Illegal arguments: string, undefined" do bcrypt
    const hashDB = user.senha || user.senha_hash; 
    if (!hashDB) return res.status(400).json({ error: 'Integridade de conta comprometida. Contacte o suporte.' });

    const isMatch = await bcrypt.compare(senha, hashDB);
    if (!isMatch) return res.status(400).json({ error: 'Credenciais inválidas' });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    delete user.senha;
    delete user.senha_hash;
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/usuarios/:id', authMiddleware, async (req, res) => {
  const { nome, cpf, email, telefone, foto } = req.body;
  try {
    const result = await pool.query(
      'UPDATE usuarios SET nome=$1, cpf=$2, email=$3, telefone=$4, foto=$5 WHERE id=$6 RETURNING *',
      [nome, cpf, email, telefone, foto, req.user.id]
    );
    const user = result.rows[0];
    delete user.senha;
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// =======================
// ROTAS DE FAZENDAS & FUNCIONÁRIOS
// =======================
app.get('/api/fazendas', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM fazendas WHERE usuario_id = $1', [req.user.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/fazendas', authMiddleware, async (req, res) => {
  const { nome, cnpj, cep, endereco, cidade, estado, area, foto } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO fazendas (usuario_id, nome, cnpj, cep, endereco, cidade, estado, area, foto) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [req.user.id, nome, cnpj, cep, endereco, cidade, estado, area, foto]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/fazendas/:id', authMiddleware, async (req, res) => {
  const { nome, cnpj, cidade, estado, area, foto } = req.body;
  try {
    await pool.query(
      'UPDATE fazendas SET nome=$1, cnpj=$2, cidade=$3, estado=$4, area=$5, foto=$6 WHERE id=$7 AND usuario_id=$8',
      [nome, cnpj, cidade, estado, area, foto, req.params.id, req.user.id]
    );
    res.json({ message: 'Atualizado com sucesso' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/funcionarios', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM funcionarios WHERE fazenda_id = $1', [req.query.fazendaId]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/funcionarios', authMiddleware, async (req, res) => {
  const { nome, cpf, funcao, telefone, fazenda_id } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO funcionarios (nome, cpf, funcao, telefone, fazenda_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [nome, cpf, funcao, telefone, fazenda_id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/funcionarios/:id', authMiddleware, async (req, res) => {
  const { nome, cpf, funcao, telefone } = req.body;
  try {
    await pool.query('UPDATE funcionarios SET nome=$1, cpf=$2, funcao=$3, telefone=$4 WHERE id=$5', [nome, cpf, funcao, telefone, req.params.id]);
    res.json({ message: 'Atualizado' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/funcionarios/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM funcionarios WHERE id=$1', [req.params.id]);
    res.json({ message: 'Apagado' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// =======================
// ROTAS DE ANIMAIS
// =======================
app.get('/api/animais', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM animais WHERE fazenda_id = $1 ORDER BY id ASC', [req.query.fazendaId]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/animais', authMiddleware, async (req, res) => {
  const { id, especie, raca, sexo, dataNascimento, peso, status, saude, ecc, pai, mae, fazenda_id, historicoPeso } = req.body;
  const history = historicoPeso || [{ data: dataNascimento || new Date().toISOString().split('T')[0], peso: parseFloat(peso) }];
  try {
    const result = await pool.query(
      'INSERT INTO animais (id, especie, raca, sexo, data_nascimento, peso, status, saude, ecc, pai_id, mae_id, fazenda_id, historico_peso) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *',
      [id, especie, raca, sexo, dataNascimento || null, peso, status, saude, ecc, pai || null, mae || null, fazenda_id, JSON.stringify(history)]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/animais/:id', authMiddleware, async (req, res) => {
  const { peso, status, ecc, saude, isFavorito, foto, historicoPeso, dataNascimento } = req.body;
  try {
    await pool.query(
      'UPDATE animais SET peso=$1, status=$2, ecc=$3, saude=$4, is_favorito=$5, foto=$6, historico_peso=$7, data_nascimento=$8 WHERE id=$9',
      [peso, status, ecc, saude, isFavorito, foto, JSON.stringify(historicoPeso || []), dataNascimento || null, req.params.id]
    );
    res.json({ message: 'Animal atualizado' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/animais/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM animais WHERE id=$1', [req.params.id]);
    res.json({ message: 'Apagado' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/animais/:id/transferir', authMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE animais SET fazenda_id=$1 WHERE id=$2', [req.body.novaFazendaId, req.params.id]);
    res.json({ message: 'Transferido' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// =======================
// ROTAS DE INSEMINAÇÃO
// =======================
app.get('/api/inseminacoes', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inseminacoes WHERE fazenda_id = $1', [req.query.fazendaId]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/inseminacoes', authMiddleware, async (req, res) => {
  const { id, data, matriz, reprodutor, tecnico, processo, observacoes, status, estagio, historicoGestacao, fazenda_id } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO inseminacoes (id, data, matriz_id, reprodutor_id, tecnico, processo, observacoes, status, estagio, historico_gestacao, fazenda_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
      [id, data, matriz, reprodutor, tecnico, processo || 'Inseminação', observacoes, status, estagio, JSON.stringify(historicoGestacao), fazenda_id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/inseminacoes/:id', authMiddleware, async (req, res) => {
  const { status, historicoGestacao, tecnico, processo, observacoes } = req.body;
  try {
    let query = 'UPDATE inseminacoes SET status=$1';
    let values = [status, req.params.id];
    let idx = 3;

    if (historicoGestacao) { query += `, historico_gestacao=$${idx++}`; values.push(JSON.stringify(historicoGestacao)); }
    if (tecnico) { query += `, tecnico=$${idx++}`; values.push(tecnico); }
    if (processo) { query += `, processo=$${idx++}`; values.push(processo); }
    if (observacoes !== undefined) { query += `, observacoes=$${idx++}`; values.push(observacoes); }

    query += ' WHERE id=$2';
    await pool.query(query, values);
    res.json({ message: 'Atualizado' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/inseminacoes/:id/nascimento', authMiddleware, async (req, res) => {
  const { dadosBezerro } = req.body;
  try {
    const iaRes = await pool.query('SELECT * FROM inseminacoes WHERE id=$1', [req.params.id]);
    const ia = iaRes.rows[0];
    const matrizRes = await pool.query('SELECT * FROM animais WHERE id=$1', [ia.matriz_id]);
    const matriz = matrizRes.rows[0];

    let hist = typeof ia.historico_gestacao === 'string' ? JSON.parse(ia.historico_gestacao) : (ia.historico_gestacao || []);
    hist.push({ data: new Date().toISOString().split('T')[0], evento: `Nascimento: ${dadosBezerro.id}` });
    await pool.query("UPDATE inseminacoes SET status='Nascimento Registrado', estagio='Concluído', historico_gestacao=$1 WHERE id=$2", [JSON.stringify(hist), ia.id]);

    const histPeso = [{ data: new Date().toISOString().split('T')[0], peso: parseFloat(dadosBezerro.peso) }];
    await pool.query(
      'INSERT INTO animais (id, especie, raca, sexo, data_nascimento, peso, status, saude, ecc, pai_id, mae_id, fazenda_id, historico_peso) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
      [dadosBezerro.id.toUpperCase(), matriz.especie, matriz.raca, dadosBezerro.sexo, new Date().toISOString().split('T')[0], dadosBezerro.peso, 'Jovem (Cria)', 'Saudável', 'ECC 3 - Ideal', ia.reprodutor_id, ia.matriz_id, ia.fazenda_id, JSON.stringify(histPeso)]
    );
    res.json({ message: 'Nascimento registado com sucesso' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// =======================
// ROTAS DE RELATÓRIOS PDF
// =======================
app.get('/api/relatorios/animal/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT a.*, f.nome as fazenda_nome FROM animais a JOIN fazendas f ON a.fazenda_id = f.id WHERE a.id = $1', [req.params.id]);
    const animal = result.rows[0];
    if (!animal) return res.status(404).send('Animal não encontrado');

    const repRes = await pool.query('SELECT * FROM inseminacoes WHERE matriz_id = $1 OR reprodutor_id = $1 ORDER BY data DESC', [animal.id]);
    const reproducoes = repRes.rows;

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-disposition', `attachment; filename=Relatorio_Zootecnico_${animal.id}.pdf`);
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(22).fillColor('#059669').text(`Ficha Zootécnica Completa`, { align: 'center' });
    doc.fontSize(16).fillColor('#1f2937').text(`Animal ID: ${animal.id}`, { align: 'center' }).moveDown(2);
    
    // Adiciona imagem armazenada
    if (animal.foto && animal.foto.includes('data:image')) {
      try {
        const base64Data = animal.foto.split(',')[1];
        doc.image(Buffer.from(base64Data, 'base64'), { fit: [150, 150], align: 'center' });
        doc.moveDown(10);
      } catch(e) {}
    }

    // Dados Gerais
    doc.fontSize(14).fillColor('#0f766e').text('Identificação e Dados Gerais', { underline: true }).moveDown(0.5);
    doc.fontSize(11).fillColor('#374151');
    doc.text(`Espécie: ${animal.especie} | Raça: ${animal.raca} | Sexo: ${animal.sexo}`);
    doc.text(`Data de Nascimento: ${animal.data_nascimento ? new Date(animal.data_nascimento).toLocaleDateString('pt-BR') : 'Não informada'}`);
    doc.text(`Fazenda Origem: ${animal.fazenda_nome}`);
    doc.text(`Genealogia: Pai (${animal.pai_id || 'Desconhecido'}) x Mãe (${animal.mae_id || 'Desconhecida'})`);
    doc.text(`Observações e Vacinas: ${animal.vacinas || 'Sem registos extras'}`);
    doc.moveDown();

    doc.fontSize(14).fillColor('#0f766e').text('Evolução e Histórico de Peso', { underline: true }).moveDown(0.5);
    const historico = typeof animal.historico_peso === 'string' ? JSON.parse(animal.historico_peso) : (animal.historico_peso || []);
    if(historico.length === 0) doc.fontSize(10).fillColor('#4b5563').text('Nenhuma pesagem registada.');
    historico.forEach((p, i) => {
      doc.fontSize(10).fillColor('#4b5563').text(`Aferição ${i+1}: Data ${p.data || '--'} | Registado: ${p.peso} kg`);
    });
    doc.moveDown();

    doc.fontSize(14).fillColor('#0f766e').text('Histórico Reprodutivo', { underline: true }).moveDown(0.5);
    if(reproducoes.length === 0) doc.fontSize(10).fillColor('#4b5563').text('Nenhum processo reprodutivo registado.');
    reproducoes.forEach(ia => {
      doc.fontSize(10).fillColor('#4b5563').text(`${ia.data} | Processo: ${ia.processo || 'IA'} | Parceiro: ${animal.sexo==='Fêmea'?ia.reprodutor_id:ia.matriz_id} | Status: ${ia.status}`);
    });

    doc.end();
  } catch (err) { res.status(500).send('Erro na compilação do PDF'); }
});

app.get('/api/relatorios/:tipo/:fazendaId', authMiddleware, async (req, res) => {
  const { tipo, fazendaId } = req.params;
  try {
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-disposition', `attachment; filename=Export_${tipo}_Fazenda_${fazendaId}.pdf`);
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(20).fillColor('#059669').text(`Exportação Gametech: ${tipo.toUpperCase()}`, { align: 'center' }).moveDown(2);

    if (tipo === 'rebanho') {
      const result = await pool.query('SELECT * FROM animais WHERE fazenda_id = $1 ORDER BY id', [fazendaId]);
      doc.fontSize(12).fillColor('#0f766e').text('Listagem Oficial do Rebanho', { underline: true }).moveDown();
      result.rows.forEach(a => {
        doc.fontSize(10).fillColor('#374151').text(`Brinco: ${a.id} | Raça: ${a.raca} | Sexo: ${a.sexo} | Peso: ${a.peso}kg | Status: ${a.status}`);
        doc.moveDown(0.5);
      });
    } else if (tipo === 'inseminacoes') {
      const result = await pool.query('SELECT * FROM inseminacoes WHERE fazenda_id = $1 ORDER BY data DESC', [fazendaId]);
      doc.fontSize(12).fillColor('#0f766e').text('Estatísticas Reprodutivas', { underline: true }).moveDown();
      result.rows.forEach(ia => {
        doc.fontSize(10).fillColor('#374151').text(`Data: ${ia.data} | Processo: ${ia.processo || 'IA'} | Matriz: ${ia.matriz_id} | Macho: ${ia.reprodutor_id} | Status: ${ia.status}`);
        doc.moveDown(0.5);
      });
    } else {
      doc.fontSize(12).fillColor('#374151').text('Relatório gerencial consolidado de dashboard.');
    }

    doc.end();
  } catch (err) { res.status(500).send('Erro na compilação do PDF'); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor Gametech Operacional em http://localhost:${PORT}`));