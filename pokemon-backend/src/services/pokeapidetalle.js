const axios = require('axios');

const POKEAPI_V2 = 'https://pokeapi.co/api/v2';

const TIPOS_ES = {
    normal: 'normal', fire: 'fuego', water: 'agua', electric: 'eléctrico',
    grass: 'planta', ice: 'hielo', fighting: 'lucha', poison: 'veneno',
    ground: 'tierra', flying: 'volador', psychic: 'psíquico', bug: 'insecto',
    rock: 'roca', ghost: 'fantasma', dragon: 'dragón', dark: 'siniestro',
    steel: 'acero', fairy: 'hada'
};

const traducirTipo = (t) => TIPOS_ES[t] || t;

// Texto en español de una lista tipo [{ language: {name}, ... }]
const enEspanol = (lista, campo) =>
    lista.find((x) => x.language.name === 'es')?.[campo];

// Cache en memoria para no consultar la PokeAPI cada vez que se abre el mismo Pokémon
const cacheDetalle = new Map();

// Aplana la cadena evolutiva: [{ id, nombre }, ...]
function aplanarEvoluciones(nodo, lista = []) {
    const id = Number(nodo.species.url.split('/').filter(Boolean).pop());
    lista.push({ id, nombre: nodo.species.name });
    nodo.evolves_to.forEach((hijo) => aplanarEvoluciones(hijo, lista));
    return lista;
}

// Debilidades combinando todos los tipos del Pokémon (ej: agua/siniestro)
async function calcularDebilidades(tiposIngles) {
    const mult = {};
    const respuestas = await Promise.all(
    tiposIngles.map((t) => axios.get(`${POKEAPI_V2}/type/${t}`))
    );
    for (const { data } of respuestas) {
    const rel = data.damage_relations;
    rel.double_damage_from.forEach((x) => (mult[x.name] = (mult[x.name] ?? 1) * 2));
    rel.half_damage_from.forEach((x) => (mult[x.name] = (mult[x.name] ?? 1) * 0.5));
    rel.no_damage_from.forEach((x) => (mult[x.name] = (mult[x.name] ?? 1) * 0));
    }
    return Object.keys(mult).filter((k) => mult[k] > 1).map(traducirTipo);
}

async function traerDetalleExtra(numero) {
    if (cacheDetalle.has(numero)) return cacheDetalle.get(numero);

    const [{ data: poke }, { data: especie }] = await Promise.all([
    axios.get(`${POKEAPI_V2}/pokemon/${numero}`),
    axios.get(`${POKEAPI_V2}/pokemon-species/${numero}`)
    ]);

    const tiposIngles = poke.types.map((t) => t.type.name);

    const [debilidades, habilidades, cadena] = await Promise.all([
    calcularDebilidades(tiposIngles),
    Promise.all(
        poke.abilities
        .filter((a) => !a.is_hidden)
        .map(async (a) => {
            const { data } = await axios.get(a.ability.url);
            return enEspanol(data.names, 'name') || a.ability.name;
        })
    ),
    axios.get(especie.evolution_chain.url)
    ]);

    const evoluciones = aplanarEvoluciones(cadena.data.chain).map((e) => ({
    numero_pokedex: e.id,
    nombre: e.nombre,
    imagen_url: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${e.id}.png`
    }));

    const descripcionBruta = enEspanol(especie.flavor_text_entries.slice().reverse(), 'flavor_text');
  const hembra = especie.gender_rate === -1 ? null : (especie.gender_rate / 8) * 100;

    const extra = {
    altura_m: poke.height / 10,
    peso_kg: poke.weight / 10,
    categoria: (enEspanol(especie.genera, 'genus') || '').replace(/^Pokémon\s*/i, ''),
    descripcion: descripcionBruta ? descripcionBruta.replace(/[\n\f]/g, ' ') : '',
    habilidades,
    genero: hembra === null
        ? { sin_genero: true }
        : { sin_genero: false, macho: 100 - hembra, hembra },
    debilidades,
    evoluciones
    };

    cacheDetalle.set(numero, extra);
    return extra;
}

module.exports = { traerDetalleExtra };