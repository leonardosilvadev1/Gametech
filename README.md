# Gametech IA — Inteligência Artificial Aplicada à Pecuária de Precisão

A **Gametech IA** é uma plataforma computacional avançada voltada à pecuária de precisão e tomada de decisões zootécnicas estratégicas. Unindo os fundamentos consolidados da genética clássica mendeliana e da bioestatística gaussiana a uma arquitetura moderna de software (React, Node.js e PostgreSQL), o sistema mitiga erros de acasalamento direcionados, previne os efeitos deletérios da endogamia e potencializa o ganho genético aditivo de rebanhos de corte e leite.

---

## 🚀 1. Funcionalidades do Sistema

A plataforma possui um ecossistema completo e integrado de controle reprodutivo e zootécnico:

1. **Painel de Dashboard Analítico:** Visualização centralizada e em tempo real dos indicadores de eficiência reprodutiva do rebanho, taxas de prenhez, alertas de consanguinidade e distribuição demográfica de animais.
2. **Gerenciamento de Usuários e Fazendas:** Sistema multi-propriedade com controle de permissões e autenticação segura via JSON Web Tokens (JWT).
3. **Cadastro e Controle Zootécnico Detalhado:** Rastreamento individualizado de animais por brincos/tags identificadoras, classificando-os por sexo, linhagem, idade cronológica e flags de seleção artificial (`isFavorito`).
4. **Mapeamento Genealógico e Antropocêntrico:** Rastreabilidade contínua de ascendência e descendência direta (pais, mães e avós) para identificação automática de parentesco.
5. **Simulador Reprodutivo Inteligente (Motor de Inferência IA):** Análise preditiva em tempo real de cruzamentos e acasalamentos direcionados com emissão automática de score de potencial genético e taxas brutas de sucesso de fertilização.
6. **Geração de Relatórios Técnicos:** Exportação sob demanda de laudos de simulação e históricos reprodutivos em formato PDF.
7. **Agendamentos Automatizados (Cron Jobs):** Sincronização periódica de dados de manejo e reavaliações automáticas de idade biológica via Node-cron.

---

## 🧠 2. Funcionamento Detalhado da Inteligência Artificial

O motor de inteligência artificial da Gametech IA opera por meio de uma arquitetura híbrida estruturada em duas camadas independentes e sinérgicas: uma **camada probabilística de herança qualitativa** e uma **camada estatística de modelagem quantitativa poligênica**.

### 2.1 Critérios de Ingestão e Restrição Biológica
Antes de submeter quaisquer indivíduos ao processamento estatístico-genético, o pipeline aplica um filtro restritivo de consustência temporal e zootécnica com base na idade cronológica.
* **Restrição de Idade Mínima:** O sistema impede estritamente que fêmeas ou machos categorizados na base de dados como "Jovens (Cria)" ou que possuam idade biológica inferior a **12 meses (1 ano)** participem de simulações reprodutivas. Caso um animal abaixo desse limiar seja enviado, a operação é imediatamente abortada com retorno `HTTP 400 Bad Request`.
* **Prevenção de Overfitting:** A exclusão de bezerros menores de 12 meses fundamenta-se na instabilidade fenotípica típica da fase inicial de cria, na qual o peso e o desenvolvimento são amplamente dominados por fatores ambientais e nutricionais momentâneos. A inclusão desses dados mascararia o real valor genético aditivo do indivíduo, gerando *overfitting* (sobreajuste) na Curva Gaussiana do rebanho e derrubando a confiabilidade das predições de campo.

### 2.2 O Mecanismo da Roleta de Mendel
A herança de características qualitativas e a distribuição de alelos seguem os preceitos da **Primeira Lei de Mendel (Segregação dos Fatores)**. Cada progenitor genético abriga um par de alelos para um determinado locus e transmite exatamente um deles para sua progênie, com uma probabilidade exata de 50% em condições normais.
* O software simula este processo utilizando o algoritmo da **Roleta de Mendel**. O espaço amostral de combinações genotípicas possíveis é mapeado em quadrantes circulares ponderados.
* Quando os indivíduos sob simulação não possuem parentesco próximo, as chances de segregação saudável e expressão de genes dominantes favoráveis ocupam as áreas majoritárias da roleta computacional.
* Se há sobreposição ancestral detectada na árvore genealógica, os quadrantes são recalculados dinamicamente para inflacionar a probabilidade de homozigose recessiva deletéria.

### 2.3 A Curva Gaussiana na Dispersão de Traços Quantitativos
Características de interesse econômico estrito, tais como peso à desmama, ganho de peso diário (GMD) e conformação de carcaça, são traços quantitativos poligênicos sob contínua influência do ambiente de manejo. A distribuição destas variáveis no plantel assume a forma de uma **Distribuição Normal ou Curva Gaussiana**.

A Gametech IA utiliza a função de densidade de probabilidade (FDP) Gaussiana para prever o comportamento fenotípico esperado da progênie, simulando a dispersão em torno da média zootécnica estabelecida para o bioma. A modelagem matemática é expressa pela seguinte equação:

$$f(x) = \frac{1}{\sigma \sqrt{2\pi}} e^{-\frac{(x - \mu)^2}{2\sigma^2}}$$

Onde as variáveis denotam:
* $\mu$ (mi): A média populacional ideal fixada para a raça e bioma de destino;
* $\sigma$ (sigma): O desvio padrão empírico extraído a partir do histórico de pesagens do rebanho armazenado no PostgreSQL;
* $x$: O valor simulado para o potencial aditivo da progênie;
* $e$: A constante matemática de Euler (~2,71828).

