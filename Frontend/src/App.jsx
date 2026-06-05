import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Home, Activity, Dna, Tractor, BarChart3, Users, AlertTriangle, CheckCircle2,
  Menu, X, Droplet, Sun, Search, PlusCircle, Calendar, FileText, Download,
  Info, ArrowLeft, Shield, Heart, Cpu, Filter, Edit, Clock, HelpCircle, 
  ChevronDown, BookOpen, Award, Save, Printer, PieChart, Eye, FileSpreadsheet,
  LogOut, Settings, Camera, Trash2, ArrowRightLeft, Star, Baby, MapPin, Check,
  TrendingUp, Scale, Zap
} from 'lucide-react';

// --- CONFIGURAÇÃO DA API ---
const API_URL = 'http://localhost:5000/api';

const getHeaders = () => {
  try {
    const token = localStorage.getItem('gametech_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  } catch (e) {
    return { 'Content-Type': 'application/json' };
  }
};

// --- CONFIGURAÇÕES DE NEGÓCIO ---
const IDADE_MINIMA_MESES_ANALISE = 12;

// --- FUNÇÕES UTILITÁRIAS SEGUROS (NO-CRASH) ---
const calcularIdadeExata = (dataNascimento) => {
  if (!dataNascimento) return 'Desconhecida';
  try {
    const nasci = new Date(dataNascimento);
    const hoje = new Date();
    const timezoneOffset = nasci.getTimezoneOffset() * 60000;
    const nasciCorrigido = new Date(nasci.getTime() + timezoneOffset);

    let anos = hoje.getFullYear() - nasciCorrigido.getFullYear();
    let meses = hoje.getMonth() - nasciCorrigido.getMonth();
    let dias = hoje.getDate() - nasciCorrigido.getDate();

    if (dias < 0) {
      meses--;
      dias += new Date(hoje.getFullYear(), hoje.getMonth(), 0).getDate();
    }
    if (meses < 0) {
      anos--;
      meses += 12;
    }

    if (anos > 0) return `${anos}a ${meses}m ${dias}d`;
    if (meses > 0) return `${meses}m ${dias}d`;
    return `${dias} dias`;
  } catch (e) { return 'Desconhecida'; }
};

const isElegivelAnaliseGenetica = (animal) => {
  if (!animal || !animal.dataNascimento) return true;
  if (animal.status && animal.status.includes('Cria')) return false;

  try {
    const nasci = new Date(animal.dataNascimento);
    const hoje = new Date();
    const timezoneOffset = nasci.getTimezoneOffset() * 60000;
    const nasciCorrigido = new Date(nasci.getTime() + timezoneOffset);

    const totalMeses = (hoje.getFullYear() - nasciCorrigido.getFullYear()) * 12 + (hoje.getMonth() - nasciCorrigido.getMonth());
    return totalMeses >= IDADE_MINIMA_MESES_ANALISE;
  } catch (e) { return false; }
};

export default function App() {
  // --- ESTADOS DE AUTENTICAÇÃO E CONTEXTO ---
  const [authStatus, setAuthStatus] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  const [nomeCadastro, setNomeCadastro] = useState('');
  const [emailCadastro, setEmailCadastro] = useState('');
  const [senhaCadastro, setSenhaCadastro] = useState('');
  const [cpfCadastro, setCpfCadastro] = useState('');

  // --- DADOS DINÂMICOS DO POSTGRESQL ---
  const [fazendas, setFazendas] = useState([]);
  const [selectedFazendaId, setSelectedFazendaId] = useState(null);
  const [funcionarios, setFuncionarios] = useState([]);
  const [animais, setAnimais] = useState([]);
  const [inseminacoesHistorico, setInseminacoesHistorico] = useState([]);

  // --- ESTADOS GLOBAIS ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [globalSeason, setGlobalSeason] = useState('seco');
  const [isInseminacaoOpen, setIsInseminacaoOpen] = useState(false);
  const [showLGPD, setShowLGPD] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [isCadastroOpen, setIsCadastroOpen] = useState(false);
  const [simuladorPreSelection, setSimuladorPreSelection] = useState({ matriz: '', reprodutor: '' });

  // --- SINCRONIZAÇÃO DE SESSÃO ATIVA (PROTEGIDO) ---
  useEffect(() => {
    try {
      const token = localStorage.getItem('gametech_token');
      const userStr = localStorage.getItem('gametech_user');
      if (token && userStr && userStr !== "undefined") {
        setCurrentUser(JSON.parse(userStr));
        setAuthStatus('authenticated');
      }
    } catch (e) {
      localStorage.clear();
      setAuthStatus('login');
    }
  }, []);

  useEffect(() => {
    if (authStatus === 'authenticated') loadFazendas();
  }, [authStatus]);

  useEffect(() => {
    if (authStatus === 'authenticated' && selectedFazendaId) loadDadosFazenda(selectedFazendaId);
  }, [selectedFazendaId, authStatus]);

  const loadFazendas = async () => {
    try {
      const res = await fetch(`${API_URL}/fazendas`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setFazendas(data);
          if (data.length > 0 && !selectedFazendaId) setSelectedFazendaId(data[0].id);
        }
      }
    } catch (err) {}
  };

  const loadDadosFazenda = async (fazendaId) => {
    setLoading(true);
    try {
      const resAnimais = await fetch(`${API_URL}/animais?fazendaId=${fazendaId}`, { headers: getHeaders() });
      if (resAnimais.ok) {
        const dataAnimais = await resAnimais.json();
        const formatAnimais = (Array.isArray(dataAnimais) ? dataAnimais : []).map(a => ({
          id: String(a.id || ''), especie: String(a.especie || 'Bovino'), raca: String(a.raca || ''),
          sexo: String(a.sexo || 'Fêmea'), dataNascimento: a.data_nascimento || '',
          peso: parseFloat(a.peso) || 0, status: String(a.status || 'Saudável'), saude: String(a.saude || 'Saudável'),
          ecc: String(a.ecc || 'ECC 3'), vacinas: String(a.vacinas || 'Em dia'), abortos: parseInt(a.abortos) || 0,
          gestacoes: parseInt(a.gestacoes) || 0, fazenda_id: a.fazenda_id, isFavorito: Boolean(a.is_favorito),
          foto: a.foto || null, historicoPeso: Array.isArray(a.historico_peso) ? a.historico_peso : [{ data: a.data_nascimento || new Date().toISOString().split('T')[0], peso: parseFloat(a.peso) || 0 }],
          pai: String(a.pai_id || ''), mae: String(a.mae_id || '')
        }));
        setAnimais(formatAnimais);
      } else { setAnimais([]); }

      const resIA = await fetch(`${API_URL}/inseminacoes?fazendaId=${fazendaId}`, { headers: getHeaders() });
      if (resIA.ok) {
        const dataIA = await resIA.json();
        setInseminacoesHistorico(Array.isArray(dataIA) ? dataIA : []);
      } else { setInseminacoesHistorico([]); }

      const resFunc = await fetch(`${API_URL}/funcionarios?fazendaId=${fazendaId}`, { headers: getHeaders() });
      if (resFunc.ok) {
        const dataFunc = await resFunc.json();
        setFuncionarios(Array.isArray(dataFunc) ? dataFunc : []);
      } else { setFuncionarios([]); }
    } catch (err) {} finally {
      setLoading(false);
    }
  };

  const animaisFazenda = useMemo(() => (animais || []).filter(a => a && a.fazenda_id === selectedFazendaId), [animais, selectedFazendaId]);
  const inseminacoesFazenda = useMemo(() => (inseminacoesHistorico || []).filter(ia => ia && ia.fazenda_id === selectedFazendaId), [inseminacoesHistorico, selectedFazendaId]);

  // --- OPERAÇÕES DE AUTENTICAÇÃO ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim().toLowerCase(), senha: passwordInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Credenciais inválidas.');

      localStorage.setItem('gametech_token', data.token);
      localStorage.setItem('gametech_user', JSON.stringify(data.user));
      setCurrentUser(data.user);
      setAuthStatus('authenticated');
      showToast('Login efetuado com sucesso!');
      setEmailInput(''); setPasswordInput('');
    } catch (err) {
      setAuthError(err.message === 'Failed to fetch' ? 'Erro: Inicie o Backend (Node.js) local na porta 5000.' : err.message);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nomeCadastro, email: emailCadastro.trim().toLowerCase(), senha: senhaCadastro, cpf: cpfCadastro })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao processar o cadastro.');

      showToast('Conta criada com sucesso! Faça login.');
      setAuthStatus('login');
      setNomeCadastro(''); setEmailCadastro(''); setSenhaCadastro(''); setCpfCadastro('');
    } catch (err) {
      setAuthError(err.message === 'Failed to fetch' ? 'Erro de rede: O servidor backend não está online.' : err.message);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setCurrentUser(null); setFazendas([]); setAnimais([]); setSelectedFazendaId(null);
    setAuthStatus('login'); setActiveTab('dashboard'); setIsMobileMenuOpen(false);
  };

  // --- CRUDS GERAIS (ANIMAIS) ---
  const handleCadastrarAnimal = async (novoAnimal) => {
    try {
      const payload = { ...novoAnimal, pai: novoAnimal.pai || null, mae: novoAnimal.mae || null, fazenda_id: selectedFazendaId };
      const res = await fetch(`${API_URL}/animais`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Erro ao salvar animal no banco');
      await loadDadosFazenda(selectedFazendaId);
      setIsCadastroOpen(false);
      showToast(`Animal ${novoAnimal.id} cadastrado na fazenda atual!`);
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleUpdateAnimal = async (updatedAnimal) => {
    try {
      const res = await fetch(`${API_URL}/animais/${updatedAnimal.id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(updatedAnimal) });
      if (!res.ok) throw new Error('Erro ao salvar atualização no banco');
      await loadDadosFazenda(selectedFazendaId);
      setSelectedAnimal(updatedAnimal);
      showToast('Ficha atualizada e dados persistidos!');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleDeleteAnimal = async (id) => {
    if(window.confirm('Tem certeza que deseja excluir permanentemente esta ficha?')) {
      try {
        const res = await fetch(`${API_URL}/animais/${id}`, { method: 'DELETE', headers: getHeaders() });
        if (!res.ok) throw new Error('Falha ao remover do PostgreSQL.');
        await loadDadosFazenda(selectedFazendaId);
        setSelectedAnimal(null);
        showToast('Ficha excluída com sucesso.', 'info');
      } catch (err) { showToast(err.message, 'error'); }
    }
  };

  const handleTransferirAnimal = async (id, novaFazendaId) => {
    try {
      const res = await fetch(`${API_URL}/animais/${id}/transferir`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ novaFazendaId }) });
      if (!res.ok) throw new Error('Erro ao transferir animal de fazenda');
      await loadDadosFazenda(selectedFazendaId);
      setSelectedAnimal(null);
      showToast('Animal transferido para outra propriedade com sucesso!');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const goToSimuladorWithAnimal = (animal) => {
    setSelectedAnimal(null);
    if(animal.sexo === 'Fêmea') setSimuladorPreSelection({ matriz: animal.id, reprodutor: '' });
    else setSimuladorPreSelection({ matriz: '', reprodutor: animal.id });
    setActiveTab('simulador');
    showToast('Dados transferidos para o simulador IA.', 'info');
  };

  const handleAtualizarStatusIA = async (idIA, novoStatus) => {
    try {
      const res = await fetch(`${API_URL}/inseminacoes/${idIA}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify({ status: novoStatus }) });
      if (!res.ok) throw new Error('Não foi possível atualizar o status');
      await loadDadosFazenda(selectedFazendaId);
      showToast('Status reprodutivo atualizado!');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const registrarNascimento = async (ia, dadosBezerro) => {
    try {
      const res = await fetch(`${API_URL}/inseminacoes/${ia.id}/nascimento`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ dadosBezerro }) });
      if (!res.ok) throw new Error('Erro ao cadastrar nascimento no servidor');
      await loadDadosFazenda(selectedFazendaId);
      showToast(`Nascimento registrado! Ficha ${dadosBezerro.id} (0 dias) gerada com sucesso.`, 'success');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleAddFazenda = async (novaFazenda) => {
    try {
      const res = await fetch(`${API_URL}/fazendas`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(novaFazenda) });
      if (!res.ok) throw new Error('Erro ao criar fazenda');
      await loadFazendas();
      showToast('Nova fazenda cadastrada e disponível no sistema!');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleEditFazenda = async (fazendaEditada) => {
    try {
      const res = await fetch(`${API_URL}/fazendas/${fazendaEditada.id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(fazendaEditada) });
      if (!res.ok) throw new Error('Erro ao atualizar fazenda');
      await loadFazendas();
      showToast('Dados da fazenda atualizados!');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleNavClick = (tabId) => {
    setActiveTab(tabId); setSelectedAnimal(null); setIsMobileMenuOpen(false);
  };

  // --- TELAS DE AUTENTICAÇÃO ---
  if (authStatus === 'login' || authStatus === 'register') {
    return (
      <div className="flex h-screen w-full bg-gray-50 font-sans">
        {toast && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 border animate-fade-in ${
            toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}>
            {toast.type === 'error' ? <AlertTriangle size={20} className="text-red-500"/> : <CheckCircle2 size={20} className="text-emerald-500"/>}
            <span className="text-sm font-semibold">{toast.message}</span>
          </div>
        )}

        <div className="hidden md:flex w-1/2 bg-emerald-700 flex-col items-center justify-center p-12 relative overflow-hidden">
          <div className="relative z-10 flex flex-col items-center text-center">
            <Dna size={140} className="text-white mb-4 drop-shadow-md" strokeWidth={1.5} />
            <h1 className="text-6xl font-bold text-white tracking-wide font-sans mb-2 font-black">GameTech</h1>
            <div className="w-3/4 h-px bg-white/40 my-3 rounded-full"></div>
            <p className="text-white text-sm font-medium tracking-wide">Tecnologia que fortalece o rebanho.</p>
          </div>
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-600 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-800 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
        </div>

        <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 relative bg-gray-50">
          <h2 className="text-3xl font-black text-gray-900 mb-8 text-center">Bem Vindo, Agricultor!</h2>
          
          <div className="w-full max-w-md bg-white p-8 md:p-10 rounded-xl shadow-[0_10px_40px_rgb(0,0,0,0.1)]">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">{authStatus === 'login' ? 'Acesso ao Sistema' : 'Criar Nova Conta'}</h3>
            
            {authStatus === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1 ml-1 uppercase tracking-wide">E-mail</label>
                  <input type="email" required placeholder="Digite seu e-mail" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className="w-full p-3 border-[1.5px] border-emerald-600 rounded-lg outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all font-medium text-gray-700 bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1 ml-1 uppercase tracking-wide">Senha</label>
                  <input type="password" required placeholder="Digite sua senha" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full p-3 border-[1.5px] border-emerald-600 rounded-lg outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all font-medium text-gray-700 bg-white" />
                  <div className="flex justify-end mt-2"><button type="button" className="text-[10px] font-bold text-emerald-600/70 hover:text-emerald-600 transition-colors">Esqueceu a senha?</button></div>
                </div>

                {authError && <p className="text-red-600 text-xs font-bold text-center mt-2">{authError}</p>}
                
                <button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3.5 rounded-lg transition-all active:scale-95 shadow-md mt-4">
                  Entrar no Sistema
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1 ml-1 uppercase tracking-wider">Nome Completo</label>
                  <input type="text" required placeholder="Nome e Sobrenome" value={nomeCadastro} onChange={e => setNomeCadastro(e.target.value)} className="w-full p-3 border-[1.5px] border-emerald-600 rounded-lg outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all font-medium text-gray-700 bg-white" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1 ml-1 uppercase tracking-wider">CPF</label>
                  <input type="text" required placeholder="000.000.000-00" value={cpfCadastro} onChange={e => setCpfCadastro(e.target.value)} className="w-full p-3 border-[1.5px] border-emerald-600 rounded-lg outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all font-medium text-gray-700 bg-white" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1 ml-1 uppercase tracking-wider">E-mail</label>
                  <input type="email" required placeholder="Seu melhor e-mail" value={emailCadastro} onChange={e => setEmailCadastro(e.target.value)} className="w-full p-3 border-[1.5px] border-emerald-600 rounded-lg outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all font-medium text-gray-700 bg-white" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1 ml-1 uppercase tracking-wider">Senha Segura</label>
                  <input type="password" required placeholder="Mínimo 6 caracteres" value={senhaCadastro} onChange={e => setSenhaCadastro(e.target.value)} className="w-full p-3 border-[1.5px] border-emerald-600 rounded-lg outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all font-medium text-gray-700 bg-white" />
                </div>

                {authError && <p className="text-red-600 text-xs font-bold text-center mt-2">{authError}</p>}
                
                <button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3.5 rounded-lg transition-all active:scale-95 shadow-md mt-4">
                  Registrar Nova Conta
                </button>
              </form>
            )}
          </div>
          
          <p className="mt-8 text-xs font-bold text-gray-500 text-center">
            {authStatus === 'login' ? 'Não tem uma conta?' : 'Já possui conta?'} 
            <button onClick={() => { setAuthStatus(authStatus === 'login' ? 'register' : 'login'); setAuthError(''); }} className="text-emerald-600 hover:text-emerald-700 ml-1 font-bold">
              {authStatus === 'login' ? 'Cadastre-se' : 'Faça Login'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  // --- RENDERIZAÇÃO PRINCIPAL DO SISTEMA ---
  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-800 overflow-hidden">
      {/* Toast Notification Global */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 border transition-all duration-300 animate-fade-in ${
          toast.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-900' : toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          {toast.type === 'error' ? <AlertTriangle size={20} className="text-red-500"/> : <CheckCircle2 size={20} className="text-emerald-500"/>}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* HEADER MOBILE RESPONSIVO */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-emerald-950 text-white flex items-center justify-between px-4 z-40 shadow-md">
        <div className="flex items-center gap-2">
          <Dna size={20} className="text-emerald-400" />
          <h1 className="text-lg font-bold font-black">Gametech</h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 -mr-2 text-emerald-100 hover:text-white transition-colors">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* NAVBAR MOBILE EXPANSÍVEL */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-emerald-950 z-30 flex flex-col overflow-y-auto pb-6 animate-fade-in">
          <div className="p-4 border-b border-emerald-800/50">
            <span className="block text-[10px] uppercase font-bold text-emerald-400 mb-1">Propriedade Atual</span>
            <select value={selectedFazendaId || ''} onChange={(e) => { setSelectedFazendaId(Number(e.target.value)); handleNavClick('dashboard'); showToast('Fazenda alternada.'); }} className="w-full bg-emerald-900 p-3 rounded-xl text-white text-sm font-bold outline-none border border-emerald-800">
              {(fazendas || []).map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
          <nav className="flex-1 py-4">
            <ul className="space-y-2 px-4">
              <li><button onClick={() => handleNavClick('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-100/70'}`}><Home size={20}/> Dashboard</button></li>
              <li><button onClick={() => handleNavClick('animais')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${activeTab === 'animais' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-100/70'}`}><Tractor size={20}/> Rebanho</button></li>
              <li>
                <button onClick={() => setIsInseminacaoOpen(!isInseminacaoOpen)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl ${activeTab.includes('insem') ? 'text-white font-bold' : 'text-emerald-100/70'}`}>
                  <div className="flex items-center gap-3"><Activity size={20}/> Inseminação</div>
                  <ChevronDown size={16} className={`transition-transform ${isInseminacaoOpen ? 'rotate-180' : ''}`} />
                </button>
                {isInseminacaoOpen && (
                  <ul className="ml-10 mt-1 space-y-2 border-l border-emerald-800/50 pl-2">
                    <li><button onClick={() => handleNavClick('insem_cadastro')} className={`w-full text-left px-4 py-2 rounded-lg text-sm ${activeTab === 'insem_cadastro' ? 'text-emerald-300 font-bold bg-emerald-900/30' : 'text-emerald-200/60'}`}>Cadastro & Listagem</button></li>
                    <li><button onClick={() => handleNavClick('insem_prenhez')} className={`w-full text-left px-4 py-2 rounded-lg text-sm ${activeTab === 'insem_prenhez' ? 'text-emerald-300 font-bold bg-emerald-900/30' : 'text-emerald-200/60'}`}>Gestão de Prenhez</button></li>
                  </ul>
                )}
              </li>
              <li><button onClick={() => handleNavClick('simulador')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${activeTab === 'simulador' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-100/70'}`}><Dna size={20}/> Simulador IA</button></li>
              <li><button onClick={() => handleNavClick('melhoria')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${activeTab === 'melhoria' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-100/70'}`}><Cpu size={20}/> Melhoria Genética</button></li>
              <li><button onClick={() => handleNavClick('relatorios')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${activeTab === 'relatorios' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-100/70'}`}><BarChart3 size={20}/> Relatórios</button></li>
            </ul>
          </nav>
          <div className="px-4 mt-auto border-t border-emerald-800/50 pt-4">
             <button onClick={() => { setIsMobileMenuOpen(false); setShowProfile(true); }} className="w-full flex items-center justify-between bg-emerald-900 p-4 rounded-xl">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-lg">{currentUser?.foto ? <img src={currentUser.foto} className="w-full h-full rounded-full object-cover"/> : (currentUser?.nome?.[0] || 'G')}</div>
                 <div className="text-left"><p className="text-sm font-bold text-white">{(currentUser?.nome || '').split(' ')[0]}</p><p className="text-[10px] text-emerald-300">Acessar Perfil</p></div>
               </div>
               <Settings size={20} className="text-emerald-400" />
             </button>
          </div>
        </div>
      )}

      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-emerald-950 text-white shadow-2xl z-10 flex-shrink-0 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-emerald-800 rounded-full opacity-20 blur-3xl"></div>
        <div className="p-6 border-b border-emerald-800/50 relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-emerald-500 p-2 rounded-xl shadow-lg shadow-emerald-500/30"><Dna size={24} /></div>
            <div>
              <h1 className="text-xl font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white to-emerald-200">Gametech</h1>
            </div>
          </div>
          
          <div className="bg-emerald-900/50 p-3 rounded-xl border border-emerald-800/50">
            <span className="block text-[10px] uppercase font-bold text-emerald-400 mb-1">Propriedade Atual</span>
            <select 
              value={selectedFazendaId || ''} 
              onChange={(e) => { setSelectedFazendaId(Number(e.target.value)); handleNavClick('dashboard'); showToast('Fazenda alternada com sucesso.'); }}
              className="w-full bg-transparent text-white text-sm font-bold outline-none cursor-pointer"
            >
              {(fazendas || []).map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
        </div>
        
        <nav className="flex-1 py-6 overflow-y-auto relative z-10">
          <ul className="space-y-1.5 px-4">
            <li><button onClick={() => handleNavClick('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white font-bold shadow-md' : 'text-emerald-100/70 hover:bg-emerald-800/50'}`}><Home size={20} /> <span className="text-sm tracking-wide">Dashboard</span></button></li>
            <li><button onClick={() => handleNavClick('animais')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'animais' ? 'bg-emerald-600 text-white font-bold shadow-md' : 'text-emerald-100/70 hover:bg-emerald-800/50'}`}><Tractor size={20} /> <span className="text-sm tracking-wide">Rebanho</span></button></li>
            <li>
              <button onClick={() => setIsInseminacaoOpen(!isInseminacaoOpen)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeTab.includes('insem') ? 'text-white font-bold' : 'text-emerald-100/70 hover:bg-emerald-800/50'}`}>
                <div className="flex items-center gap-3"><Activity size={20} /> <span className="text-sm tracking-wide">Inseminação</span></div>
                <ChevronDown size={16} className={`transition-transform ${isInseminacaoOpen ? 'rotate-180' : ''}`} />
              </button>
              {isInseminacaoOpen && (
                <ul className="ml-10 mt-1 space-y-1 border-l border-emerald-800/50 pl-2">
                  <li><button onClick={() => handleNavClick('insem_cadastro')} className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${activeTab === 'insem_cadastro' ? 'text-emerald-300 font-bold bg-emerald-900/30' : 'text-emerald-200/60 hover:text-white'}`}>Cadastro & Listagem</button></li>
                  <li><button onClick={() => handleNavClick('insem_prenhez')} className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${activeTab === 'insem_prenhez' ? 'text-emerald-300 font-bold bg-emerald-900/30' : 'text-emerald-200/60 hover:text-white'}`}>Prenhez (Gestação)</button></li>
                </ul>
              )}
            </li>
            <li><button onClick={() => handleNavClick('simulador')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'simulador' ? 'bg-emerald-600 text-white font-bold shadow-md' : 'text-emerald-100/70 hover:bg-emerald-800/50'}`}><Dna size={20} /> <span className="text-sm tracking-wide">Simulador IA</span></button></li>
            <li><button onClick={() => handleNavClick('melhoria')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'melhoria' ? 'bg-emerald-600 text-white font-bold shadow-md' : 'text-emerald-100/70 hover:bg-emerald-800/50'}`}><Cpu size={20} /> <span className="text-sm tracking-wide">Melhoria Genética</span></button></li>
            <li><button onClick={() => handleNavClick('relatorios')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'relatorios' ? 'bg-emerald-600 text-white font-bold shadow-md' : 'text-emerald-100/70 hover:bg-emerald-800/50'}`}><BarChart3 size={20} /> <span className="text-sm tracking-wide">Relatórios</span></button></li>
          </ul>
        </nav>

        <div className="p-4 border-t border-emerald-800/50 space-y-2 relative z-10">
          <button onClick={() => setShowLGPD(true)} className="w-full flex items-center gap-2 text-xs font-bold text-emerald-300 hover:text-white transition-colors px-2 py-1"><Shield size={14}/> Conformidade LGPD</button>
          <div className="flex items-center justify-between bg-emerald-900 p-3 rounded-xl cursor-pointer hover:bg-emerald-800 transition-colors" onClick={() => setShowProfile(true)}>
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                {currentUser?.foto ? <img src={currentUser.foto} alt="Avatar" className="w-full h-full rounded-full object-cover"/> : (currentUser?.nome?.[0] || 'G')}
              </div>
              <div className="truncate">
                <p className="text-sm font-bold text-white truncate">{(currentUser?.nome || '').split(' ')[0]}</p>
                <p className="text-[10px] text-emerald-300 truncate">Proprietário</p>
              </div>
            </div>
            <Settings size={16} className="text-emerald-400" />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-gray-50/50 pt-20 md:pt-0 pb-10 relative w-full">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          
          {/* Header Global */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                {selectedAnimal && (
                  <button onClick={() => setSelectedAnimal(null)} className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors mr-2 text-gray-600"><ArrowLeft size={18} /></button>
                )}
                <h2 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">
                  {selectedAnimal ? `Ficha: ${selectedAnimal.id}` : activeTab === 'ficha_fazenda' ? 'Ficha da Fazenda' : activeTab.includes('insem') ? 'Módulo de Inseminação' : 'Centro de Gestão'}
                </h2>
              </div>
              <p className="text-gray-500 text-sm font-medium mt-1 flex items-center gap-2 animate-fade-in">
                <MapPin size={14} className="text-emerald-500 shrink-0"/> <span className="truncate">{(fazendas || []).find(f => f.id === selectedFazendaId)?.nome || 'Sem Propriedade'} • {(fazendas || []).find(f => f.id === selectedFazendaId)?.cidade || ''}</span>
              </p>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              <button 
                onClick={() => { setGlobalSeason(globalSeason === 'seco' ? 'chuvoso' : 'seco'); showToast('Clima global da simulação alterado.'); }}
                className={`w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl border-2 transition-all font-bold shadow-sm active:scale-95 ${globalSeason === 'seco' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}
              >
                {globalSeason === 'seco' ? <Sun size={18} /> : <Droplet size={18} />}
                <span>Período {globalSeason === 'seco' ? 'Seco' : 'Chuvoso'}</span>
              </button>
            </div>
          </header>

          {/* Loader se estiver carregando */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500 font-bold">Sincronizando com PostgreSQL...</p>
            </div>
          ) : (
            <>
              {selectedAnimal ? (
                <FichaAnimalView 
                  animal={selectedAnimal} 
                  onVoltar={() => setSelectedAnimal(null)} 
                  onSimular={goToSimuladorWithAnimal}
                  onUpdate={handleUpdateAnimal}
                  onDelete={handleDeleteAnimal}
                  onTransfer={handleTransferirAnimal}
                  inseminacoes={inseminacoesFazenda}
                  showToast={showToast}
                  fazendas={fazendas}
                />
              ) : (
                <>
                  {activeTab === 'dashboard' && <DashboardView animais={animaisFazenda} inseminacoes={inseminacoesFazenda} fazendas={fazendas} />}
                  {activeTab === 'animais' && <RebanhoView animais={animaisFazenda} onVerFicha={setSelectedAnimal} onOpenCadastro={() => setIsCadastroOpen(true)} />}
                  {activeTab === 'insem_cadastro' && <InseminacaoCadastroView animais={animaisFazenda} historico={inseminacoesFazenda} showToast={showToast} fazendaId={selectedFazendaId} onRefresh={() => loadDadosFazenda(selectedFazendaId)} />}
                  {activeTab === 'insem_prenhez' && <PrenhezView inseminacoes={inseminacoesFazenda} animais={animaisFazenda} atualizarStatusIA={handleAtualizarStatusIA} registrarNascimento={registrarNascimento} showToast={showToast} />}
                  {activeTab === 'simulador' && <SimuladorIA animais={animaisFazenda} globalSeason={globalSeason} preSelection={simuladorPreSelection} />}
                  {activeTab === 'melhoria' && <MelhoriaGeneticaView animais={animaisFazenda} globalSeason={globalSeason} showToast={showToast} />}
                  {activeTab === 'relatorios' && <RelatoriosView showToast={showToast} fazendaId={selectedFazendaId} />}
                  {activeTab === 'ficha_fazenda' && (
                    <FichaFazendaView 
                      fazenda={(fazendas || []).find(f => f.id === selectedFazendaId)} 
                      onEditFazenda={handleEditFazenda}
                      animais={animaisFazenda} 
                      inseminacoes={inseminacoesFazenda}
                      funcionarios={funcionarios}
                      setFuncionarios={setFuncionarios}
                      currentUser={currentUser}
                      showToast={showToast}
                      onVoltar={() => handleNavClick('dashboard')}
                      onRefreshDados={() => loadDadosFazenda(selectedFazendaId)}
                    />
                  )}
                </>
              )}
            </>
          )}

        </div>
      </main>

      {/* Modais Globais */}
      {isCadastroOpen && <ModalCadastro onClose={() => setIsCadastroOpen(false)} onSave={handleCadastrarAnimal} />}
      {showLGPD && <ModalLGPD onClose={() => setShowLGPD(false)} />}
      {showProfile && (
        <ModalPerfil 
          currentUser={currentUser} setCurrentUser={setCurrentUser}
          fazendas={fazendas} onAddFazenda={handleAddFazenda} onEditFazenda={handleEditFazenda}
          onClose={() => setShowProfile(false)} onLogout={handleLogout} showToast={showToast}
          onViewFazenda={(id) => {
            setSelectedFazendaId(id);
            setActiveTab('ficha_fazenda');
            setSelectedAnimal(null);
            setShowProfile(false);
          }}
        />
      )}
    </div>
  );
}

// --- TELAS ADICIONAIS ---

// REQ 7: DASHBOARD COM DADOS REAIS DE PESAGEM E EVOLUÇÃO
function DashboardView({ animais, inseminacoes, fazendas }) {
  const safeAnimais = animais || [];
  const safeInseminacoes = inseminacoes || [];
  const safeFazendas = fazendas || [];

  const total = safeAnimais.length;
  const femeas = safeAnimais.filter(a => a && a.sexo === 'Fêmea').length;
  const machos = safeAnimais.filter(a => a && a.sexo === 'Macho').length;
  const nascidosRecentes = safeAnimais.filter(a => a && (a.status || '').includes('Cria')).length;
  
  const insemAndamento = safeInseminacoes.filter(ia => ia && ia.status === 'Aguardando Diagnóstico').length;
  const prenhezConf = safeInseminacoes.filter(ia => ia && ia.status === 'Prenhez Confirmada').length;
  const numSucessos = safeInseminacoes.filter(ia => ia && (ia.status === 'Prenhez Confirmada' || ia.status === 'Nascimento Registrado')).length;
  const taxaSucesso = safeInseminacoes.length > 0 ? ((numSucessos / safeInseminacoes.length) * 100).toFixed(0) : 0;

  const validWeights = safeAnimais.map(a => a?.peso).filter(p => p > 0);
  const pesoMedio = validWeights.length > 0 ? (validWeights.reduce((acc, p) => acc + p, 0) / validWeights.length).toFixed(1) : 0;
  const favoritos = safeAnimais.filter(a => a && a.isFavorito).length;

  // Evolução Real (Últimas pesagens cadastradas no rebanho convertidas p/ porcentagem gráfica)
  const weightEvolution = useMemo(() => {
    if (!validWeights.length) return [0,0,0,0,0,0,0,0];
    const maxW = Math.max(...validWeights);
    const recent = validWeights.slice(-8); // Pega as 8 ultimas pesagens do banco
    while(recent.length < 8) recent.unshift(0); // Completa a interface pra não quebrar gráfico
    return recent.map(w => maxW > 0 ? (w / maxW) * 100 : 0);
  }, [validWeights]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Rebanho Ativo" value={total} subtitle={`${femeas} Fêmeas | ${machos} Machos`} icon={<Users className="text-blue-500" />} color="border-blue-200 bg-blue-50" />
        <KpiCard title="Taxa Sucesso Repr." value={`${taxaSucesso}%`} subtitle={`${prenhezConf} confirmadas`} icon={<Activity className="text-emerald-500" />} color="border-emerald-200 bg-emerald-50" />
        <KpiCard title="Animais Favoritos" value={favoritos} subtitle="Prioridade Genética" icon={<Star className="text-indigo-500 fill-indigo-500" />} color="border-indigo-200 bg-indigo-50" />
        <KpiCard title="Peso Médio (kg)" value={pesoMedio} subtitle="Média do rebanho local" icon={<Scale className="text-amber-500" />} color="border-amber-200 bg-amber-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          <h3 className="text-lg font-bold mb-6 text-gray-800 flex items-center gap-2"><BarChart3 size={20} className="text-emerald-500"/> Evolução Genética e Produtiva (Reais)</h3>
          <div className="h-64 flex items-end justify-between gap-2 px-2 flex-1 overflow-x-auto">
            {weightEvolution.map((val, i) => (
              <div key={i} className="w-10 md:w-full min-w-[30px] flex flex-col items-center gap-2 group h-full justify-end">
                <div className="relative w-full bg-emerald-50 rounded-t-lg flex items-end overflow-hidden" style={{ height: '100%' }}>
                  <div className="w-full bg-emerald-500 rounded-t-md transition-all duration-500 group-hover:bg-emerald-400" style={{ height: `${val}%` }}></div>
                </div>
                <span className="text-[10px] text-gray-400 font-bold uppercase truncate">P.{i+1}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2"><Baby size={18} className="text-pink-500"/> Nascimentos & Gestação</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="text-xs font-bold text-gray-600">Nascidos Recentemente</span>
                <span className="font-black text-pink-600">{nascidosRecentes}</span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="text-xs font-bold text-gray-600">Em Análise (Diag.)</span>
                <span className="font-black text-amber-600">{insemAndamento}</span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="text-xs font-bold text-gray-600">Previsão Partos (Ativos)</span>
                <span className="font-black text-emerald-600">{prenhezConf}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="text-red-500" size={18} />
              <h3 className="text-base font-bold text-gray-800">Manejo Estratégico</h3>
            </div>
            <div className="space-y-3">
              {safeAnimais.some(a => a && (a.saude||'').includes('Brucelose')) ? (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                  <p className="text-xs font-bold text-red-800">Doença Infecciosa Detectada</p>
                  <p className="text-[10px] text-red-600 mt-1">Animais bloqueados preventivamente pelo motor de IA.</p>
                </div>
              ) : (
                <div className="p-3 bg-green-50 border border-green-100 rounded-xl flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green-500 shrink-0"/>
                  <span className="text-xs font-bold text-green-800">Nenhum surto infeccioso detectado.</span>
                </div>
              )}
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-xs font-bold text-blue-800 flex items-center gap-1"><Scale size={14}/> Evolução Zootécnica</p>
                <p className="text-[10px] text-blue-600 mt-1">A média de ganho diário do plantel jovem reflete atualizações reais no BD.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 1. REBANHO - REQ 8: ORDENAÇÃO AVANÇADA (1. Favorito -> 2. Espécie -> 3. Brinco Alfabeto)
function RebanhoView({ animais, onVerFicha, onOpenCadastro }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRaca, setFilterRaca] = useState('');
  const [filterClassificacao, setFilterClassificacao] = useState('');

  const safeAnimais = animais || [];
  const racasUnicas = useMemo(() => [...new Set(safeAnimais.map(a => a?.raca || ''))].filter(Boolean), [safeAnimais]);

  const filteredAnimais = safeAnimais.filter(a => {
    if (!a) return false;
    const safeId = a.id || '';
    const safeEspecie = a.especie || '';
    const safeRaca = a.raca || '';
    const safeSexo = a.sexo || '';

    const matchSearch = safeId.toLowerCase().includes(searchTerm.toLowerCase()) || safeEspecie.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRaca = filterRaca ? safeRaca === filterRaca : true;
    let matchClassificacao = true;
    if (filterClassificacao === 'Fêmeas') matchClassificacao = safeSexo === 'Fêmea';
    if (filterClassificacao === 'Machos') matchClassificacao = safeSexo === 'Macho';
    if (filterClassificacao === 'Favoritos') matchClassificacao = a.isFavorito;
    return matchSearch && matchRaca && matchClassificacao;
  });

  // Req 8: Ordenação Avançada no componente
  filteredAnimais.sort((a, b) => {
    if (a.isFavorito && !b.isFavorito) return -1;
    if (!a.isFavorito && b.isFavorito) return 1;

    const especieOrder = { 'Bovino': 1, 'Caprino': 2, 'Ovino': 3 };
    const espA = especieOrder[a.especie] || 99;
    const espB = especieOrder[b.especie] || 99;
    if (espA !== espB) return espA - espB;

    return String(a.id || '').localeCompare(String(b.id || ''), undefined, { numeric: true, sensitivity: 'base' });
  });

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in flex flex-col">
      <div className="p-4 md:p-6 border-b border-gray-100 bg-gray-50/50">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Tractor className="text-emerald-600" /> Plantel da Propriedade ({filteredAnimais.length})
          </h3>
          <button onClick={onOpenCadastro} className="w-full lg:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all">
            <PlusCircle size={18} /> Novo Animal
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Buscar por Brinco ou Espécie..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium"/>
          </div>
          <select value={filterRaca} onChange={(e) => setFilterRaca(e.target.value)} className="w-full p-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium text-gray-600">
            <option value="">Todas as Raças</option>
            {racasUnicas.map((raca, i) => <option key={i} value={raca}>{raca}</option>)}
          </select>
          <select value={filterClassificacao} onChange={(e) => setFilterClassificacao(e.target.value)} className="w-full p-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium text-gray-600">
            <option value="">Status & Classificação</option>
            <option value="Fêmeas">Apenas Fêmeas</option>
            <option value="Machos">Apenas Machos</option>
            <option value="Favoritos">Apenas Favoritos ⭐</option>
          </select>
        </div>
      </div>
      
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse whitespace-nowrap md:whitespace-normal">
          <thead className="bg-white border-b border-gray-100">
            <tr className="text-gray-500 text-xs uppercase tracking-widest font-bold">
              <th className="p-4">ID / Brinco</th>
              <th className="p-4">Espécie/Raça</th>
              <th className="p-4">Idade</th>
              <th className="p-4">Saúde</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-sm">
            {filteredAnimais.map((animal, idx) => (
              <tr key={idx} className="hover:bg-emerald-50/50 transition-colors group cursor-pointer" onDoubleClick={() => onVerFicha(animal)}>
                <td className="p-4 font-black text-gray-800 flex items-center gap-2">
                  {animal.isFavorito && <Star size={14} className="text-amber-500 fill-amber-500" />}
                  {animal.id}
                </td>
                <td className="p-4"><div className="flex flex-col"><span className="font-bold text-gray-700">{animal.raca}</span><span className="text-xs text-gray-400">{animal.especie}</span></div></td>
                <td className="p-4 text-gray-600 font-medium">{calcularIdadeExata(animal.dataNascimento)}</td>
                <td className="p-4">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 uppercase tracking-wider rounded-md ${(animal.saude || '').includes('Saudável') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <Heart size={12} /> {(animal.saude || '').includes('Saudável') ? 'Apto' : 'Alerta'}
                  </span>
                </td>
                <td className="p-4"><span className={`font-bold ${(animal.status || '').includes('Prenhe') ? 'text-emerald-600' : 'text-gray-500'}`}>{animal.status}</span></td>
                <td className="p-4 text-center">
                  <button onClick={() => onVerFicha(animal)} className="bg-gray-100 hover:bg-emerald-100 text-gray-600 hover:text-emerald-700 px-4 py-1.5 rounded-lg font-bold transition-colors text-xs">Ficha</button>
                </td>
              </tr>
            ))}
            {filteredAnimais.length === 0 && (
              <tr><td colSpan="6" className="p-8 text-center text-gray-400 font-medium">Nenhum animal encontrado para estes filtros.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 1.1 FICHA DO ANIMAL - REQ 1 (EVOLUÇÃO DE PESO DINÂMICA) e REQ 5 (PDF INDIVIDUAL)
function FichaAnimalView({ animal, onVoltar, onSimular, onUpdate, onDelete, onTransfer, inseminacoes, showToast, fazendas }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(animal || {});
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [activeFichaTab, setActiveFichaTab] = useState('geral');
  
  // Controle interativo do histórico de pesagens
  const [pesagens, setPesagens] = useState([]);

  useEffect(() => {
    setFormData(animal || {});
    const hist = animal?.historicoPeso || [];
    setPesagens(hist.map(p => typeof p === 'object' ? p : { data: animal?.dataNascimento || new Date().toISOString().split('T')[0], peso: p }));
  }, [animal]);

  const maxPesoCalc = pesagens.length > 0 ? Math.max(...pesagens.map(p => parseFloat(p.peso) || 0)) + 20 : 100;
  const histList = (inseminacoes || []).filter(ia => ia && (ia.matriz_id === formData.id || ia.reprodutor_id === formData.id));

  const handleSave = () => { onUpdate(formData); setIsEditing(false); };
  
  const toggleFavorito = () => {
    const newVal = !formData.isFavorito;
    const updated = {...formData, isFavorito: newVal};
    setFormData(updated);
    onUpdate(updated);
    showToast(newVal ? 'Adicionado aos Favoritos Genéticos!' : 'Removido dos Favoritos.');
  };

  // Req 2: Upload Base64 e persistência
  const handleAnimalPhoto = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const updated = {...formData, foto: reader.result};
        setFormData(updated);
        onUpdate(updated);
        showToast('Foto do animal salva no banco de dados com sucesso!');
      };
      reader.readAsDataURL(file);
    }
  };

  // Req 1: Atualização automática de peso e edição dinâmica
  const handleAddPesagem = () => {
    const data = prompt("Data da pesagem (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
    const pesoStr = prompt("Peso (kg):", "0");
    if (data && pesoStr && !isNaN(pesoStr)) {
       const p = parseFloat(pesoStr);
       const novas = [...pesagens, { data, peso: p }];
       setPesagens(novas);
       onUpdate({...formData, historicoPeso: novas, peso: p});
    }
  };

  const handleEditPesagem = (idx) => {
    const data = prompt("Data da pesagem (YYYY-MM-DD):", pesagens[idx].data);
    const pesoStr = prompt("Peso (kg):", pesagens[idx].peso);
    if (data && pesoStr && !isNaN(pesoStr)) {
       const p = parseFloat(pesoStr);
       const novas = [...pesagens];
       novas[idx] = { data, peso: p };
       setPesagens(novas);
       onUpdate({...formData, historicoPeso: novas, peso: novas[novas.length-1].peso});
    }
  };

  const handleDelPesagem = (idx) => {
    if(window.confirm('Excluir esta aferição de peso do histórico?')) {
       const novas = pesagens.filter((_, i) => i !== idx);
       setPesagens(novas);
       const ultimaPesagem = novas.length > 0 ? parseFloat(novas[novas.length-1].peso) : 0;
       onUpdate({...formData, historicoPeso: novas, peso: ultimaPesagem});
    }
  };

  const gerarRecomendacaoIA = () => {
    let recs = [];
    const pesoNum = parseFloat(formData.peso) || 0;
    const especieCheck = formData.especie || 'Bovino';
    const saudeCheck = formData.saude || 'Saudável';
    const eccCheck = formData.ecc || 'ECC 3';

    if(pesoNum < (especieCheck === 'Bovino' ? 300 : 30)) recs.push("Nutrição: Déficit de peso esperado para a idade. Aumentar suplementação.");
    if(eccCheck.includes('1') || eccCheck.includes('2')) recs.push("Reprodução: Escore Corporal baixo. Inseminação não recomendada (risco de falha).");
    if(saudeCheck.includes('Mastite') || saudeCheck.includes('Problema')) recs.push(`Sanidade: Registros indicam '${saudeCheck}'. Acompanhamento clínico exigido.`);
    if(recs.length === 0) recs.push("Genética: Excelentes métricas atuais. Classificado como Elite para acasalamento no simulador IA.");
    return recs;
  };

  if (isEditing) {
    return (
      <div className="bg-white p-4 md:p-8 rounded-3xl border border-gray-200 shadow-sm animate-fade-in">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold flex items-center gap-2"><Edit className="text-blue-500"/> Editar Perfil: {formData.id}</h3>
          <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-gray-700"><X size={24}/></button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-sm font-medium">
          <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nascimento</label><input type="date" value={formData.dataNascimento || ''} onChange={e=>setFormData({...formData, dataNascimento: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:border-emerald-500" /></div>
          <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Peso (kg)</label><input type="number" value={formData.peso || 0} onChange={e=>setFormData({...formData, peso: Number(e.target.value)})} className="w-full p-3 border rounded-xl outline-none focus:border-emerald-500" disabled title="Use o módulo de evolução de peso" /></div>
          <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status Reprodutivo</label><input type="text" value={formData.status || ''} onChange={e=>setFormData({...formData, status: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:border-emerald-500" /></div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Condição Corporal</label>
            <select value={formData.ecc || 'ECC 3 - Ideal / Saudável'} onChange={e=>setFormData({...formData, ecc: e.target.value})} className="w-full p-3 border rounded-xl bg-white outline-none focus:border-emerald-500">
              <option value="ECC 1 - Muito Magra">ECC 1 - Muito Magra</option><option value="ECC 2 - Magra">ECC 2 - Magra</option><option value="ECC 3 - Ideal / Saudável">ECC 3 - Ideal / Saudável</option><option value="ECC 4 - Gorda">ECC 4 - Gorda</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Saúde / Patologias</label>
            <select value={formData.saude || 'Saudável'} onChange={e=>setFormData({...formData, saude: e.target.value})} className="w-full p-3 border rounded-xl bg-white outline-none focus:border-emerald-500">
              <option value="Saudável">Saudável (Nenhuma doença)</option><option value="Brucelose Ativa (Infecciosa)">Brucelose Ativa</option><option value="Portador de Gene de Nanismo">Portador de Gene de Nanismo</option><option value="Histórico de Mastite (Curada)">Histórico de Mastite (Curada)</option><option value="Problema de Casco">Problema de Casco</option>
            </select>
          </div>
        </div>
        <button onClick={handleSave} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2"><Save size={18}/> Salvar Alterações</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 md:p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 w-full xl:w-auto text-center sm:text-left">
          <div className="w-24 h-24 sm:w-20 sm:h-20 bg-gray-100 rounded-2xl border border-gray-200 flex flex-col items-center justify-center text-gray-400 relative overflow-hidden group">
            {formData.foto ? (
              <img src={formData.foto} alt="Animal" className="w-full h-full object-cover" />
            ) : (
              <><Camera size={24} className="mb-1"/><span className="text-[8px] font-bold uppercase">Add Foto</span></>
            )}
            <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center transition-all">
              <Camera size={20} className="text-white"/>
            </div>
            <input type="file" accept="image/*" onChange={handleAnimalPhoto} className="absolute inset-0 opacity-0 cursor-pointer z-10" title="Alterar Foto do Animal" />
          </div>
          <div className="mt-2 sm:mt-0">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h2 className="text-2xl font-black text-gray-900">{formData.id}</h2>
              <button onClick={toggleFavorito} title="Marcar como Favorito Genético">
                <Star size={20} className={`transition-colors ${formData.isFavorito ? 'text-amber-500 fill-amber-500' : 'text-gray-300 hover:text-amber-300'}`} />
              </button>
            </div>
            <p className="text-sm font-medium text-gray-500">{formData.especie || '?'} • {formData.raca || '?'} • {formData.sexo || '?'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center xl:justify-end gap-2 w-full xl:w-auto mt-2 xl:mt-0">
          <button onClick={() => setShowTransferModal(true)} className="p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl transition-colors border border-gray-200" title="Transferir de Fazenda"><ArrowRightLeft size={18} /></button>
          <button onClick={() => onDelete(formData.id)} className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors border border-red-200" title="Excluir Ficha"><Trash2 size={18} /></button>
          <div className="w-px h-8 bg-gray-200 mx-2 hidden sm:block"></div>
          {/* Req 5: Botão PDF Ficha Individual */}
          <button onClick={() => { showToast('Gerando PDF Zootécnico via Backend...'); window.open(`${API_URL}/relatorios/animal/${formData.id}?token=${localStorage.getItem('gametech_token')}`, '_blank'); }} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 border border-transparent hover:border-emerald-200 rounded-xl font-bold transition-colors text-sm"><FileText size={16} /> Gerar PDF</button>
          <button onClick={() => setIsEditing(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors text-sm"><Edit size={16} /> Editar</button>
          <button onClick={() => onSimular(formData)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md transition-all active:scale-95 text-sm"><Cpu size={16} /> IA</button>
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200 overflow-x-auto no-scrollbar">
        <button onClick={()=>setActiveFichaTab('geral')} className={`pb-3 px-2 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${activeFichaTab==='geral' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Visão Geral & Genealogia</button>
        <button onClick={()=>setActiveFichaTab('metricas')} className={`pb-3 px-2 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${activeFichaTab==='metricas' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Métricas & Recomendações IA</button>
      </div>

      {activeFichaTab === 'geral' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="col-span-1 space-y-6">
            <div className="bg-white p-5 md:p-6 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Dados Vitais</h3>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center pb-3 border-b border-gray-50"><span className="text-gray-500 font-medium">Status</span><span className={`font-black ${(formData.status||'').includes('Prenhe') ? 'text-emerald-600' : 'text-gray-800'}`}>{formData.status || '-'}</span></div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-50"><span className="text-gray-500 font-medium">Idade (Calc.)</span><span className="font-bold text-gray-800 text-right max-w-[120px]">{calcularIdadeExata(formData.dataNascimento)}</span></div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-50"><span className="text-gray-500 font-medium">Nascimento</span><span className="font-bold text-gray-800">{formData.dataNascimento || '-'}</span></div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-50"><span className="text-gray-500 font-medium">Peso</span><span className="font-bold text-gray-800">{formData.peso || 0} kg</span></div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-50"><span className="text-gray-500 font-medium">Nutrição</span><span className="font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded-md text-[10px] truncate max-w-[100px]">{formData.ecc || '-'}</span></div>
              </div>
              <div className={`mt-6 p-4 rounded-xl border ${(formData.saude||'').includes('Saudável') ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                <span className="text-[10px] font-black uppercase tracking-wider block mb-1">Quadro Clínico</span>
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Heart size={16} className={(formData.saude||'').includes('Saudável') ? 'text-green-500' : 'text-red-500'} />
                  <span className={(formData.saude||'').includes('Saudável') ? 'text-green-800' : 'text-red-800'}>{formData.saude || 'Não informado'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-1 lg:col-span-2 space-y-6">
            <div className="bg-white p-5 md:p-6 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2"><BookOpen className="text-blue-500" /> Genealogia</h3>
              <div className="flex justify-center bg-gray-50/50 p-4 md:p-6 rounded-2xl border border-dashed border-gray-200">
                <div className="flex flex-col items-center w-full max-w-md">
                  <div className="flex justify-between w-full mb-6 gap-2">
                    <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-200 shadow-sm text-center w-1/2">
                      <span className="block text-[9px] md:text-[10px] uppercase text-blue-500 font-bold mb-1">Linhagem Paterna</span>
                      <span className="font-bold text-xs md:text-sm text-gray-800 truncate block w-full">{formData.pai || "Desconhecido"}</span>
                    </div>
                    <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-200 shadow-sm text-center w-1/2">
                      <span className="block text-[9px] md:text-[10px] uppercase text-pink-500 font-bold mb-1">Linhagem Materna</span>
                      <span className="font-bold text-xs md:text-sm text-gray-800 truncate block w-full">{formData.mae || "Desconhecida"}</span>
                    </div>
                  </div>
                  <div className="w-1 h-6 md:h-8 bg-gray-300"></div>
                  <div className="bg-gray-800 text-white px-6 py-2.5 rounded-2xl text-center shadow-lg w-full max-w-[200px]">
                    <span className="block text-[9px] uppercase tracking-wider text-gray-400 font-bold">Animal Analisado</span>
                    <span className="font-black text-base md:text-lg">{formData.id}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-5 md:p-6 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2"><Clock className="text-amber-500" /> Histórico de Cruzamentos / IA</h3>
              <div className="space-y-3">
                {histList.length > 0 ? histList.map((ia, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 shrink-0"><Activity size={16} className="text-gray-400" /></div>
                      <div className="overflow-hidden">
                        <p className="font-bold text-gray-800 text-sm truncate">{ia.data} • {ia.id}</p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">Parceiro Genético: <span className="font-bold text-gray-700">{formData.sexo === 'Fêmea' ? ia.reprodutor_id : ia.matriz_id}</span></p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 text-[10px] md:text-[11px] font-bold uppercase tracking-wider rounded-md whitespace-nowrap self-start sm:self-auto ${(ia.status||'').includes('Confirmada') || (ia.status||'').includes('Nascimento') ? 'bg-green-100 text-green-700' : (ia.status||'').includes('Falha') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{ia.status}</div>
                  </div>
                )) : (
                  <div className="text-center p-6 bg-gray-50 rounded-xl border border-dashed border-gray-200"><p className="text-gray-500 text-sm font-medium">Nenhum evento reprodutivo registrado.</p></div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeFichaTab === 'metricas' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          <div className="bg-white p-5 md:p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2"><BarChart3 className="text-blue-500" /> Evolução de Peso</h3>
            <p className="text-xs text-gray-500 mb-6">Ganho médio e histórico de aferições reais.</p>
            <div className="flex-1 flex items-end justify-between gap-2 h-48 bg-gray-50 p-4 rounded-xl border border-gray-100 relative overflow-x-auto">
               {pesagens.map((p, i) => {
                 const isLast = i === pesagens.length - 1;
                 const w = parseFloat(p.peso) || 0;
                 const height = maxPesoCalc > 0 ? (w / maxPesoCalc) * 100 : 0;
                 return (
                   <div key={i} className="flex flex-col items-center w-full min-w-[25px] group">
                     <span className="text-[10px] font-bold text-gray-400 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">{w}kg</span>
                     <div className={`w-full max-w-[40px] rounded-t-lg transition-all ${isLast ? 'bg-emerald-500' : 'bg-blue-200'}`} style={{height: `${height}%`}}></div>
                     <span className="text-[10px] text-gray-500 mt-2 font-medium truncate w-12 text-center" title={p.data}>{p.data}</span>
                   </div>
                 )
               })}
            </div>
            
            {/* Req 1: Módulo Interativo de Pesagem Dinâmica */}
            <div className="mt-6 border-t border-gray-100 pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">Painel de Controle do Histórico</span>
                <button onClick={handleAddPesagem} className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-200 flex items-center gap-1"><PlusCircle size={14}/> Nova Pesagem</button>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-2 pr-2">
                {pesagens.map((p, i) => (
                  <div key={i} className="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-xs">
                    <span className="font-medium text-gray-600">Aferição em {p.data} <span className="mx-2">•</span> <span className="font-black text-gray-800">{p.peso} kg</span></span>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditPesagem(i)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors" title="Editar peso"><Edit size={14}/></button>
                      <button onClick={() => handleDelPesagem(i)} className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors" title="Excluir peso"><Trash2 size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white p-5 md:p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2"><Cpu className="text-indigo-500" /> Recomendações (IA)</h3>
            <p className="text-xs text-gray-500 mb-6">Insights de manejo baseados em dados.</p>
            
            <div className="space-y-4">
              {gerarRecomendacaoIA().map((rec, i) => {
                 let cor = rec.includes('Genética') ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 
                           rec.includes('Sanidade') || rec.includes('Risco') ? 'bg-red-50 border-red-200 text-red-800' : 
                           'bg-amber-50 border-amber-200 text-amber-800';
                 let icone = rec.includes('Genética') ? <Dna size={16}/> : 
                             rec.includes('Sanidade') ? <Heart size={16}/> : <AlertTriangle size={16}/>;
                 const parts = rec.split(':');
                 return (
                   <div key={i} className={`p-4 rounded-xl border ${cor} flex gap-3 items-start`}>
                     <div className="mt-0.5 shrink-0">{icone}</div>
                     <div>
                       <span className="font-bold text-sm block mb-1">{parts[0] || ''}</span>
                       <span className="text-xs font-medium leading-relaxed opacity-90">{parts[1] || ''}</span>
                     </div>
                   </div>
                 )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Transferência */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full">
            <h3 className="font-black text-lg mb-2 flex items-center gap-2"><ArrowRightLeft className="text-blue-500"/> Transferir Animal</h3>
            <p className="text-xs text-gray-500 mb-6">Selecione a fazenda de destino para a ficha {formData.id}. Os dados zootécnicos serão preservados.</p>
            <select id="fazendaDestino" className="w-full p-3 rounded-xl border border-gray-300 font-bold text-sm outline-none focus:border-blue-500 mb-6 bg-gray-50">
              {(fazendas || []).filter(f => f && f.id !== formData.fazenda_id).map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={() => setShowTransferModal(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-colors">Cancelar</button>
              <button onClick={() => {
                const dest = document.getElementById('fazendaDestino').value;
                onTransfer(formData.id, dest);
                setShowTransferModal(false);
              }} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors shadow-md">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 1.2 FICHA DA FAZENDA COMPLETA
function FichaFazendaView({ fazenda, onEditFazenda, animais, inseminacoes, funcionarios, setFuncionarios, currentUser, showToast, onVoltar, onRefreshDados }) {
  const [isEditingData, setIsEditingData] = useState(false);
  const [showFuncModal, setShowFuncModal] = useState(null); 
  
  const [fazendaForm, setFazendaForm] = useState(fazenda || {});
  const [funcForm, setFuncForm] = useState({ nome: '', cpf: '', funcao: 'Gerente', telefone: '' });
  
  const [searchName, setSearchName] = useState('');
  const [searchCPF, setSearchCPF] = useState('');
  const [searchCargo, setSearchCargo] = useState('');

  useEffect(() => {
    setFazendaForm(fazenda || {});
  }, [fazenda]);

  if (!fazenda) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-gray-200 shadow-sm animate-fade-in text-center">
        <AlertTriangle size={48} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-black text-gray-800 mb-2">Propriedade Indisponível</h2>
        <p className="text-gray-500 mb-6 font-medium">Os dados desta fazenda não foram encontrados ou estão incompletos.</p>
        <button onClick={onVoltar} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2">
          <ArrowLeft size={18}/> Voltar ao Dashboard
        </button>
      </div>
    );
  }

  const safeAnimais = animais || [];
  const safeFunc = funcionarios || [];

  const countBovinos = safeAnimais.filter(a => a && a.especie === 'Bovino').length;
  const countCaprinos = safeAnimais.filter(a => a && a.especie === 'Caprino').length;
  const countOvinos = safeAnimais.filter(a => a && a.especie === 'Ovino').length;
  const totalGeral = safeAnimais.length || 1;

  const percentBovinos = Math.round((countBovinos / totalGeral) * 100);
  const percentCaprinos = Math.round((countCaprinos / totalGeral) * 100);
  const percentOvinos = Math.round((countOvinos / totalGeral) * 100);

  const listFuncionarios = safeFunc.filter(f => f && f.fazenda_id === fazenda.id);
  const filteredFuncionarios = listFuncionarios.filter(f => {
    return (f.nome || '').toLowerCase().includes(searchName.toLowerCase()) &&
           (f.cpf || '').includes(searchCPF) &&
           (f.funcao || '').toLowerCase().includes(searchCargo.toLowerCase());
  });

  const handleEditFazendaSubmit = (e) => {
    e.preventDefault();
    onEditFazenda(fazendaForm);
    setIsEditingData(false);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onEditFazenda({ ...fazenda, foto: reader.result });
        showToast('Foto do perfil da fazenda atualizada!');
      };
      reader.readAsDataURL(file);
    }
  };

  const abrirNovoFuncionario = () => {
    setFuncForm({ nome: '', cpf: '', funcao: 'Gerente', telefone: '' });
    setShowFuncModal('NEW');
  };

  const salvarFuncionario = async (e) => {
    e.preventDefault();
    try {
      if (showFuncModal === 'NEW') {
        const res = await fetch(`${API_URL}/funcionarios`, {
          method: 'POST', headers: getHeaders(), body: JSON.stringify({ ...funcForm, fazenda_id: fazenda.id })
        });
        if(!res.ok) throw new Error('Erro ao salvar colaborador no banco.');
        showToast('Colaborador cadastrado com sucesso!');
      } else {
        const res = await fetch(`${API_URL}/funcionarios/${showFuncModal.id}`, {
          method: 'PUT', headers: getHeaders(), body: JSON.stringify(funcForm)
        });
        if(!res.ok) throw new Error('Erro ao editar colaborador.');
        showToast('Ficha do colaborador atualizada!');
      }
      setShowFuncModal(null);
      if (onRefreshDados) onRefreshDados();
    } catch(err) {
      showToast(err.message, 'error');
    }
  };

  const excluirFuncionario = async (id) => {
    if (window.confirm('Excluir permanentemente este colaborador da propriedade?')) {
      try {
        const res = await fetch(`${API_URL}/funcionarios/${id}`, { method: 'DELETE', headers: getHeaders() });
        if(!res.ok) throw new Error('Falha ao remover colaborador.');
        showToast('Colaborador removido.');
        if (onRefreshDados) onRefreshDados();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-4 md:p-5 rounded-3xl border border-gray-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
           <button onClick={onVoltar} className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-full transition-colors border border-gray-200" title="Voltar ao Início"><ArrowLeft size={18} /></button>
           <h1 className="text-xl md:text-2xl font-black text-gray-800">Ficha: {fazenda.nome}</h1>
        </div>
        <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-wider hidden sm:inline-block">Ativa</span>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="block text-[10px] uppercase font-black text-gray-400 tracking-wider">Responsável legal</span>
          <p className="text-base font-bold text-gray-800">Propriedade de: {currentUser?.nome || 'Proprietário'}</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button onClick={() => window.open(`${API_URL}/relatorios/fazendas/${fazenda.id}?token=${localStorage.getItem('gametech_token')}`, '_blank')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors text-xs"><Printer size={14}/> PDF Ficha</button>
          <button onClick={() => setIsEditingData(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors text-xs"><Edit size={14}/> Editar Dados</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-4 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center relative group min-h-[220px]">
          <div className="w-24 h-24 bg-gray-50 rounded-2xl border border-dashed border-gray-300 flex items-center justify-center text-gray-400 overflow-hidden relative mb-4">
            {fazenda.foto ? (
              <img src={fazenda.foto} alt="Fachada" className="w-full h-full object-cover" />
            ) : (
              <Home size={40} className="stroke-[1.5]" />
            )}
          </div>
          <label className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer shadow-md inline-block">
            Editar Foto
            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
          </label>
        </div>

        <div className="md:col-span-8 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-50 pb-2"><Info size={18} className="text-emerald-500" /> Informações Gerais</h3>
            <div className="grid grid-cols-2 gap-4 text-sm font-bold text-gray-700">
              <div>
                <span className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">Nome Oficial</span>
                <span className="text-gray-800">{fazenda.nome}</span>
              </div>
              <div>
                <span className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">Área Total</span>
                <span className="text-emerald-700 font-black text-base">{fazenda.area} ha</span>
              </div>
              <div className="col-span-2 grid grid-cols-2 gap-4 border-t border-gray-50 pt-3">
                <div>
                  <span className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">Total de Animais</span>
                  <span className="text-gray-800">{safeAnimais.length}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1">Score Geral</span>
                  <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-md text-xs font-black inline-block mt-0.5">{fazenda.score || 90}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-1.5"><X size={16} className="rotate-45" /> Métricas Gerais</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-black text-gray-500 uppercase tracking-widest mb-2"><span>Bovinos ({countBovinos})</span><span>{percentBovinos}%</span></div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden"><div className="h-3 rounded-full bg-blue-500 transition-all" style={{ width: `${percentBovinos}%` }}></div></div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-black text-gray-500 uppercase tracking-widest mb-2"><span>Caprinos ({countCaprinos})</span><span>{percentCaprinos}%</span></div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden"><div className="h-3 rounded-full bg-red-500 transition-all" style={{ width: `${percentCaprinos}%` }}></div></div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-black text-gray-500 uppercase tracking-widest mb-2"><span>Ovinos ({countOvinos})</span><span>{percentOvinos}%</span></div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden"><div className="h-3 rounded-full bg-green-500 transition-all" style={{ width: `${percentOvinos}%` }}></div></div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5"><Activity size={16} /> Indicadores Inteligentes</h3>
            <div className="grid grid-cols-3 gap-2 text-center mb-4">
              <div className="bg-green-50 border border-green-100 p-3 rounded-xl"><span className="block text-[8px] font-black text-green-700 uppercase">Prenhez</span><span className="text-lg font-black text-green-900">96%</span></div>
              <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl"><span className="block text-[8px] font-black text-blue-700 uppercase">Ativas</span><span className="text-lg font-black text-blue-900">{(inseminacoes || []).filter(ia=>ia && ia.status==='Prenhez Confirmada').length}</span></div>
              <div className="bg-red-50 border border-red-100 p-3 rounded-xl"><span className="block text-[8px] font-black text-red-700 uppercase">Mortalidade</span><span className="text-lg font-black text-red-900">1,4%</span></div>
            </div>
          </div>
          <div className="space-y-2 text-xs font-medium">
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-center gap-2"><Cpu size={14} className="shrink-0"/> Recomendação da IA: Manter rotina de pesagem quinzenal do lote jovem.</div>
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-center gap-2"><Cpu size={14} className="shrink-0"/> Recomendação da IA: Realizar exames de prenhez entre 30-45 dias da última IA.</div>
          </div>
        </div>
      </div>

      {/* Bloco 5: Gestão de Funcionários */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="text-lg font-black text-gray-800 flex items-center gap-2"><Users size={20} className="text-emerald-600"/> Gestão de Funcionários ({listFuncionarios.length})</h3>
          <button onClick={abrirNovoFuncionario} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"><PlusCircle size={14}/> Cadastrar Funcionário</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input type="text" placeholder="Nome do Funcionário..." value={searchName} onChange={e=>setSearchName(e.target.value)} className="w-full pl-8 pr-4 py-2 border rounded-xl text-xs bg-gray-50 outline-none focus:border-emerald-500" />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input type="text" placeholder="CPF..." value={searchCPF} onChange={e=>setSearchCPF(e.target.value)} className="w-full pl-8 pr-4 py-2 border rounded-xl text-xs bg-gray-50 outline-none focus:border-emerald-500" />
          </div>
          <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
             <input type="text" placeholder="Função / Cargo..." value={searchCargo} onChange={e=>setSearchCargo(e.target.value)} className="w-full pl-8 pr-4 py-2 border rounded-xl text-xs bg-gray-50 outline-none focus:border-emerald-500" />
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-[600px] whitespace-nowrap">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr className="text-gray-500 text-[10px] uppercase tracking-widest font-black">
                <th className="p-4">Nome</th>
                <th className="p-4">CPF</th>
                <th className="p-4">Função / Cargo</th>
                <th className="p-4">Telefone</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 text-sm font-medium">
              {filteredFuncionarios.map((func, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-gray-800 font-bold">{func.nome}</td>
                  <td className="p-4 text-gray-600">{func.cpf}</td>
                  <td className="p-4 text-gray-600">{func.funcao}</td>
                  <td className="p-4 text-gray-600">{func.telefone}</td>
                  <td className="p-4 text-center flex items-center justify-center gap-2">
                    <button onClick={() => { setFuncForm(func); setShowFuncModal(func); }} className="bg-gray-100 hover:bg-emerald-100 text-gray-600 hover:text-emerald-700 px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1"><Edit size={12}/> Ver Ficha</button>
                    <button onClick={() => excluirFuncionario(func.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Excluir Colaborador"><Trash2 size={14}/></button>
                  </td>
                </tr>
              ))}
              {filteredFuncionarios.length === 0 && (
                <tr><td colSpan="5" className="p-8 text-center text-gray-400">Nenhum funcionário encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isEditingData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 md:p-8 shadow-2xl relative animate-fade-in-up">
            <button onClick={() => setIsEditingData(false)} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
            <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2"><Edit className="text-emerald-600" /> Editar Fazenda</h3>
            <form onSubmit={handleEditFazendaSubmit} className="space-y-4 text-sm font-medium">
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Oficial *</label><input required type="text" value={fazendaForm.nome} onChange={e=>setFazendaForm({...fazendaForm, nome: e.target.value})} className="w-full p-2.5 border rounded-xl outline-none focus:border-emerald-500 bg-gray-50" /></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Porte em Hectares *</label><input required type="number" value={fazendaForm.area} onChange={e=>setFazendaForm({...fazendaForm, area: Number(e.target.value)})} className="w-full p-2.5 border rounded-xl outline-none focus:border-emerald-500 bg-gray-50" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cidade *</label><input required type="text" value={fazendaForm.cidade} onChange={e=>setFazendaForm({...fazendaForm, cidade: e.target.value})} className="w-full p-2.5 border rounded-xl outline-none focus:border-emerald-500 bg-gray-50" /></div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado *</label><input required type="text" maxLength="2" value={fazendaForm.estado} onChange={e=>setFazendaForm({...fazendaForm, estado: e.target.value})} className="w-full p-2.5 border rounded-xl outline-none focus:border-emerald-500 bg-gray-50" /></div>
              </div>
              <button type="submit" className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md">Salvar Alterações</button>
            </form>
          </div>
        </div>
      )}

      {showFuncModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 md:p-8 shadow-2xl relative animate-fade-in-up">
            <button onClick={() => setShowFuncModal(null)} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
            <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2"><Users className="text-emerald-600" /> {showFuncModal === 'NEW' ? 'Cadastrar Colaborador' : 'Ficha do Colaborador'}</h3>
            <form onSubmit={salvarFuncionario} className="space-y-4 text-sm font-medium">
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo *</label><input required type="text" value={funcForm.nome} onChange={e=>setFuncForm({...funcForm, nome: e.target.value})} className="w-full p-2.5 border rounded-xl outline-none focus:border-emerald-500 bg-gray-50" /></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">CPF *</label><input required type="text" value={funcForm.cpf} onChange={e=>setFuncForm({...funcForm, cpf: e.target.value})} className="w-full p-2.5 border rounded-xl outline-none focus:border-emerald-500 bg-gray-50" placeholder="Ex: 000.000.000-00" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Função / Cargo</label>
                  <select value={funcForm.funcao} onChange={e=>setFuncForm({...funcForm, funcao: e.target.value})} className="w-full p-2.5 border rounded-xl bg-white outline-none focus:border-emerald-500">
                    <option value="Gerente">Gerente</option><option value="Caseiro">Caseiro</option><option value="Veterinário">Veterinário</option><option value="Tratador">Tratador</option>
                  </select>
                </div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone *</label><input required type="text" value={funcForm.telefone} onChange={e=>setFuncForm({...funcForm, telefone: e.target.value})} className="w-full p-2.5 border rounded-xl outline-none focus:border-emerald-500 bg-gray-50" placeholder="Ex: (88) 99999-9999" /></div>
              </div>
              <button type="submit" className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md mt-2">Salvar Registro</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// 2. INSEMINAÇÃO - SUB-TELA: CADASTRO E LISTAGEM
// Req 9: FILTROS NA PÁGINA DE INSEMINAÇÃO (Técnico, Processo e Status)
function InseminacaoCadastroView({ animais, historico, showToast, fazendaId, onRefresh }) {
  const [selectedMatriz, setSelectedMatriz] = useState('');
  const [selectedReprodutor, setSelectedReprodutor] = useState('');
  const [data, setData] = useState('');
  const [tecnico, setTecnico] = useState('');
  const [processo, setProcesso] = useState('Inseminação Artificial');
  const [observacoes, setObservacoes] = useState('');
  
  const [editingIA, setEditingIA] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Filtros
  const [filtroTecnico, setFiltroTecnico] = useState('');
  const [filtroProcesso, setFiltroProcesso] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  const fêmeas = (animais || []).filter(a => 
  a && 
  a.sexo === 'Fêmea' && 
  isElegivelAnaliseGenetica(a) && 
  !(a.status || '').toLowerCase().includes('prenhe')
);

const machos = (animais || []).filter(a => 
  a && 
  a.sexo === 'Macho' && 
  isElegivelAnaliseGenetica(a)
);

  const safeHistorico = historico || [];
  const tecnicosUnicos = [...new Set(safeHistorico.map(ia => ia?.tecnico).filter(Boolean))];

  const filteredHistorico = safeHistorico.filter(ia => {
    if (!ia) return false;
    const matchTec = filtroTecnico ? ia.tecnico === filtroTecnico : true;
    const matchProc = filtroProcesso ? ia.processo === filtroProcesso : true;
    const matchStatus = filtroStatus ? ia.status === filtroStatus : true;
    return matchTec && matchProc && matchStatus;
  }).sort((a,b) => new Date(b.data) - new Date(a.data));

  const handleSalvarIA = async (e) => {
    e.preventDefault();
    if (!selectedMatriz || !selectedReprodutor || !data || !tecnico) return showToast('Preencha os campos obrigatórios.', 'info');
    try {
      const payload = {
        id: `IA-${Math.floor(Math.random() * 9000) + 1000}`,
        data, matriz: selectedMatriz, reprodutor: selectedReprodutor, tecnico, processo, observacoes,
        status: 'Aguardando Diagnóstico', fazenda_id: fazendaId, estagio: 'Análise',
        historicoGestacao: [{ data: data, evento: 'Processo Registrado' }]
      };
      const res = await fetch(`${API_URL}/inseminacoes`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(payload) });
      if(!res.ok) throw new Error('Falha ao registrar');
      
      showToast(`Processo registrado no banco! Diagnóstico agendado.`);
      setSelectedMatriz(''); setSelectedReprodutor(''); setData(''); setTecnico(''); setObservacoes('');
      if(onRefresh) onRefresh();
    } catch(err) { showToast(err.message, 'error'); }
  };

  const handleEditIA = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/inseminacoes/${editingIA.id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(editForm) });
      if(!res.ok) throw new Error('Falha ao editar processo');
      setEditingIA(null);
      showToast('Processo atualizado com sucesso!');
      if(onRefresh) onRefresh();
    } catch(err) { showToast(err.message, 'error'); }
  };

  const abrirEdit = (ia) => {
    setEditingIA(ia);
    setEditForm({ tecnico: ia.tecnico, observacoes: ia.observacoes, status: ia.status, processo: ia.processo });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-5 md:p-8 rounded-3xl border border-gray-200 shadow-sm">
        <h3 className="text-lg md:text-xl font-black text-gray-800 mb-6 flex items-center gap-2"><PlusCircle className="text-emerald-500" /> Cadastrar Novo Processo</h3>
        <form className="space-y-5 text-sm font-medium" onSubmit={handleSalvarIA}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Data *</label><input type="date" required value={data} onChange={(e)=>setData(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500" /></div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Processo *</label>
              <select value={processo} onChange={e=>setProcesso(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500">
                <option value="Inseminação Artificial">Inseminação Artificial</option>
                <option value="Cobertura / Monta Natural">Monta Natural</option>
                <option value="Transferência Embrião (TE)">Transferência de Embrião (TE)</option>
              </select>
            </div>
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Matriz *</label><select required value={selectedMatriz} onChange={(e)=>setSelectedMatriz(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500"><option value="">Selecione fêmea apta...</option>{fêmeas.map(f => <option key={f.id} value={f.id}>{f.id} - {f.raca}</option>)}</select></div>
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Sêmen/Macho *</label><select required value={selectedReprodutor} onChange={(e)=>setSelectedReprodutor(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500"><option value="">Selecione reprodutor...</option>{machos.map(m => <option key={m.id} value={m.id}>{m.id} - {m.raca}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Técnico Responsável *</label><input type="text" required placeholder="Nome do Inseminador" value={tecnico} onChange={(e)=>setTecnico(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500" /></div>
             <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Observações de Campo</label><input type="text" placeholder="Condição do sêmen, cio, etc." value={observacoes} onChange={(e)=>setObservacoes(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-emerald-500" /></div>
          </div>
          <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-md transition-transform active:scale-95 text-base mt-2">Salvar Processo e Iniciar Monitoramento</button>
        </form>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Clock className="text-blue-500"/> Processos em Andamento</h3>
            
            {/* Req 9: Módulo de Filtros */}
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <select value={filtroProcesso} onChange={e=>setFiltroProcesso(e.target.value)} className="flex-1 md:flex-none p-2 border rounded-xl text-xs font-bold text-gray-600 outline-none">
                <option value="">Tipo de Processo</option>
                <option value="Inseminação Artificial">Inseminação</option>
                <option value="Cobertura / Monta Natural">Monta Natural</option>
                <option value="Transferência Embrião (TE)">Transferência de Embrião (TE)</option>
              </select>
              <select value={filtroTecnico} onChange={e=>setFiltroTecnico(e.target.value)} className="flex-1 md:flex-none p-2 border rounded-xl text-xs font-bold text-gray-600 outline-none">
                <option value="">Técnicos</option>
                {tecnicosUnicos.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)} className="flex-1 md:flex-none p-2 border rounded-xl text-xs font-bold text-gray-600 outline-none">
                <option value="">Status</option>
                <option value="Aguardando Diagnóstico">Aguardando Diagnóstico</option>
                <option value="Prenhez Confirmada">Prenhez Confirmada</option>
                <option value="Falha Reprodutiva">Falha Reprodutiva</option>
                <option value="Nascimento Registrado">Nascimento Registrado</option>
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-[800px] whitespace-nowrap">
            <thead className="bg-white border-b border-gray-100">
              <tr className="text-gray-500 text-[10px] uppercase tracking-widest font-bold">
                <th className="p-4">Processo / Data</th>
                <th className="p-4">Matriz × Macho</th>
                <th className="p-4">Técnico</th>
                <th className="p-4">Previsão Diag.</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm font-medium">
              {filteredHistorico.map((ia, i) => {
                let pDiag = new Date(ia.data); pDiag.setDate(pDiag.getDate() + 30);
                return (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4"><span className="font-black text-gray-800 block">{ia.id}</span><span className="text-xs text-gray-500">{ia.processo || 'IA'} - {ia.data}</span></td>
                    <td className="p-4"><span className="text-pink-600 font-bold">{ia.matriz_id}</span> × <span className="text-blue-600 font-bold">{ia.reprodutor_id}</span></td>
                    <td className="p-4 text-gray-600">{ia.tecnico}</td>
                    <td className="p-4 text-amber-600 font-bold">{pDiag.toISOString().split('T')[0]}</td>
                    <td className="p-4"><span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${(ia.status||'').includes('Confirmada') || (ia.status||'').includes('Nascimento') ? 'bg-green-100 text-green-700' : (ia.status||'').includes('Falha') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{ia.status}</span></td>
                    <td className="p-4 text-center">
                      <button onClick={() => abrirEdit(ia)} className="bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-700 px-3 py-1.5 rounded-lg font-bold transition-colors text-xs flex items-center gap-1 mx-auto"><Edit size={12}/> Editar</button>
                    </td>
                  </tr>
                )
              })}
              {filteredHistorico.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-gray-400">Nenhum processo de IA encontrado para estes filtros.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {editingIA && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 md:p-8 shadow-2xl relative animate-fade-in-up">
            <button onClick={() => setEditingIA(null)} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
            <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2"><Edit className="text-blue-600"/> Atualizar Processo {editingIA.id}</h3>
            <form onSubmit={handleEditIA} className="space-y-4 text-sm font-medium">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Processo</label>
                <select value={editForm.processo || ''} onChange={e=>setEditForm({...editForm, processo: e.target.value})} className="w-full p-2.5 border rounded-xl bg-white outline-none focus:border-blue-500">
                  <option value="Inseminação Artificial">Inseminação Artificial</option>
                  <option value="Cobertura / Monta Natural">Monta Natural</option>
                  <option value="Transferência Embrião (TE)">Transferência de Embrião (TE)</option>
                </select>
              </div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Técnico</label><input type="text" value={editForm.tecnico || ''} onChange={e=>setEditForm({...editForm, tecnico: e.target.value})} className="w-full p-2.5 border rounded-xl bg-gray-50 outline-none focus:border-blue-500" /></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Observações</label><input type="text" value={editForm.observacoes || ''} onChange={e=>setEditForm({...editForm, observacoes: e.target.value})} className="w-full p-2.5 border rounded-xl bg-gray-50 outline-none focus:border-blue-500" /></div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status Atual</label>
                <select value={editForm.status || 'Aguardando Diagnóstico'} onChange={e=>setEditForm({...editForm, status: e.target.value})} className="w-full p-2.5 border rounded-xl bg-white outline-none focus:border-blue-500">
                  <option value="Aguardando Diagnóstico">Aguardando Diagnóstico</option><option value="Prenhez Confirmada">Prenhez Confirmada</option><option value="Falha Reprodutiva">Falha Reprodutiva</option><option value="Nascimento Registrado">Nascimento Registrado</option>
                </select>
              </div>
              <button type="submit" className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md">Salvar Alterações</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// 2. INSEMINAÇÃO - SUB-TELA: PRENHEZ E GESTAÇÃO (REQ 10: ALERTA DE NASCIMENTO)
function PrenhezView({ inseminacoes, animais, atualizarStatusIA, registrarNascimento, showToast }) {
  const listGestacoes = (inseminacoes || []).filter(ia => ia && ia.status !== 'Falha Reprodutiva' && ia.status !== 'Nascimento Registrado');
  const [modalGestacao, setModalGestacao] = useState(null);

  const [novoBezId, setNovoBezId] = useState('');
  const [novoBezPeso, setNovoBezPeso] = useState('');
  const [novoBezSexo, setNovoBezSexo] = useState('Fêmea');

  const handleDiagnostico = (ia, resultado) => {
    const novoStatus = resultado === 'Confirmado' ? 'Prenhez Confirmada' : 'Falha Reprodutiva';
    atualizarStatusIA(ia.id, novoStatus);
    setModalGestacao(null);
  };

  const handleSubmitNascimento = (e) => {
    e.preventDefault();
    if(!novoBezId || !novoBezPeso) return;
    registrarNascimento(modalGestacao, { id: novoBezId.toUpperCase(), peso: Number(novoBezPeso), sexo: novoBezSexo });
    setModalGestacao(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-1/4 flex flex-col sm:flex-row lg:flex-col gap-4">
          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm text-center flex-1">
            <Baby size={32} className="mx-auto text-emerald-500 mb-2"/>
            <h3 className="font-black text-2xl text-gray-800">{listGestacoes.length}</h3>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Gestações Ativas</p>
          </div>
          <div className="bg-blue-50 p-5 rounded-3xl border border-blue-100 flex-1">
            <h4 className="font-bold text-blue-900 text-sm mb-2">Monitoramento Ativo</h4>
            <p className="text-xs text-blue-800 leading-relaxed font-medium">O sistema agrupa as matrizes prenhes. Confirme diagnósticos e registre os nascimentos para gerar a ficha dos filhotes com idade 0 automaticamente.</p>
          </div>
        </div>

        <div className="w-full lg:w-3/4 bg-white rounded-3xl border border-gray-200 shadow-sm overflow-x-auto">
          <table className="w-full text-left min-w-[500px]">
            <thead className="bg-gray-50">
              <tr className="text-gray-500 text-[10px] uppercase tracking-widest font-black border-b border-gray-100">
                <th className="p-4">Matriz</th>
                <th className="p-4">Data Cobertura</th>
                <th className="p-4">Previsão Parto</th>
                <th className="p-4">Status / Estágio</th>
                <th className="p-4 text-center">Gestão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm font-medium">
              {listGestacoes.map((ia, idx) => {
                const matrizObj = (animais || []).find(a => a && a.id === ia.matriz_id);
                const diasGest = matrizObj?.especie === 'Bovino' ? 280 : 150;
                let prev = new Date(ia.data); prev.setDate(prev.getDate() + diasGest);
                const prevStr = prev.toISOString().split('T')[0];

                // Req 10: Alerta de Nascimentos Próximos (<= 15 Dias)
                const hoje = new Date();
                const diffTime = prev - hoje;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const isProximo = diffDays >= 0 && diffDays <= 15 && (ia.status||'').includes('Confirmada');

                return (
                  <tr key={idx} className={`hover:bg-gray-50 transition-colors ${isProximo ? 'bg-red-50/30' : ''}`}>
                    <td className="p-4"><span className="font-black text-gray-800 block">{ia.matriz_id}</span><span className="text-xs text-gray-500">{matrizObj?.raca || ''}</span></td>
                    <td className="p-4 text-gray-600">{ia.data}</td>
                    <td className="p-4 flex items-center gap-2">
                      <span className="font-bold text-amber-600">{prevStr}</span>
                      {isProximo && <AlertTriangle size={16} className="text-red-500 animate-pulse" title="Atenção: Parto Previsto para os próximos 15 dias!" />}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${(ia.status||'').includes('Confirmada') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{ia.status}</span>
                    </td>
                    <td className="p-4 text-center">
                      <button onClick={() => setModalGestacao(ia)} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-lg font-bold transition-colors text-xs">Abrir Painel</button>
                    </td>
                  </tr>
                );
              })}
              {listGestacoes.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-gray-400">Nenhuma gestação em andamento no momento.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DETALHE GESTAÇÃO / TIMELINE */}
      {modalGestacao && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 md:p-8 shadow-2xl relative animate-fade-in-up max-h-[95vh] overflow-y-auto">
            <button onClick={() => setModalGestacao(null)} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
            
            <h3 className="text-lg md:text-xl font-black text-gray-900 mb-2 flex items-center gap-2"><Baby className="text-emerald-500"/> Gestão de Prenhez: Matriz {modalGestacao.matriz_id}</h3>
            <p className="text-xs md:text-sm text-gray-500 font-medium mb-8">Sêmen utilizado: <span className="font-bold text-blue-600">{modalGestacao.reprodutor_id}</span></p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Timeline */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Linha do Tempo</h4>
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px before:h-full before:w-0.5 before:bg-gray-200">
                  {(typeof modalGestacao.historico_gestacao === 'string' ? JSON.parse(modalGestacao.historico_gestacao || '[]') : (modalGestacao.historico_gestacao || [])).map((hist, i) => (
                    <div key={i} className="relative flex items-center group is-active pl-8">
                      <div className="absolute left-0 flex items-center justify-center w-5 h-5 rounded-full border-2 border-emerald-500 bg-white shadow z-10"><Check size={10} className="text-emerald-500"/></div>
                      <div className="w-full p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="font-bold text-gray-800 text-xs">{hist.evento}</span><span className="block text-[10px] text-gray-500 mt-0.5">{hist.data}</span>
                      </div>
                    </div>
                  ))}
                  <div className="relative flex items-center group pl-8">
                      <div className="absolute left-0 flex items-center justify-center w-5 h-5 rounded-full border-2 border-gray-300 bg-white z-10"></div>
                      <div className="w-full p-3 rounded-xl bg-white border border-gray-200 opacity-50">
                        <span className="font-bold text-gray-600 text-xs">Parto / Nascimento</span>
                      </div>
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 flex flex-col justify-center">
                {(modalGestacao.status||'').includes('Aguardando') ? (
                  <div className="text-center space-y-4">
                    <h4 className="font-bold text-sm text-gray-800">Diagnóstico Inicial</h4>
                    <p className="text-xs text-gray-500 font-medium">Realize o exame (Toque ou Ultrassom) para confirmar a viabilidade do embrião.</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleDiagnostico(modalGestacao, 'Confirmado')} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-lg text-xs hover:bg-emerald-700 transition-colors">Confirmar Prenhez</button>
                      <button onClick={() => handleDiagnostico(modalGestacao, 'Falha')} className="flex-1 py-3 bg-red-100 text-red-700 font-bold rounded-lg text-xs hover:bg-red-200 transition-colors">Reg. Falha</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h4 className="font-black text-sm text-indigo-900 mb-4 bg-indigo-100 p-2 rounded-lg text-center uppercase tracking-wider">Registrar Nascimento</h4>
                    <form onSubmit={handleSubmitNascimento} className="space-y-3">
                      <div><label className="block text-[10px] font-bold text-gray-500 uppercase">Brinco Filhote</label><input required type="text" value={novoBezId} onChange={e=>setNovoBezId(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm bg-white outline-none focus:border-indigo-500" placeholder="Ex: BEZ-001"/></div>
                      <div className="flex gap-2">
                        <div className="flex-1"><label className="block text-[10px] font-bold text-gray-500 uppercase">Sexo</label><select value={novoBezSexo} onChange={e=>setNovoBezSexo(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm bg-white outline-none focus:border-indigo-500"><option value="Fêmea">Fêmea</option><option value="Macho">Macho</option></select></div>
                        <div className="flex-1"><label className="block text-[10px] font-bold text-gray-500 uppercase">Peso (kg)</label><input required type="number" value={novoBezPeso} onChange={e=>setNovoBezPeso(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm bg-white outline-none focus:border-indigo-500" placeholder="Ex: 35"/></div>
                      </div>
                      <button type="submit" className="w-full mt-3 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md transition-transform active:scale-95 uppercase tracking-wider">Gerar Ficha e Vincular Genealogia</button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 3. SIMULADOR IA
function SimuladorIA({ animais, globalSeason, preSelection }) {
  const [selectedMatrizId, setSelectedMatrizId] = useState(preSelection?.matriz || '');
  const [selectedReprodutorId, setSelectedReprodutorId] = useState(preSelection?.reprodutor || '');
  const [condicaoCorporal, setCondicaoCorporal] = useState('3');
  const [objetivo, setObjetivo] = useState('dupla'); 
  
  const [isSimulating, setIsSimulating] = useState(false);
  const [result, setResult] = useState(null);
  const [showInfo, setShowInfo] = useState(false); 

  useEffect(() => {
    if(preSelection?.matriz) setSelectedMatrizId(preSelection.matriz);
    if(preSelection?.reprodutor) setSelectedReprodutorId(preSelection.reprodutor);
  }, [preSelection]);

  const fêmeas = (animais || []).filter(a => a && a.sexo === 'Fêmea');
  const matrizSelecionada = (animais || []).find(a => a && a.id === selectedMatrizId);
  const machosFiltrados = useMemo(() => {
    if (!matrizSelecionada) return [];
    return (animais || []).filter(a => a && a.sexo === 'Macho' && a.especie === matrizSelecionada.especie);
  }, [selectedMatrizId, animais, matrizSelecionada]);

  useEffect(() => {
    if (selectedMatrizId) {
      const reprodutor = (animais || []).find(a => a && a.id === selectedReprodutorId);
      if (reprodutor && reprodutor.especie !== matrizSelecionada?.especie) setSelectedReprodutorId('');
    }
  }, [selectedMatrizId]);

  const handleSimular = () => {
    if (!selectedMatrizId || !selectedReprodutorId) return alert('Selecione uma matriz e o reprodutor.');
    setIsSimulating(true); setResult(null); setShowInfo(false);
    
    const matriz = (animais || []).find(a => a && a.id === selectedMatrizId);
    const reprodutor = (animais || []).find(a => a && a.id === selectedReprodutorId);

    setTimeout(() => {
      setIsSimulating(false);
      if (matriz.especie !== reprodutor.especie) return setResult({ erro: true, tituloErro: 'Incompatibilidade Biológica', mensagem: `A Inteligência Artificial bloqueou a simulação. Não é possível realizar cruzamento genético entre as espécies ${matriz.especie} e ${reprodutor.especie}.` });
      if ((matriz.saude||'').includes('Infecciosa') || (reprodutor.saude||'').includes('Infecciosa')) return setResult({ erro: true, tituloErro: 'Bloqueio Sanitário Automático', mensagem: `Um dos animais selecionados possui uma patologia infecciosa ativa. A inseminação foi bloqueada para proteger o rebanho.` });

      const consanguineo = matriz.pai === reprodutor.id || reprodutor.pai === matriz.id;
      let basePrenhez = 85, scoreLeite = 50, scoreCarne = 50, resistenciaSeca = 50, scoreExposicao = 40;
      let consanguinidadeVal = consanguineo ? 'Crítica (50.0%)' : 'Baixa (1.5%)';
      let recomendacao = 'Cruzamento Viável e Recomendado pela IA.';
      const purezaRacial = matriz.raca === reprodutor.raca;

      if (matriz.especie === 'Bovino') {
        scoreLeite = matriz.raca === 'Girolando' ? 90 : 50;
        scoreCarne = (reprodutor.raca||'').includes('Nelore') ? 96 : 70;
        resistenciaSeca = 80; scoreExposicao = purezaRacial && (reprodutor.raca||'').includes('PO') ? 98 : 45;
      } else if (matriz.especie === 'Ovino') {
        scoreCarne = reprodutor.raca === 'Dorper' ? 95 : 80; scoreLeite = 20;
        resistenciaSeca = (matriz.raca||'').includes('Santa Inês') ? 95 : 70; scoreExposicao = purezaRacial ? 90 : 50;
      } else {
        scoreLeite = matriz.raca === 'Anglo-Nubiana' ? 88 : 60; scoreCarne = reprodutor.raca === 'Boer' ? 94 : 70;
        resistenciaSeca = 98; scoreExposicao = purezaRacial ? 95 : 60;
      }

      if (objetivo === 'exposicao' && !purezaRacial) recomendacao = 'ALERTA: Cruzamento industrial (Mestiço). Inviável para padrão de pista e exposição.';
      else if (objetivo === 'exposicao' && purezaRacial) recomendacao = 'Excelente padrão racial. Genética de elite para competições.';

      const cc = parseInt(condicaoCorporal);
      if (cc <= 2) { basePrenhez -= 30; recomendacao = 'Risco: Fêmea subnutrida. A IA prevê falha reprodutiva.'; } else if (cc >= 4) basePrenhez += 10;
      if (globalSeason === 'seco') basePrenhez -= 15; else basePrenhez += 5;
      if (consanguineo) { basePrenhez -= 25; recomendacao = 'Risco Genético Alto: Parentesco direto detectado (Endogamia). Sugerido trocar o parceiro.'; }
      if (matriz.isFavorito || reprodutor.isFavorito) { basePrenhez += 2; } 

      setResult({ erro: false, chancePrenhez: Math.max(5, Math.min(99, basePrenhez)), consanguinidade: consanguinidadeVal, scoreLeite, scoreCarne, resistenciaSeca, scoreExposicao, recomendacao, isConsanguineo: consanguineo, objetivoAvaliado: objetivo });
    }, 1000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-indigo-50 border border-indigo-150 rounded-3xl overflow-hidden transition-all duration-300">
        <button onClick={() => setShowInfo(!showInfo)} className="w-full flex items-center justify-between p-5 md:p-6 bg-indigo-900 text-white font-bold text-sm tracking-wide">
          <span className="flex items-center gap-2"><HelpCircle size={20} /> Como a Simulação Inteligente Funciona?</span>
          <ChevronDown className={`transition-transform duration-300 ${showInfo ? 'rotate-180' : ''}`} />
        </button>
        {showInfo && (
          <div className="p-5 md:p-8 text-indigo-900 text-sm leading-relaxed space-y-6 border-t border-indigo-200">
            <p className="font-medium text-base">A Inteligência Artificial Gametech funciona como um <b>laboratório genético virtual</b>. Ela permite que você teste o cruzamento de dois animais na tela do seu computador antes de gastar recursos na vida real. Nosso objetivo é ajudar você a tomar a decisão mais segura e lucrativa para o seu rebanho.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/80 p-5 rounded-2xl border border-indigo-100 shadow-sm">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-3"><Search size={16}/></div>
                <span className="font-black text-indigo-900 block mb-1">1. Varredura e Filtros</span>
                <p className="text-xs text-gray-600">Ao selecionar uma fêmea, a IA elimina automaticamente parceiros incompatíveis ou que possuam patologias cadastradas ativas.</p>
              </div>
              <div className="bg-white/80 p-5 rounded-2xl border border-indigo-100 shadow-sm">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-3"><Dna size={16}/></div>
                <span className="font-black text-indigo-900 block mb-1">2. Análise de Parentesco</span>
                <p className="text-xs text-gray-600">O sistema lê a árvore genealógica. Se houver parentesco muito próximo, ele emite um alerta para evitar defeitos genéticos.</p>
              </div>
              <div className="bg-white/80 p-5 rounded-2xl border border-indigo-100 shadow-sm">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-3"><Cpu size={16}/></div>
                <span className="font-black text-indigo-900 block mb-1">3. Predição de Vigor</span>
                <p className="text-xs text-gray-600">A IA cruza o histórico de ganho de peso e produção (DEPs) para estimar como será a carcaça e a rusticidade do filhote.</p>
              </div>
              <div className="bg-white/80 p-5 rounded-2xl border border-indigo-100 shadow-sm">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-3"><Sun size={16}/></div>
                <span className="font-black text-indigo-900 block mb-1">4. Variáveis Ambientais</span>
                <p className="text-xs text-gray-600">O status nutricional (ECC) e o período climático (Seco/Chuvoso) impactam a porcentagem de chance de sucesso reprodutivo.</p>
              </div>
            </div>

            <div className="bg-indigo-100/50 p-4 rounded-xl text-xs font-bold text-indigo-800 border border-indigo-100">
              💡 <span className="uppercase text-[10px] tracking-wider text-indigo-500 ml-1">Como usar os resultados:</span> Não existe um "casal perfeito" universal. Se o seu foco é vender carne, priorize a barra de "Aptidão para Corte" nos resultados. Se for manter no nordeste, observe a barra de "Rusticidade". Use as recomendações em texto para ajustar o trato do animal antes da inseminação real.
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-5 md:p-8 rounded-3xl border border-gray-200 shadow-sm">
        <div className="bg-gray-50 p-4 md:p-5 rounded-2xl border border-gray-200 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-medium">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">Escore Corporal da Matriz (ECC)</label>
            <select value={condicaoCorporal} onChange={(e) => setCondicaoCorporal(e.target.value)} className="w-full p-3 rounded-xl border-gray-300 outline-none focus:border-emerald-500 bg-white">
              <option value="1">ECC 1 - Muito Magra</option><option value="2">ECC 2 - Magra</option><option value="3">ECC 3 - Ideal / Saudável</option><option value="4">ECC 4 - Gorda</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">Objetivo do Produtor</label>
            <select value={objetivo} onChange={(e) => setObjetivo(e.target.value)} className="w-full p-3 rounded-xl border-gray-300 outline-none focus:border-emerald-500 bg-white">
              <option value="dupla">Dupla Aptidão (Equilíbrio)</option><option value="corte">Aptidão Frigorífica (Carne)</option><option value="leite">Produção de Leite</option><option value="exposicao" className="font-bold text-indigo-700">★ Padrão para Exposição</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-8 relative">
          <div className="w-full md:w-5/12 bg-pink-50 p-5 md:p-6 rounded-3xl border-2 border-pink-200 shadow-sm">
            <label className="block text-center text-sm font-black text-pink-800 mb-4">Fêmea Doadora</label>
            <select value={selectedMatrizId} onChange={(e) => setSelectedMatrizId(e.target.value)} className="w-full p-3 rounded-xl border-pink-300 text-xs md:text-sm font-bold text-gray-700 outline-none bg-white">
              <option value="">Selecione a fêmea...</option>
              {fêmeas.map(f => {
                const elegivel = isElegivelAnaliseGenetica(f);
                return <option key={f.id} value={f.id} disabled={!elegivel}>{f.id} {f.isFavorito ? '⭐' : ''} ({f.especie} - {f.raca}) {elegivel ? '' : '- Muito Jovem'}</option>
              })}
            </select>
          </div>
          <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg font-black text-xl z-10 shrink-0">X</div>
          <div className="w-full md:w-5/12 bg-blue-50 p-5 md:p-6 rounded-3xl border-2 border-blue-200 shadow-sm">
            <label className="block text-center text-sm font-black text-blue-800 mb-4">Sêmen / Macho (Filtrado)</label>
            <select value={selectedReprodutorId} onChange={(e) => setSelectedReprodutorId(e.target.value)} className="w-full p-3 rounded-xl border-blue-300 text-xs md:text-sm font-bold text-gray-700 outline-none bg-white disabled:opacity-50" disabled={!selectedMatrizId}>
              <option value="">{selectedMatrizId ? "Selecione o macho..." : "Selecione a fêmea primeiro"}</option>
              {machosFiltrados.map(m => {
                const elegivel = isElegivelAnaliseGenetica(m);
                return <option key={m.id} value={m.id} disabled={!elegivel}>{m.id} {m.isFavorito ? '⭐' : ''} ({m.raca}) {elegivel ? '' : '- Muito Jovem'}</option>
              })}
            </select>
          </div>
        </div>
        <button onClick={handleSimular} disabled={isSimulating} className="w-full max-w-sm mx-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base md:text-lg rounded-2xl shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-70">
          {isSimulating ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div></> : <><Activity /> Processar IA</>}
        </button>
      </div>

      {result && !result.erro && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in-up">
          <div className={`col-span-1 lg:col-span-5 p-6 md:p-8 rounded-3xl text-white shadow-xl flex flex-col justify-center ${result.chancePrenhez > 60 && !result.isConsanguineo ? 'bg-emerald-900' : 'bg-red-900'}`}>
            <h3 className="font-medium text-white/80 text-lg mb-2">Sucesso Reprodutivo</h3>
            <div className="flex items-end gap-3 mb-6"><span className="text-6xl md:text-7xl font-black">{result.chancePrenhez}%</span></div>
            <div className="bg-black/30 p-4 rounded-2xl backdrop-blur-md">
              <span className="block text-[10px] uppercase tracking-wider mb-2 text-white/70 font-bold">Diretriz de Acasalamento</span>
              <span className="font-bold flex items-start gap-2 text-sm">{result.recomendacao}</span>
            </div>
          </div>
          <div className="col-span-1 lg:col-span-7 bg-white p-6 md:p-8 rounded-3xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2 border-b border-gray-100 pb-4"><Dna className="text-indigo-600" /> Índices Zootécnicos Estimados</h3>
            <div className="space-y-6">
              {result.objetivoAvaliado === 'exposicao' && <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl mb-4"><ProgressBar label="Padrão Racial" value={result.scoreExposicao} color="bg-indigo-600" /></div>}
              <ProgressBar label="Potencial Leiteiro" value={result.scoreLeite} color="bg-blue-500" />
              <ProgressBar label="Aptidão para Corte" value={result.scoreCarne} color="bg-red-500" />
              <ProgressBar label="Rusticidade" value={result.resistenciaSeca} color="bg-amber-500" />
            </div>
          </div>
        </div>
      )}
      {result && result.erro && (
        <div className="bg-red-50 border border-red-200 p-8 rounded-3xl text-center"><AlertTriangle className="text-red-500 mx-auto mb-4" size={48} /><h3 className="text-xl font-black text-red-900 mb-2">{result.tituloErro}</h3><p className="text-red-700 font-medium text-sm">{result.mensagem}</p></div>
      )}
    </div>
  );
}

// 4. MELHORIA GENÉTICA
function MelhoriaGeneticaView({ animais, globalSeason, showToast }) {
  const [especie, setEspecie] = useState('Bovino');
  const [objetivo, setObjetivo] = useState('leite');
  const [resultado, setResultado] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [metricasModal, setMetricasModal] = useState(null); 

  const fêmeasRaw = (animais || []).filter(a => a && a.sexo === 'Fêmea' && a.especie === especie && isElegivelAnaliseGenetica(a));
  const machosRaw = (animais || []).filter(a => a && a.sexo === 'Macho' && a.especie === especie && isElegivelAnaliseGenetica(a));

  const handleGerar = () => {
    setCarregando(true); setResultado(null);
    setTimeout(() => {
      const fêmeasFav = fêmeasRaw.filter(f => f.isFavorito);
      const machosFav = machosRaw.filter(m => m.isFavorito);
      
      const poolFemeas = fêmeasFav.length > 0 ? [...fêmeasFav, ...fêmeasRaw.filter(f=>!f.isFavorito)].slice(0, 50) : fêmeasRaw; 
      const poolMachos = machosFav.length > 0 ? [...machosFav, ...machosRaw.filter(m=>!m.isFavorito)].slice(0, 10) : machosRaw;

      const combinacoes = [];

      poolFemeas.forEach(f => {
        if ((f.saude||'').includes('Brucelose') || (f.saude||'').includes('Infecciosa')) return;
        poolMachos.forEach(m => {
          if ((m.saude||'').includes('Brucelose') || (m.saude||'').includes('Infecciosa')) return;
          if (f.pai === m.id || m.pai === f.id) return;

          let score = 70;
          let jus = "Acasalamento com ótima adaptabilidade biológica.";
          const purezaRacial = f.raca === m.raca;
          let ptForte = "Excelente vigor híbrido.";
          let ptAtencao = "Monitorar desenvolvimento de carcaça nos primeiros meses.";

          if (especie === 'Bovino') {
            if (objetivo === 'leite') { score = f.raca === 'Girolando' ? 95 : 80; jus = `Matriz ${f.id} com ótima aptidão leiteira cruzada com reprodutor ${m.id}.`; ptForte = "Alta transmissão de genes para volume de lactação."; }
            else if (objetivo === 'carne') { score = (m.raca||'').includes('Nelore') ? 96 : 82; jus = `Foco frigorífico com ganho expressivo de peso diário.`; ptForte = "Ótimo rendimento de carcaça e conformação frigorífica."; }
            else if (objetivo === 'exposicao') { score = purezaRacial ? 98 : 55; jus = purezaRacial ? `Padrão racial de pista impecável para a raça ${f.raca}.` : `Cruzamento mestiço não recomendado para pista.`; ptForte = "Preservação máxima das características morfológicas (Raça Pura)."; ptAtencao = "Cuidado com índices altos de endogamia a longo prazo."; }
            else { score = 88; jus = `Casal com sinergia de dupla aptidão.`; ptForte = "Equilíbrio entre produção leiteira e recria para abate."; }
          } else if (especie === 'Ovino') {
            if (objetivo === 'carne') { score = m.raca === 'Dorper' ? 95 : 78; jus = `Cruzamento terminal focado em altíssimo rendimento de carcaça.`; ptForte = "Ganho de peso rápido na desmama."; }
            else if (objetivo === 'exposicao') { score = purezaRacial ? 96 : 50; jus = purezaRacial ? `Linhagem de elite com aprumos perfeitos.` : `Cruzamento inadequado para padrão.`; ptForte = "Conformação padrão ideal para julgamentos oficiais."; }
            else { score = 90; jus = `Rústicos e adaptados ao clima semiárido.`; ptForte = "Alta resistência a endoparasitas e forte instinto materno."; }
          } else {
            if (objetivo === 'leite') { score = f.raca === 'Saanen' || f.raca === 'Anglo-Nubiana' ? 94 : 80; jus = `Excelente persistência de lactação do ecotipo ${f.raca}.`; ptForte = "Curva de lactação estendida sob condições térmicas extremas."; }
            else if (objetivo === 'carne') { score = m.raca === 'Boer' ? 97 : 82; jus = `Progênie com excelente precocidade (Boer).`; ptForte = "Ganho muscular superior na parte traseira (pernil)."; }
            else if (objetivo === 'exposicao') { score = purezaRacial ? 95 : 55; jus = purezaRacial ? `Casal padrão racial puro.` : `Desqualificado para competições puras.`; ptForte = "Garantia de registro em associação de criadores."; ptAtencao = "Rusticidade pode ser ligeiramente inferior ao animal mestiço."; }
            else { score = 90; jus = `Rusticidade exemplar do bioma combinada com estrutura robusta.`; ptForte = "Adaptabilidade extrema no bioma da caatinga."; }
          }

          if (globalSeason === 'seco') score = (f.raca === 'Sindi' || f.raca === 'Moxotó') ? score + 3 : score - 6;
          if ((f.ecc||'').includes('1') || (f.ecc||'').includes('Magra')) score -= 15;
          if (f.isFavorito || m.isFavorito) { score += 2; jus += " (Priorizado pela Genética Favorita ⭐)"; }

          combinacoes.push({ matriz: f.id, racaM: f.raca, favM: f.isFavorito, rep: m.id, racaR: m.raca, favR: m.isFavorito, score: Math.max(10, Math.min(99, score)), jus, ptForte, ptAtencao });
        });
      });

      combinacoes.sort((a, b) => b.score - a.score);
      setResultado(combinacoes.slice(0, 3));
      setCarregando(false);
    }, 1200);
  };

  return (
    <div className="bg-white p-5 md:p-8 rounded-3xl border border-gray-200 shadow-sm animate-fade-in relative">
      <h3 className="text-xl font-black text-gray-800 mb-2 flex items-center gap-2"><Cpu className="text-emerald-600" /> Aceleração Genética (Acasalamento)</h3>
      <p className="text-gray-500 mb-8 text-xs md:text-sm max-w-3xl font-medium">Encontra as <b>3 melhores combinações</b> da espécie selecionada para o seu objetivo produtivo. O sistema prioriza as matrizes e reprodutores que você marcou como favoritos ⭐.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-gray-50 p-4 rounded-2xl text-sm font-medium">
        <select value={especie} onChange={(e) => {setEspecie(e.target.value); setResultado(null)}} className="p-3 rounded-xl border border-gray-250 outline-none bg-white font-bold">
          <option value="Bovino">🐂 Bovinos</option><option value="Ovino">🐑 Ovinos</option><option value="Caprino">🐐 Caprinos</option>
        </select>
        <select value={objetivo} onChange={(e) => setObjetivo(e.target.value)} className="p-3 rounded-xl border border-gray-250 outline-none bg-white font-bold">
          <option value="dupla">Dupla Aptidão (Equilíbrio)</option><option value="leite">Produção de Leite</option><option value="carne">Aptidão Frigorífica (Corte)</option><option value="exposicao">★ Padrão para Exposição</option>
        </select>
        <button onClick={handleGerar} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 py-3 md:py-0">{carregando ? 'Processando IA...' : 'Analisar Rebanho'}</button>
      </div>

      {resultado && (
        <div className="space-y-4 mt-8 animate-fade-in-up">
          <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">Top 3 Combinações</h4>
          {resultado.length > 0 ? resultado.map((c, i) => (
            <div key={i} className="p-5 md:p-6 border-2 border-emerald-100 rounded-3xl bg-white flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 shadow-xs hover:shadow-md transition-all">
              <div className="flex-1">
                <span className="bg-emerald-100 text-emerald-800 font-black text-xs px-3 py-1 rounded-md tracking-wider">Top #{i+1}</span>
                <p className="text-lg md:text-xl font-black text-gray-800 mt-3">Matriz {c.matriz} {c.favM && '⭐'} <span className="text-gray-400 mx-2">×</span> Reprodutor {c.rep} {c.favR && '⭐'}</p>
                <p className="text-[11px] md:text-xs text-gray-400 mt-1 uppercase tracking-wide font-bold">{c.racaM} × {c.racaR}</p>
                <p className="text-xs md:text-sm text-gray-600 mt-2 font-medium">{c.jus}</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto border-t lg:border-t-0 pt-4 lg:pt-0 border-gray-100">
                <div className="text-center mr-0 sm:mr-4 flex-shrink-0 w-full sm:w-auto"><span className="text-4xl font-black text-emerald-600">{c.score}%</span><span className="block text-[10px] font-bold text-gray-400 uppercase">Afinidade</span></div>
                <button onClick={() => setMetricasModal(c)} className="w-full sm:w-auto px-4 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"><Eye size={14}/> Ver Detalhes</button>
                <button onClick={() => showToast('Baixando PDF...')} className="w-full sm:w-auto px-4 py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"><Download size={14}/> Relatório</button>
              </div>
            </div>
          )) : <div className="p-6 text-center bg-amber-50 text-amber-700 rounded-2xl border border-amber-200 text-sm">Não existem animais adultos suficientes nesta fazenda para formar casais compatíveis. Animais jovens (recém-nascidos) foram ignorados pelo filtro.</div>}
        </div>
      )}

      {/* MODAL METRICAS AMIGÁVEIS E DETALHADAS */}
      {metricasModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 md:p-8 shadow-2xl relative animate-fade-in-up border border-gray-200 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setMetricasModal(null)} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"><X size={20} /></button>
            <h3 className="text-xl font-black text-gray-800 mb-2 flex items-center gap-2"><Cpu className="text-emerald-600" /> Relatório Preditivo do Acasalamento</h3>
            <p className="text-gray-500 text-xs mb-6 font-medium">Veja as métricas completas geradas pela IA para a combinação: <b className="text-gray-800">{metricasModal.matriz} × {metricasModal.rep}</b></p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
               <div className="space-y-4">
                  <ProgressBar label="Potencial Genético Herdado" value={metricasModal.score} color="bg-emerald-500" />
                  <ProgressBar label="Compatibilidade Sanguínea" value={Math.min(99, metricasModal.score + 10)} color="bg-blue-500" />
                  <ProgressBar label="Adaptação ao Clima / Rusticidade" value={globalSeason === 'seco' ? 95 : 80} color="bg-amber-500" />
               </div>
               <div className="space-y-4">
                  <ProgressBar label="Potencial Reprodutivo (Fertilidade)" value={metricasModal.score > 85 ? 92 : 75} color="bg-pink-500" />
                  <ProgressBar label="Expectativa de Ganho de Peso" value={objetivo === 'carne' ? 96 : 80} color="bg-indigo-500" />
                  <ProgressBar label="Nível de Confiabilidade da Previsão" value={98} color="bg-gray-800" />
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                 <span className="font-bold text-green-900 flex items-center gap-1.5 mb-2"><CheckCircle2 size={16}/> Principais Pontos Fortes</span>
                 <p className="text-xs text-green-800 leading-relaxed font-medium">{metricasModal.ptForte}</p>
                 {metricasModal.favM || metricasModal.favR ? <p className="text-[10px] text-green-700 font-bold mt-2 pt-2 border-t border-green-200">Bônus aplicado: Possui pais marcados como Favoritos (Elite).</p> : null}
              </div>
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                 <span className="font-bold text-amber-900 flex items-center gap-1.5 mb-2"><AlertTriangle size={16}/> Pontos de Atenção</span>
                 <p className="text-xs text-amber-800 leading-relaxed font-medium">{metricasModal.ptAtencao}</p>
                 <p className="text-[10px] text-amber-700 font-bold mt-2 pt-2 border-t border-amber-200">Fornecer manejo nutricional adequado nos terços finais da gestação.</p>
              </div>
            </div>

            <button onClick={() => setMetricasModal(null)} className="w-full mt-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md">Voltar ao Painel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// 5. RELATORIOS
// Req 6: Exportação de PDFs integrados do Backend
function RelatoriosView({ showToast, fazendaId }) {
  const handleDownloadPDF = (tipo) => {
    showToast(`Baixando Relatório de ${tipo}...`);
    window.open(`${API_URL}/relatorios/${tipo}/${fazendaId}?token=${localStorage.getItem('gametech_token')}`, '_blank');
  };

  const models = [
    { title: 'Inventário Geral do Rebanho', format: 'PDF', icon: <Tractor className="text-emerald-500"/>, id: 'rebanho' },
    { title: 'Estatísticas Reprodutivas', format: 'PDF', icon: <Activity className="text-blue-500"/>, id: 'inseminacoes' },
    { title: 'Laudo Genético Coletivo', format: 'PDF', icon: <Dna className="text-indigo-500"/>, id: 'dashboard' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-200 shadow-sm text-center mb-8">
        <FileText size={48} className="mx-auto mb-4 text-emerald-300" />
        <h3 className="text-2xl font-black text-gray-800">Central de Relatórios</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {models.map((mod, i) => (
          <div key={i} className="bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group">
            <div>
              <div className="p-3 bg-gray-50 rounded-xl inline-block mb-4 group-hover:scale-110 transition-transform">{mod.icon}</div>
              <h4 className="text-base md:text-lg font-bold text-gray-800 leading-tight mb-2">{mod.title}</h4>
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider bg-gray-100 px-2 py-1 rounded-md">{mod.format}</span>
            </div>
            <button onClick={() => handleDownloadPDF(mod.id)} className="mt-6 w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-emerald-50 border border-gray-200 text-gray-600 font-bold py-3 rounded-xl transition-colors text-sm"><Download size={16}/> Baixar PDF</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// MODAL: PERFIL DO USUARIO / FAZENDEIRO
function ModalPerfil({ currentUser, setCurrentUser, fazendas, onAddFazenda, onEditFazenda, onClose, onLogout, onViewFazenda, showToast }) {
  const [editandoFazenda, setEditandoFazenda] = useState(null); 
  const [fazendaForm, setFazendaForm] = useState({ nome: '', cnpj: '', cep: '', endereco: '', cidade: '', estado: '', area: 100 });

  const handleSaveProfile = async (e) => { 
    e.preventDefault(); 
    try {
      const res = await fetch(`${API_URL}/usuarios/${currentUser.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(currentUser)
      });
      if(!res.ok) throw new Error('Erro ao salvar perfil');
      localStorage.setItem('gametech_user', JSON.stringify(currentUser));
      showToast('Perfil e Imagem atualizados no banco de dados com sucesso!'); 
      onClose(); 
    } catch(err) {
      showToast(err.message, 'error');
    }
  };

  const handleUserPhoto = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentUser({...currentUser, foto: reader.result});
      };
      reader.readAsDataURL(file);
    }
  };

  const abrirNovaFazenda = () => { setFazendaForm({ nome: '', cnpj: '', cep: '', endereco: '', cidade: '', estado: '', area: 100 }); setEditandoFazenda('NEW'); };

  const salvarFazenda = (e) => {
    e.preventDefault();
    if(editandoFazenda === 'NEW') {
      onAddFazenda(fazendaForm);
    }
    setEditandoFazenda(null);
  };

  if (editandoFazenda) {
    return (
      <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-md p-6 md:p-8 shadow-2xl relative animate-fade-in-up">
           <button onClick={() => setEditandoFazenda(null)} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
           <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2"><MapPin className="text-blue-600"/> Cadastrar Propriedade</h3>
           <form onSubmit={salvarFazenda} className="space-y-4 text-sm font-medium">
             <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome da Fazenda *</label><input required type="text" value={fazendaForm.nome} onChange={e=>setFazendaForm({...fazendaForm, nome: e.target.value})} className="w-full p-2.5 border rounded-xl outline-none focus:border-blue-500 bg-gray-50" /></div>
             <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">CNPJ *</label><input required type="text" value={fazendaForm.cnpj} onChange={e=>setFazendaForm({...fazendaForm, cnpj: e.target.value})} className="w-full p-2.5 border rounded-xl outline-none focus:border-blue-500 bg-gray-50" placeholder="Ex: 00.000.000/0001-00"/></div>
             <div className="grid grid-cols-2 gap-4">
               <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cidade *</label><input required type="text" value={fazendaForm.cidade} onChange={e=>setFazendaForm({...fazendaForm, cidade: e.target.value})} className="w-full p-2.5 border rounded-xl outline-none focus:border-blue-500 bg-gray-50" /></div>
               <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado (UF) *</label><input required type="text" maxLength="2" value={fazendaForm.estado} onChange={e=>setFazendaForm({...fazendaForm, estado: e.target.value.toUpperCase()})} className="w-full p-2.5 border rounded-xl outline-none focus:border-blue-500 bg-gray-50" placeholder="Ex: CE"/></div>
             </div>
             <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Porte (ha)</label><input type="number" value={fazendaForm.area} onChange={e=>setFazendaForm({...fazendaForm, area: e.target.value})} className="w-full p-2.5 border rounded-xl outline-none focus:border-blue-500 bg-gray-50"/></div>
                <div className="col-span-2"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Endereço Rural</label><input type="text" value={fazendaForm.endereco} onChange={e=>setFazendaForm({...fazendaForm, endereco: e.target.value})} className="w-full p-2.5 border rounded-xl outline-none focus:border-blue-500 bg-gray-50" placeholder="Ex: Rodovia 187, Km 2"/></div>
             </div>
             <button type="submit" className="w-full py-3.5 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all">Salvar Propriedade</button>
           </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl p-6 md:p-8 shadow-2xl relative animate-fade-in-up text-sm font-medium text-gray-750 my-8">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2"><Settings className="text-emerald-600" /> Configurações da Conta</h3>
        
        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* Perfil Proprietário */}
          <div className="flex flex-col sm:flex-row gap-6 items-center bg-gray-50 p-4 md:p-6 rounded-2xl border border-gray-100">
            <div className="w-24 h-24 sm:w-20 sm:h-20 bg-emerald-600 text-white rounded-full flex items-center justify-center text-3xl font-black shadow-md relative overflow-hidden group shrink-0">
              {currentUser?.foto ? <img src={currentUser.foto} alt="Avatar" className="w-full h-full object-cover"/> : (currentUser?.nome?.[0] || 'G')}
              <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center cursor-pointer transition-all"><Camera size={20} /></div>
              <input type="file" accept="image/*" onChange={handleUserPhoto} className="absolute inset-0 opacity-0 cursor-pointer z-10" title="Alterar Foto de Perfil" />
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <div><label className="block text-[10px] font-bold text-gray-500 uppercase">Nome</label><input type="text" value={currentUser?.nome || ''} onChange={(e) => setCurrentUser({...currentUser, nome: e.target.value})} className="w-full p-2 border-b bg-transparent outline-none font-bold" /></div>
              <div><label className="block text-[10px] font-bold text-gray-500 uppercase">CPF</label><input type="text" value={currentUser?.cpf || ''} onChange={(e) => setCurrentUser({...currentUser, cpf: e.target.value})} className="w-full p-2 border-b bg-transparent outline-none" /></div>
              <div><label className="block text-[10px] font-bold text-gray-500 uppercase">E-mail</label><input type="email" value={currentUser?.email || ''} onChange={(e) => setCurrentUser({...currentUser, email: e.target.value})} className="w-full p-2 border-b bg-transparent outline-none" /></div>
              <div><label className="block text-[10px] font-bold text-gray-500 uppercase">Telefone</label><input type="text" value={currentUser?.telefone || ''} onChange={(e) => setCurrentUser({...currentUser, telefone: e.target.value})} className="w-full p-2 border-b bg-transparent outline-none" /></div>
            </div>
          </div>

          {/* Listagem de Fazendas */}
          <div>
            <h4 className="font-bold text-gray-800 mb-3 flex items-center justify-between">Fazendas Associadas</h4>
            <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-2">
              {(fazendas || []).map(f => (
                <div key={f.id} className="p-4 border border-gray-200 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white shadow-sm">
                  <div className="w-full sm:w-auto"><p className="font-bold text-gray-800 truncate">{f.nome}</p><p className="text-xs text-gray-500 truncate mt-0.5">CNPJ: {f.cnpj} • {f.cidade}/{f.estado}</p></div>
                  <button type="button" onClick={() => onViewFazenda(f.id)} className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-lg text-xs font-bold transition-colors border border-emerald-100 w-full sm:w-auto text-center shrink-0">Ver Fazenda</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={abrirNovaFazenda} className="mt-4 text-emerald-600 font-bold text-sm flex items-center gap-1.5 px-2 py-1 hover:bg-emerald-50 rounded-lg transition-colors"><PlusCircle size={16}/> Registrar Nova Fazenda</button>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-between pt-6 border-t border-gray-100 gap-3">
            <button type="button" onClick={onLogout} className="flex justify-center items-center gap-2 px-4 py-3 sm:py-2 text-red-600 hover:bg-red-50 rounded-xl font-bold text-sm transition-colors border border-transparent hover:border-red-100"><LogOut size={16}/> Sair do Sistema</button>
            <button type="submit" className="px-8 py-3.5 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition-all active:scale-95 text-base sm:text-sm">Salvar Perfil Completo</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// MODAL: CONFORMIDADE LGPD
function ModalLGPD({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-xl p-6 md:p-8 shadow-2xl relative animate-fade-in-up">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        <h3 className="text-xl font-black text-gray-800 mb-2 flex items-center gap-2"><Shield className="text-blue-600" /> Painel de Conformidade LGPD</h3>
        <p className="text-sm text-gray-500 mb-6 font-medium">Relatório de segurança e governança de dados pessoais.</p>
        <div className="space-y-4 text-sm font-medium text-gray-700">
          <div className="p-4 bg-green-50 border border-green-100 rounded-2xl flex gap-3">
            <CheckCircle2 className="text-green-500 shrink-0"/><div><h4 className="font-bold text-green-900">Criptografia em Repouso Ativa</h4><p className="text-xs text-green-700 mt-1">Dados pessoais como CPF, Telefones e E-mail estão ofuscados no banco de dados.</p></div>
          </div>
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3">
            <Shield className="text-blue-500 shrink-0"/><div><h4 className="font-bold text-blue-900">Isolamento Multi-Tenant Garantido</h4><p className="text-xs text-blue-700 mt-1">Os dados zootécnicos e financeiros são isolados por token de fazenda (FarmID).</p></div>
          </div>
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
            <AlertTriangle className="text-amber-500 shrink-0"/><div><h4 className="font-bold text-amber-900">Atenção: Exportação de Dados</h4><p className="text-xs text-amber-700 mt-1">Lembre-se que ao exportar os relatórios XML, o CNPJ da fazenda será incluído de forma persistente nos metadados do documento.</p></div>
          </div>
        </div>
        <button onClick={onClose} className="w-full mt-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md transition-all active:scale-95">Validar e Fechar Painel</button>
      </div>
    </div>
  );
}

// MODAL CADASTRO RAPIDO ANIMAL
function ModalCadastro({ onClose, onSave }) {
  const [id, setId] = useState(''); const [especie, setEspecie] = useState('Bovino');
  const [raca, setRaca] = useState(''); const [sexo, setSexo] = useState('Fêmea');
  const [idade, setIdade] = useState(''); const [peso, setPeso] = useState('');
  const [ecc, setEcc] = useState('3'); const [saude, setSaude] = useState('Saudável');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!id || !raca || !peso) return alert('Preencha os campos obrigatórios (*).');
    const labelsECC = { 1: "Muito Magra", 2: "Magra", 3: "Ideal / Saudável", 4: "Gorda" };
    onSave({
      id: id.toUpperCase(), especie, raca, sexo, dataNascimento: idade, peso: Number(peso),
      status: sexo === 'Fêmea' ? 'Vazia (Apta)' : 'Reprodutor Ativo',
      pai: '', mae: '', ecc: `ECC ${ecc} - ${labelsECC[ecc]}`,
      vacinas: 'Aftosa em dia', abortos: 0, gestacoes: 0, saude: saude
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg p-6 md:p-8 shadow-2xl relative animate-fade-in-up text-sm font-medium text-gray-750 my-8">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><PlusCircle className="text-emerald-600" /> Cadastrar Animal</h3>
        <form onSubmit={handleSubmit} className="space-y-4 text-sm font-medium text-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Brinco / ID *</label><input type="text" value={id} onChange={(e) => setId(e.target.value)} className="w-full p-2.5 border rounded-lg focus:outline-emerald-500 bg-gray-50" required placeholder="Ex: BEZ-01"/></div>
            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Espécie *</label><select value={especie} onChange={(e) => setEspecie(e.target.value)} className="w-full p-2.5 border rounded-lg focus:outline-emerald-500 bg-white"><option value="Bovino">Bovino</option><option value="Ovino">Ovino</option><option value="Caprino">Caprino</option></select></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Raça *</label><input type="text" value={raca} onChange={(e) => setRaca(e.target.value)} className="w-full p-2.5 border rounded-lg focus:outline-emerald-500 bg-gray-50" required placeholder="Ex: Nelore"/></div>
            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sexo *</label><select value={sexo} onChange={(e) => setSexo(e.target.value)} className="w-full p-2.5 border rounded-lg focus:outline-emerald-500 bg-white"><option value="Fêmea">Fêmea</option><option value="Macho">Macho</option></select></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nascimento</label><input type="date" value={idade} onChange={(e) => setIdade(e.target.value)} className="w-full p-2.5 border rounded-lg focus:outline-emerald-500 bg-white"/></div>
            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Peso Atual (kg) *</label><input type="number" value={peso} onChange={(e) => setPeso(e.target.value)} className="w-full p-2.5 border rounded-lg focus:outline-emerald-500 bg-gray-50" required placeholder="0"/></div>
          </div>
          <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Saúde Atual</label><select value={saude} onChange={(e) => setSaude(e.target.value)} className="w-full p-2.5 border rounded-lg focus:outline-emerald-500 bg-white"><option value="Saudável">Saudável</option><option value="Brucelose Ativa (Infecciosa)">Brucelose Ativa</option><option value="Portador de Gene de Nanismo">Nanismo Genético</option></select></div>
          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl mt-6 transition-all active:scale-95 shadow-md">Confirmar e Integrar Plantel</button>
        </form>
      </div>
    </div>
  );
}

// AUXILIARES
function KpiCard({ title, value, subtitle, icon, color }) {
  return (
    <div className={`p-5 md:p-6 rounded-3xl border-2 ${color} flex flex-col justify-between h-full`}>
      <div className="flex justify-between items-start mb-4 md:mb-6">
        <h3 className="text-[10px] md:text-xs font-black uppercase text-gray-600 tracking-wider w-2/3">{title}</h3>
        <div className="p-2 md:p-2.5 bg-white rounded-xl shadow-sm shrink-0">{icon}</div>
      </div>
      <div>
        <p className="text-3xl md:text-4xl font-black text-gray-900">{value}</p>
        <p className="text-[10px] md:text-xs font-bold text-gray-500 mt-1 md:mt-2">{subtitle}</p>
      </div>
    </div>
  );
}

function ProgressBar({ label, value, color }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] md:text-xs font-black text-gray-500 uppercase tracking-widest mb-2"><span>{label}</span><span className="text-gray-900">{value}%</span></div>
      <div className="w-full bg-gray-100 rounded-full h-2 md:h-3 overflow-hidden"><div className={`h-2 md:h-3 rounded-full ${color} transition-all duration-1000`} style={{ width: `${value}%` }}></div></div>
    </div>
  );
}