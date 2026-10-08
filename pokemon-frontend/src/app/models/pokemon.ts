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