const { Pokemon, Tipo } = require('../models');

exports.obtenerPokemones = async (req, res) => {
  try {
    const pokemones = await Pokemon.findAll({
      include: [
        {
          model: Tipo,
          as: 'tipos',
          attributes: ['nombre'],
          through: { attributes: [] } // oculta la tabla intermedia en la respuesta
        }
      ],
      order: [['numero_pokedex', 'ASC']]
    });

    const resultado = pokemones.map((p) => ({
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
