const API_URL = 'http://localhost:5000/api';

// Auxiliar para obter cabeçalhos com autenticação JWT
const getHeaders = () => {
  const token = localStorage.getItem('gametech_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const apiService = {
  // Autenticação
  login: async (email, senha) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao realizar login');
    }
    return res.json(); // Retorna { token, user }
  },

  register: async (nome, email, senha, cpf) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha, cpf })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao registrar');
    }
    return res.json();
  },

  // Fazendas
  getFazendas: async () => {
    const res = await fetch(`${API_URL}/fazendas`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Erro ao buscar fazendas');
    return res.json();
  },

  createFazenda: async (fazendaData) => {
    const res = await fetch(`${API_URL}/fazendas`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(fazendaData)
    });
    if (!res.ok) throw new Error('Erro ao cadastrar fazenda');
    return res.json();
  },

  // Animais
  getAnimais: async (fazendaId) => {
    const res = await fetch(`${API_URL}/animais?fazendaId=${fazendaId}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Erro ao buscar plantel');
    return res.json();
  },

  createAnimal: async (animalData) => {
    const res = await fetch(`${API_URL}/animais`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(animalData)
    });
    if (!res.ok) throw new Error('Erro ao salvar animal');
    return res.json();
  },

  updateAnimal: async (id, updatedFields) => {
    const res = await fetch(`${API_URL}/animais/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updatedFields)
    });
    if (!res.ok) throw new Error('Erro ao atualizar animal');
    return res.json();
  },

  transferirAnimal: async (id, novaFazendaId) => {
    const res = await fetch(`${API_URL}/animais/${id}/transferir`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ novaFazendaId })
    });
    if (!res.ok) throw new Error('Erro ao transferir animal');
    return res.json();
  },

  // Relatórios (Gera URL de download direto do PDFKit em execução no Node.js)
  getLinkPdfRebanho: (fazendaId) => {
    const token = localStorage.getItem('gametech_token');
    return `${API_URL}/relatorios/rebanho/pdf/${fazendaId}?token=${token}`;
  }
};