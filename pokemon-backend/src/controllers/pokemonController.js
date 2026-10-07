const axios = require('axios');
const { Pokemon, Tipo } = require('../models');

const POKEAPI_BASE = 'https://pokeapi.co/api/v2/pokemon';

function generarPrecio() {
  return parseFloat((Math.random() * (200 - 10) + 10).toFixed(2));
}

function generarStock() {
  return Math.floor(Math.random() * 100) + 1;
}

// GET /api/pokemons -> lista completa
exports.obtenerPokemones = async (req, res) => {
  try {
    const pokemones = await Pokemon.findAll({
      include: [{ model: Tipo, as: 'tipos', attributes: ['nombre'], through: { attributes: [] } }],
      order: [['numero_pokedex', 'ASC']]
    });

    const resultado = pokemones.map((p) => ({
      id: p.id,
      numero_pokedex: p.numero_pokedex,
      nombre: p.nombre,
      imagen_url: p.imagen_url,
      tipos: p.tipos.map((t) => t.nombre),
      precio: p.precio,
      stock: p.stock
    }));

    res.status(200).json(resultado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener los Pokémon', error: error.message });
  }
};

// GET /api/pokemons/buscar?query=25  O  ?query=pikachu
// Busca por numero_pokedex exacto (si es número) o por nombre (parcial, sin importar mayúsculas)
exports.buscarPokemones = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ mensaje: 'Debes enviar el parámetro query (?query=...)' });
    }

    const { Op } = require('sequelize');
    const esNumero = !isNaN(query);

    const where = esNumero
      ? { numero_pokedex: Number(query) }
      : { nombre: { [Op.iLike]: `%${query}%` } };

    const pokemones = await Pokemon.findAll({
      where,
      include: [{ model: Tipo, as: 'tipos', attributes: ['nombre'], through: { attributes: [] } }],
      order: [['numero_pokedex', 'ASC']]
    });

    const resultado = pokemones.map((p) => ({
      id: p.id,
      numero_pokedex: p.numero_pokedex,
      nombre: p.nombre,
      imagen_url: p.imagen_url,
      tipos: p.tipos.map((t) => t.nombre),
      precio: p.precio,
      stock: p.stock
    }));

    res.status(200).json(resultado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al buscar Pokémon', error: error.message });
  }
};

// GET /api/pokemons/:id -> uno solo por su id interno
exports.obtenerPokemonPorId = async (req, res) => {
  try {
    const pokemon = await Pokemon.findByPk(req.params.id, {
      include: [{ model: Tipo, as: 'tipos', attributes: ['nombre'], through: { attributes: [] } }]
    });

    if (!pokemon) {
      return res.status(404).json({ mensaje: 'Pokémon no encontrado' });
    }

    res.status(200).json({
      id: pokemon.id,
      numero_pokedex: pokemon.numero_pokedex,
      nombre: pokemon.nombre,
      imagen_url: pokemon.imagen_url,
      tipos: pokemon.tipos.map((t) => t.nombre),
      precio: pokemon.precio,
      stock: pokemon.stock
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener el Pokémon', error: error.message });
  }
};

// POST /api/pokemons -> crear manualmente, con los datos que mande el usuario
exports.crearPokemon = async (req, res) => {
  try {
    const { numero_pokedex, nombre, imagen_url, tipos = [], precio, stock } = req.body;

    if (!numero_pokedex || !nombre || !imagen_url) {
      return res.status(400).json({ mensaje: 'numero_pokedex, nombre e imagen_url son obligatorios' });
    }

    const pokemon = await Pokemon.create({ numero_pokedex, nombre, imagen_url, precio, stock });

    for (const nombreTipo of tipos) {
      const [tipo] = await Tipo.findOrCreate({ where: { nombre: nombreTipo } });
      await pokemon.addTipo(tipo);
    }

    const pokemonConTipos = await Pokemon.findByPk(pokemon.id, {
      include: [{ model: Tipo, as: 'tipos', attributes: ['nombre'], through: { attributes: [] } }]
    });

    res.status(201).json(pokemonConTipos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al crear el Pokémon', error: error.message });
  }
};

// POST /api/pokemons/importar -> recibe { "id": 25 } o { "nombre": "pikachu" }
// y trae automáticamente la info desde la PokeAPI para guardarla
exports.importarDesdePokeapi = async (req, res) => {
  try {
    const { id, nombre } = req.body;
    const referencia = id || nombre;

    if (!referencia) {
      return res.status(400).json({ mensaje: 'Debes enviar id o nombre en el body' });
    }

    const { data } = await axios.get(`${POKEAPI_BASE}/${referencia.toString().toLowerCase()}`);

    const existente = await Pokemon.findOne({ where: { numero_pokedex: data.id } });
    if (existente) {
      return res.status(409).json({ mensaje: `${data.name} ya existe en la base de datos` });
    }

    const imagen = data.sprites.front_default || data.sprites.other?.['official-artwork']?.front_default;

    const pokemon = await Pokemon.create({
      numero_pokedex: data.id,
      nombre: data.name,
      imagen_url: imagen,
      precio: generarPrecio(),
      stock: generarStock()
    });

    for (const t of data.types) {
      const [tipo] = await Tipo.findOrCreate({ where: { nombre: t.type.name } });
      await pokemon.addTipo(tipo);
    }

    const pokemonConTipos = await Pokemon.findByPk(pokemon.id, {
      include: [{ model: Tipo, as: 'tipos', attributes: ['nombre'], through: { attributes: [] } }]
    });

    res.status(201).json(pokemonConTipos);
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ mensaje: 'No existe ese Pokémon en la PokeAPI' });
    }
    console.error(error);
    res.status(500).json({ mensaje: 'Error al importar desde la PokeAPI', error: error.message });
  }
};

// PUT /api/pokemons/:id -> actualizar
exports.actualizarPokemon = async (req, res) => {
  try {
    const pokemon = await Pokemon.findByPk(req.params.id);

    if (!pokemon) {
      return res.status(404).json({ mensaje: 'Pokémon no encontrado' });
    }

    const { nombre, imagen_url, precio, stock, tipos } = req.body;

    await pokemon.update({
      nombre: nombre ?? pokemon.nombre,
      imagen_url: imagen_url ?? pokemon.imagen_url,
      precio: precio ?? pokemon.precio,
      stock: stock ?? pokemon.stock
    });

    if (Array.isArray(tipos)) {
      await pokemon.setTipos([]);
      for (const nombreTipo of tipos) {
        const [tipo] = await Tipo.findOrCreate({ where: { nombre: nombreTipo } });
        await pokemon.addTipo(tipo);
      }
    }

    const pokemonActualizado = await Pokemon.findByPk(pokemon.id, {
      include: [{ model: Tipo, as: 'tipos', attributes: ['nombre'], through: { attributes: [] } }]
    });

    res.status(200).json(pokemonActualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al actualizar el Pokémon', error: error.message });
  }
};

// DELETE /api/pokemons/:id -> eliminar
exports.eliminarPokemon = async (req, res) => {
  try {
    const pokemon = await Pokemon.findByPk(req.params.id);

    if (!pokemon) {
      return res.status(404).json({ mensaje: 'Pokémon no encontrado' });
    }

    await pokemon.destroy();
    res.status(200).json({ mensaje: 'Pokémon eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al eliminar el Pokémon', error: error.message });
  }
};