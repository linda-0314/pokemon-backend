const axios = require('axios');
const { sequelize, Pokemon, Tipo } = require('../models');

const TOTAL_POKEMON = 151;
const POKEAPI_BASE = 'https://pokeapi.co/api/v2/pokemon';

// PokeAPI no provee precio ni stock, así que se generan valores aleatorios
// para poder poblar esos campos requeridos por el checklist.
function generarPrecio() {
  return parseFloat((Math.random() * (200 - 10) + 10).toFixed(2));
}

function generarStock() {
  return Math.floor(Math.random() * 100) + 1;
}

async function obtenerDatosPokemon(id) {
  const { data } = await axios.get(`${POKEAPI_BASE}/${id}`);
  const imagen =
    data.sprites.front_default ||
    data.sprites.other?.['official-artwork']?.front_default ||
    null;

  return {
    numero_pokedex: data.id,
    nombre: data.name,
    imagen_url: imagen,
    tipos: data.types.map((t) => t.type.name),
    precio: generarPrecio(),
    stock: generarStock()
  };
}

async function seed() {
  try {
    console.log('Conectando a la base de datos...');
    // force: true recrea las tablas desde cero cada vez que se ejecuta el script.
    await sequelize.sync({ force: true });

    console.log(`Descargando datos de los primeros ${TOTAL_POKEMON} Pokémon desde PokeAPI...`);

    for (let id = 1; id <= TOTAL_POKEMON; id++) {
      const datos = await obtenerDatosPokemon(id);

      const pokemon = await Pokemon.create({
        numero_pokedex: datos.numero_pokedex,
        nombre: datos.nombre,
        imagen_url: datos.imagen_url,
        precio: datos.precio,
        stock: datos.stock
      });

      for (const nombreTipo of datos.tipos) {
        const [tipo] = await Tipo.findOrCreate({ where: { nombre: nombreTipo } });
        await pokemon.addTipo(tipo);
      }

      console.log(`(${id}/${TOTAL_POKEMON}) ${datos.nombre} insertado correctamente.`);
    }

    console.log('Carga completada: los 151 Pokémon fueron almacenados con éxito.');
    process.exit(0);
  } catch (error) {
    console.error('Error durante la carga de datos:', error.message);
    process.exit(1);
  }
}

seed();
