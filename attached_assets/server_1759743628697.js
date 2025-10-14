const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

let ultimosSinais = [];

app.post('/api/sinais', (req, res) => {
  const sinais = req.body.rodadas;
  if (!Array.isArray(sinais)) return res.status(400).send("Formato inválido.");
  ultimosSinais = sinais.slice(-5);
  console.log("✅ Sinais recebidos:", ultimosSinais);
  res.sendStatus(200);
});

app.get('/api/sinais', (req, res) => {
  res.json(ultimosSinais);
});

app.listen(port, () => {
  console.log(`Servidor Aviator rodando em http://localhost:${port}`);
});
