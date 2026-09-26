const express = require('express');
const router = express.Router();
const { obtenerPokemones } = require('../controllers/pokemonController');

// GET /api/pokemons -> lista completa en formato JSON, lista para ser
// consumida por la app en Ionic/Angular.
router.get('/pokemons', obtenerPokemones);

module.exports = router;
