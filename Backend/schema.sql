CREATE DATABASE gametech_ia_db;

-- Tabela de Usuários (Autenticação)
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    foto TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Fazendas
CREATE TABLE fazendas (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    cep VARCHAR(10),
    endereco VARCHAR(150),
    cidade VARCHAR(100) NOT NULL,
    estado VARCHAR(2) NOT NULL,
    area NUMERIC(10,2) DEFAULT 0,
    score INT DEFAULT 90,
    foto TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Funcionários
CREATE TABLE funcionarios (
    id SERIAL PRIMARY KEY,
    fazenda_id INT NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    cpf VARCHAR(14) NOT NULL,
    funcao VARCHAR(50) NOT NULL,
    telefone VARCHAR(20) NOT NULL
);

-- Tabela de Raças/Espécies
CREATE TABLE racas (
    id SERIAL PRIMARY KEY,
    especie VARCHAR(50) NOT NULL CHECK (especie IN ('Bovino', 'Ovino', 'Caprino')),
    nome_raca VARCHAR(50) NOT NULL,
    UNIQUE (especie, nome_raca)
);

-- Inserindo raças base baseadas no frontend
INSERT INTO racas (especie, nome_raca) VALUES 
('Bovino', 'Girolando'), ('Bovino', 'Nelore PO'), ('Ovino', 'Santa Inês'), ('Caprino', 'Anglo-Nubiana');

-- Tabela Central de Animais
CREATE TABLE animais (
    id VARCHAR(50) PRIMARY KEY,
    fazenda_id INT NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    especie VARCHAR(50) NOT NULL,
    raca VARCHAR(50) NOT NULL,
    sexo VARCHAR(10) NOT NULL CHECK (sexo IN ('Macho', 'Fêmea')),
    data_nascimento DATE NOT NULL,
    peso NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Saudável',
    saude VARCHAR(100) DEFAULT 'Saudável',
    ecc VARCHAR(50) DEFAULT 'ECC 3 - Ideal / Saudável',
    vacinas VARCHAR(100),
    abortos INT DEFAULT 0,
    gestacoes INT DEFAULT 0,
    is_favorito BOOLEAN DEFAULT FALSE,
    historico_peso JSONB DEFAULT '[]'::jsonb, -- Array de números
    foto TEXT,
    
    -- Genealogia
    pai_id VARCHAR(50) REFERENCES animais(id) ON DELETE SET NULL,
    mae_id VARCHAR(50) REFERENCES animais(id) ON DELETE SET NULL,
    
    -- Métricas de IA
    dep_leite_kg NUMERIC(6,2) DEFAULT 0.00,
    dep_peso_kg NUMERIC(5,2) DEFAULT 0.00,
    coeficiente_consanguinidade NUMERIC(5,2) DEFAULT 0.00,
    
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Inseminações e Gestações
CREATE TABLE inseminacoes (
    id VARCHAR(50) PRIMARY KEY,
    fazenda_id INT NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    matriz_id VARCHAR(50) NOT NULL REFERENCES animais(id),
    reprodutor_id VARCHAR(50) NOT NULL REFERENCES animais(id),
    tecnico VARCHAR(100) NOT NULL,
    observacoes TEXT,
    status VARCHAR(50) DEFAULT 'Aguardando Diagnóstico',
    estagio VARCHAR(50) DEFAULT 'Análise',
    historico_gestacao JSONB DEFAULT '[]'::jsonb, -- Array de eventos
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Cache Dashboard (Sincronizada via Node.js)
CREATE TABLE dashboard_metricas_fazenda (
    fazenda_id INT PRIMARY KEY REFERENCES fazendas(id) ON DELETE CASCADE,
    total_animais INT DEFAULT 0,
    media_dep_leite NUMERIC(6,2) DEFAULT 0.00,
    media_dep_peso NUMERIC(5,2) DEFAULT 0.00,
    media_consanguinidade NUMERIC(5,2) DEFAULT 0.00,
    ultima_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices de Performance
CREATE INDEX idx_filtro_animais ON animais (fazenda_id, sexo, status);
CREATE INDEX idx_pedigree ON animais (pai_id, mae_id);
CREATE INDEX idx_inseminacoes_matriz ON inseminacoes (matriz_id);