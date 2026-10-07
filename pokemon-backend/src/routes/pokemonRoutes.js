const express = require('express');
const router = express.Router();
const {
  obtenerPokemones,buscarPokemones, obtenerPokemonPorId, crearPokemon,
  importarDesdePokeapi,actualizarPokemon,eliminarPokemon} = require('../controllers/pokemonController');

router.get('/pokemons', obtenerPokemones);

///buscar?query="numero de id del pokemon o nombre "
router.get('/pokemons/buscar', buscarPokemones);
//trae el pokemon desde la pokeapi con id o nombre 
router.post('/pokemons/importar', importarDesdePokeapi);
router.get('/pokemons/:id', obtenerPokemonPorId);
router.post('/pokemons', crearPokemon);
router.put('/pokemons/:id', actualizarPokemon);
router.delete('/pokemons/:id', eliminarPokemon);

module.exports = router;