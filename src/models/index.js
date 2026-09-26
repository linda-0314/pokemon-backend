const sequelize = require('../config/database');
const Pokemon = require('./Pokemon');
const Tipo = require('./Tipo');

// Un Pokémon puede tener varios tipos y un tipo puede pertenecer a varios Pokémon.
// Sequelize crea automáticamente la tabla intermedia "pokemon_tipos".
Pokemon.belongsToMany(Tipo, { through: 'pokemon_tipos', as: 'tipos', foreignKey: 'pokemonId' });
Tipo.belongsToMany(Pokemon, { through: 'pokemon_tipos', as: 'pokemones', foreignKey: 'tipoId' });

module.exports = { sequelize, Pokemon, Tipo };
