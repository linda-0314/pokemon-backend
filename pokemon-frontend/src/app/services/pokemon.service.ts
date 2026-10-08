import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ImportarPokemon, Pokemon, PokemonDetalle } from '../models/pokemon';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PokemonService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/pokemons`;
  private pokeapi = 'https://pokeapi.co/api/v2/pokemon';

  // GET /api/pokemons
  getPokemons(): Observable<Pokemon[]> {
    return this.http.get<Pokemon[]>(this.url);
  }

  // GET /api/pokemons/buscar?query=25  |  ?query=pikachu
  buscar(query: string): Observable<Pokemon[]> {
    const params = new HttpParams().set('query', query);
    return this.http.get<Pokemon[]>(`${this.url}/buscar`, { params });
  }

  // GET /api/pokemons/:id  (id interno)
  getById(id: number): Observable<Pokemon> {
    return this.http.get<Pokemon>(`${this.url}/${id}`);
  }
  // GET /api/pokemons/:id/detalle  (datos de la BD + info extra de la PokeAPI)
  getDetalle(id: number): Observable<PokemonDetalle> {
  return this.http.get<PokemonDetalle>(`${this.url}/${id}/detalle`);
  }

  // Consulta la PokeAPI SIN guardar nada: sirve para mostrar el Pokémon antes de agregarlo
  buscarEnPokeapi(termino: string): Observable<Pokemon> {
    const ref = encodeURIComponent(termino.trim().toLowerCase());
    return this.http.get<any>(`${this.pokeapi}/${ref}`).pipe(
      map((d) => ({
        numero_pokedex: d.id,
        nombre: d.name,
        imagen_url:
          d.sprites?.front_default ||
          d.sprites?.other?.['official-artwork']?.front_default ||
          '',
        tipos: (d.types ?? []).map((t: any) => t.type.name),
        // La PokeAPI NO trae precio ni stock: van en 0 y el formulario los deja vacíos
        precio: 0,
        stock: 0,
      }))
    );
  }

  // POST /api/pokemons/importar  { id } o { nombre }
  importar(dato: ImportarPokemon): Observable<Pokemon> {
    return this.http.post<Pokemon>(`${this.url}/importar`, dato);
  }

  // POST /api/pokemons
  crear(pokemon: Pokemon): Observable<Pokemon> {
    return this.http.post<Pokemon>(this.url, pokemon);
  }

  // PUT /api/pokemons/:id
  actualizar(id: number, cambios: Partial<Pokemon>): Observable<Pokemon> {
    return this.http.put<Pokemon>(`${this.url}/${id}`, cambios);
  }

  // DELETE /api/pokemons/:id
  eliminar(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.url}/${id}`);
  }
}