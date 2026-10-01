const express = require('express');
const cors = require('cors');
const pokemonRoutes = require('./routes/pokemonRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', pokemonRoutes);

app.get('/', (req, res) => {
  res.json({ mensaje: 'API de Pokémon funcionando correctamente' });
});

module.exports = app;
