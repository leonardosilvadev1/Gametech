const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    // Verifica se o header Authorization existe
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
    }

    const token = authHeader.split(' ')[1];
    
    // Valida o Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Adiciona os dados do usuário na requisição para uso nos controllers
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
};