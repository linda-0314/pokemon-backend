import { Component, inject, signal } from '@angular/core';
import { IonContent, IonButton, IonInput, ModalController } from '@ionic/angular';
import { Pokemon } from '../../models/pokemon';
import { PokemonService } from '../../services/pokemon.service';

@Component({
  selector: 'app-pokemon-import',
  templateUrl: './pokemon-import.component.html',
  standalone: true,
  imports: [IonContent, IonButton, IonInput],
  styles: [`
    .banner {
      background: linear-gradient(135deg, #cc0000, #ff4d4d);
      border-bottom: 4px solid #ffcb05;
      border-radius: 0 0 24px 24px;
      color: #fff;
      text-align: center;
      padding: 26px 20px 22px;
    }
    .banner h1 { margin: 0; font-size: 24px; font-weight: 700; }
    .banner p { margin: 6px 0 0; font-size: 14px; opacity: .92; }

    .contenido { padding: 20px 16px 24px; }

    .toggle {
      display: flex; gap: 4px; padding: 4px;
      background: #eef0fb; border-radius: 28px;
    }
    .toggle button {
      flex: 1; border: 0; background: transparent; cursor: pointer;
      padding: 12px; border-radius: 24px;
      font-family: inherit; font-size: 15px; font-weight: 600;
      color: #3b4cca; transition: all .2s;
    }
    .toggle button.activo {
      background: #3b4cca; color: #fff;
      box-shadow: 0 2px 6px rgba(59, 76, 202, .4);
    }

    .campo { margin-top: 18px; --border-radius: 12px; }

    .btn-buscar {
      --background: #3b4cca;
      --background-hover: #4a5ce0;
      --background-activated: #2d3a9e;
      --color: #fff;
      --border-radius: 24px;
      font-weight: 700;
      text-transform: none;
      height: 48px;
      margin-top: 18px;
    }

    .error { color: #cc0000; margin: 12px 4px 0; font-size: 14px; }
    .pista { text-align: center; color: #6b7280; font-size: 13px; margin-top: 8px; }
    .aviso { text-align: center; color: #b45309; font-size: 14px; font-weight: 600; margin-top: 8px; }

    .resultado {
      display: flex; align-items: center; gap: 16px;
      margin-top: 20px; padding: 14px;
      border-radius: 18px;
      background: linear-gradient(135deg, #fff7d6, #ffffff);
      border: 2px solid #ffcb05;
      box-shadow: 0 4px 12px rgba(0, 0, 0, .12);
      cursor: pointer;
    }
    .resultado.deshabilitado { opacity: .55; border-color: #9ca3af; cursor: not-allowed; }
    .resultado img { width: 96px; height: 96px; object-fit: contain; image-rendering: pixelated; }
    .numero { color: #6b7280; font-size: 14px; }
    .resultado h2 { margin: 2px 0 8px; text-transform: capitalize; color: #1d2b53; }
    .tipos { display: flex; gap: 6px; flex-wrap: wrap; }
    .chip {
      background: #3b4cca; color: #fff; border-radius: 12px;
      padding: 2px 10px; font-size: 12px; text-transform: capitalize;
    }
  `],
})
export class PokemonImportComponent {
  private modalCtrl = inject(ModalController);
  private pokemonService = inject(PokemonService);

  modo = signal<'id' | 'nombre'>('id');
  valor = signal('');
  error = signal('');
  buscando = signal(false);
  resultado = signal<Pokemon | null>(null);
  yaExiste = signal(false);

  cambiarModo(modo: 'id' | 'nombre') {
    this.modo.set(modo);
    this.valor.set('');
    this.error.set('');
    this.resultado.set(null);
    this.yaExiste.set(false);
  }

  escribir(texto: string | null | undefined) {
    this.valor.set(texto ?? '');
    this.error.set('');
  }

  buscar() {
    const v = this.valor().trim();

    if (!v) {
      this.error.set(this.modo() === 'id' ? 'Escribe el id del Pokémon' : 'Escribe el nombre del Pokémon');
      return;
    }

    if (this.modo() === 'id') {
      const id = Number(v);
      if (!Number.isInteger(id) || id < 1) {
        this.error.set('El id debe ser un número entero mayor a 0');
        return;
      }
    }

    this.error.set('');
    this.resultado.set(null);
    this.yaExiste.set(false);
    this.buscando.set(true);

    this.pokemonService.buscarEnPokeapi(v).subscribe({
      next: (p) => {
        this.resultado.set(p);
        // Revisa si ya está guardado en la base de datos del backend
        this.pokemonService.buscar(String(p.numero_pokedex)).subscribe({
          next: (lista) => {
            this.yaExiste.set(lista.length > 0);
            this.buscando.set(false);
          },
          error: () => this.buscando.set(false),
        });
      },
      error: (err) => {
        this.buscando.set(false);
        this.error.set(
          err.status === 404
            ? 'No existe ese Pokémon en la PokeAPI'
            : 'No se pudo consultar la PokeAPI. Revisa tu conexión.'
        );
      },
    });
  }

  // Al tocar el Pokémon encontrado, se devuelve para abrir el formulario
  elegir() {
    const p = this.resultado();
    if (!p || this.yaExiste()) return;
    this.modalCtrl.dismiss(p, 'confirm');
  }
}