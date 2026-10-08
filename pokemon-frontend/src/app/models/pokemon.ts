export interface Pokemon {
  id?: number;            
  numero_pokedex: number;
  nombre: string;
  imagen_url: string;
  tipos: string[];
  precio: number;
  stock: number;
}

// Lo que se envía a POST /pokemons/importar: el id O el nombre
export interface ImportarPokemon {
  id?: number;
  nombre?: string;
}

export interface PokemonDetalle extends Pokemon {
  altura_m: number;
  peso_kg: number;
  categoria: string;
  descripcion: string;
  habilidades: string[];
  genero: { sin_genero: boolean; macho?: number; hembra?: number };
  debilidades: string[];
  evoluciones: { numero_pokedex: number; nombre: string; imagen_url: string }[];
}