### 2.4 Formulação Matemática e Constantes Atribuídas
O cálculo final do índice de compatibilidade e predição é o resultado de equações determinísticas parametrizadas por constantes de calibração zootécnica definidas no backend:

1. **Equação do Score de Potencial Genético Base ($S_{\text{base}}$):**
   $$S_{\text{base}} = (S_M \times w_M) + (S_R \times w_R) + B_{\text{fav}}$$

2. **Dedução das Constantes Técnicas:**
   * **Pesos Progenitores ($w_M = 0.5$ e $w_R = 0.5$):** Representam a equivalência de contribuição gamética de cada progenitor para o genoma do produto final. Por herança biparental, a matriz e o reprodutor possuem peso simétrico de 50% cada na determinação do score base genético.
   * **Bônus de Favoritismo ($B_{\text{fav}} = 5$):** Constante aditiva aplicada caso um ou ambos os genitores possuam a flag lógica de favoritismo ativa no sistema (`isFavorito = true`). Este bônus traduz a seleção artificial intencional de animais de elite, promovendo um ganho de indução de até 5 pontos na escala.
   * **Penalidade por Consanguinidade ($P_{\text{cons}} = 40$):** Constante redutora ativada quando o rastreamento genealógico intercepta pais ou avós comuns diretos (consanguinidade de primeiro grau). O valor de 40 pontos atua como um severo desincentivo matemático, derrubando o score predito final para impedir a depressão por endogamia.
   * **Taxa Base de Eficiência Reprodutiva ($E_{\text{base}} = 88\%$):** Representa o teto nominal superior de probabilidade biológica de sucesso de fertilização, concepção e parto seguro sob condições ótimas de manejo na plataforma.

3. **Equações Finais de Saída:**
   * **Score Predito Final ($S_{\text{predito}}$):**
     $$S_{\text{predito}} = S_{\text{base}} - P_{\text{cons}}$$
   * **Chance Percentual de Sucesso Definitivo da Prenhez ($P_{\text{sucesso}}$):**
     $$P_{\text{sucesso}} = 88\% - P_{\text{cons}}$$

### 2.5 Pipeline de Execução da IA

| Etapa | Camada Responsável | Descrição do Processamento Técnico |
| :--- | :--- | :--- |
| **1. Requisição** | Cliente (React Component) | O usuário seleciona os brincos da matriz e reprodutor e dispara o payload via HTTP POST para a rota `/api/ia/simular`. |
| **2. Validação** | Backend (Express Controller) | O sistema calcula o delta de tempo biológico. Se a idade de qualquer genitor for inferior a 12 meses, intercepta e retorna `HTTP 400 Bad Request`. |
| **3. Mapeamento** | Banco de Dados (PostgreSQL) | O Prisma ORM busca no banco as informações de $S_M$, $S_R$, ancestralidade direta e a flag `isFavorito`. |
| **4. Inferência** | Motor Core da IA | Execução conjunta do algoritmo da Roleta de Mendel e cálculo da densidade Gaussiana. Aplicação das constantes de peso e penalidade. |
| **5. Resposta** | API JSON Output | A rota devolve o payload estruturado contendo o $S_{\text{predito}}$, a $P_{\text{sucesso}}$ e a classificação de risco em tempo real para renderização. |

---

## 🛠️ 3. Como Funciona o Sistema (Arquitetura)

O sistema segue o modelo de arquitetura distribuída cliente-servidor:
1. **Frontend (Interface do Usuário):** Uma Single Page Application (SPA) responsiva construída em **React JS** com compilação de alta performance via **Vite**. O estilo utiliza o framework utilitário **Tailwind CSS v3** com animações de entrada fluidas configuradas nativamente. A comunicação é feita por requisições assíncronas mediadas pelo cliente HTTP **Axios**.
2. **Backend (Servidor de API):** Uma API REST robusta estruturada sobre o ecossistema **Node.js** utilizando o framework **Express**. Gerencia as regras de negócio, a segurança e criptografia de senhas (via Bcrypt), geração de tokens e o processamento de laudos de arquivos.
3. **Persistência (Banco de Dados):** Banco de dados relacional **PostgreSQL** hospedado localmente ou em nuvem, garantindo integridade referencial estrita e velocidade em queries genealógicas complexas.

---

## 📁 4. Estrutura de Pastas do Backend

A organização interna do ecossistema do servidor Backend segue a seguinte topologia limpa:

```plaintext
Backend/
│
├── config/
│   └── db.js
│
├── controllers/
│   └── apiController.js
│
├── middlewares/
│   └── auth.js
│
├── .env
├── package.json
├── schema.sql
└── server.js
```

---

## 📜 5. Licença

Este projeto está licenciado sob a **GNU General Public License v3 (GPLv3)**. 

Isso significa que você tem a liberdade de executar, estudar, compartilhar e modificar o software de forma gratuita. Qualquer trabalho derivado ou cópia deste código fonte também deve ser obrigatoriamente distribuído sob os mesmos termos da licença GPLv3, mantendo o ecossistema open-source protegido e transparente.

Para mais detalhes sobre as permissões e restrições, consulte o arquivo `LICENSE` na raiz do repositório ou acesse a documentação oficial da [GNU GPL v3](https://www.gnu.org/licenses/gpl-3.0.html).

## 💻 6. Código

O código está na branch master, juntamente com todos os arquivos de instalação e funcionamento da IA
