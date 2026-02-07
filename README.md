# Sistema de Gestão - ADM Cia

## Estrutura de Pastas

```
adm_cia-main/
├── index.html          # Página principal do sistema
├── invoice.html        # Template de invoice/fatura
├── server.js           # Servidor Express + API REST
├── package.json        # Dependências do projeto
│
├── public/             # Arquivos estáticos (servidos via express.static)
│   ├── css/
│   │   └── styles.css  # Estilos principais (light/dark mode)
│   │
│   └── js/
│       ├── main.js     # Lógica principal do frontend
│       └── jsPDF.min.js # Biblioteca de geração de PDF
│
└── uploads/            # Pasta para upload de arquivos (fotos, etc)
```

## Arquivos Legados (Raiz)

Os arquivos abaixo na raiz são cópias de backup. 
A aplicação agora usa os arquivos da pasta `public/`:

- `main.js` → Use `public/js/main.js`
- `styles.css` → Use `public/css/styles.css`
- `jsPDF.min.js` → Use `public/js/jsPDF.min.js`

## Executando o Projeto

```bash
# Instalar dependências
npm install

# Iniciar servidor
node server.js
```

O servidor irá rodar em `http://localhost:3000`

## Tecnologias

- **Backend**: Node.js, Express, MySQL
- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **UI**: Bootstrap 5.3, Bootstrap Icons
- **Gráficos**: Chart.js
- **Mapas**: Leaflet
- **Calendário**: FullCalendar
- **PDF**: jsPDF

## Banco de Dados

- MySQL: `sistema_gestao_tp`
- Tabelas: `jobs`, `job_itens`, `clientes`, `funcionarios`, `estoque`, `veiculos`, `equipamentos`
