const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const port =  3000;
const secretKey = 'sua-chave-secreta-muito-segura'; // Substitua por uma chave segura (use .env em produção)

// Middleware
app.use(helmet()); // Segurança básica
app.use(morgan('dev')); // Logging de requisições
app.use(express.json()); // Parsing de JSON

// Conexão com MySQL
const sequelize = new Sequelize('restaurantes_db', 'seu_usuario', 'sua_senha', {
    host: 'localhost',
    dialect: 'mysql',
    logging: false // Desativa logs SQL (opcional)
});

// Testar conexão
sequelize.authenticate()
    .then(() => console.log('Conectado ao MySQL'))
    .catch(err => console.error('Erro ao conectar ao MySQL:', err));

// Modelo do Restaurante
const Restaurante = sequelize.define('Restaurante', {
    nome: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    senha: {
        type: DataTypes.STRING,
        allowNull: false
    },
    online: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    pagou: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'Restaurantes',
    timestamps: false // Desativa createdAt/updatedAt (opcional)
});

// Sincronizar modelo com o banco (cria a tabela se não existir)
sequelize.sync({ force: false }).then(() => {
    console.log('Tabela Restaurantes sincronizada');
});

// Middleware de autenticação
const autenticarMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer token
    if (!token) return res.status(401).json({ erro: 'Token não fornecido' });
    
    try {
        const decoded = jwt.verify(token, secretKey);
        const restaurante = await Restaurante.findByPk(decoded.id);
        if (!restaurante) return res.status(401).json({ erro: 'Restaurante não encontrado' });
        req.restaurante = restaurante;
        next();
    } catch (err) {
        res.status(401).json({ erro: 'Token inválido' });
    }
};

// Rota: Cadastro de restaurante
app.post('/cadastro', async (req, res) => {
    const { nome, email, senha } = req.body;
    
    if (!nome || !email || !senha) {
        return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios' });
    }
    
    try {
        const restauranteExistente = await Restaurante.findOne({ where: { email } });
        if (restauranteExistente) {
            return res.status(400).json({ erro: 'E-mail já cadastrado' });
        }
        
        const senhaHash = bcrypt.hashSync(senha, 10);
        const restaurante = await Restaurante.create({ nome, email, senha: senhaHash });
        
        res.status(201).json({ mensagem: 'Restaurante cadastrado com sucesso' });
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao cadastrar restaurante' });
    }
});

// Rota: Login de restaurante
app.post('/login', async (req, res) => {
    const { email, senha } = req.body;
    
    try {
        const restaurante = await Restaurante.findOne({ where: { email } });
        if (!restaurante || !bcrypt.compareSync(senha, restaurante.senha)) {
            return res.status(401).json({ erro: 'Credenciais inválidas' });
        }
        
        const token = jwt.sign({ id: restaurante.id }, secretKey, { expiresIn: '1h' });
        res.json({
            token,
            restaurante: { id: restaurante.id, nome: restaurante.nome, online: restaurante.online }
        });
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao fazer login' });
    }
});

// Rota: Listar restaurantes (online/offline, pagou/não pagou)
app.get('/restaurantes', autenticarMiddleware, async (req, res) => {
    try {
        const restaurantes = await Restaurante.findAll({
            attributes: ['id', 'nome', 'email', 'online', 'pagou']
        });
        res.json(restaurantes);
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao listar restaurantes' });
    }
});

// Rota: Atualizar status online/offline
app.put('/restaurantes/online', autenticarMiddleware, async (req, res) => {
    const { online } = req.body;
    
    try {
        req.restaurante.online = online;
        await req.restaurante.save();
        res.json({ mensagem: `Restaurante ${req.restaurante.nome} agora está ${online ? 'online' : 'offline'}` });
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao atualizar status' });
    }
});

// Rota: Gerar dados para impressão de etiquetas
app.post('/etiquetas/gerar', autenticarMiddleware, async (req, res) => {
    const { pedidoId, cliente, itens, endereco } = req.body;
    
    if (!pedidoId || !cliente || !itens) {
        return res.status(400).json({ erro: 'Dados do pedido incompletos' });
    }
    
    try {
        const etiqueta = {
            pedidoId,
            cliente,
            itens,
            endereco: endereco || 'Não fornecido',
            restaurante: req.restaurante.nome,
            data: new Date().toISOString()
        };
        res.json({ etiqueta });
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao gerar etiqueta' });
    }
});

// Rota: Webhook para status de pagamento (ex.: Stripe)
app.post('/pagamentos/webhook', async (req, res) => {
    const { pagamentoId, status, restauranteId } = req.body;
    
    try {
        const restaurante = await Restaurante.findByPk(restauranteId);
        if (!restaurante) return res.status(404).json({ erro: 'Restaurante não encontrado' });
        
        restaurante.pagou = (status === 'paid');
        await restaurante.save();
        res.json({ mensagem: 'Status de pagamento atualizado' });
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao processar webhook' });
    }
});

// Iniciar servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});