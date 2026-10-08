import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonGrid, IonRow, IonCol,
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonButtons, IonButton, IonSearchbar,
  ModalController, ToastController, AlertController
} from '@ionic/angular';
import { PokemonService } from '../services/pokemon.service';
import { Pokemon } from '../models/pokemon';
import { PokemonFormComponent } from '../components/pokemon-form/pokemon-form.component';
import { PokemonImportComponent } from '../components/pokemon-import/pokemon-import.component';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonGrid, IonRow, IonCol,
    IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
    IonButtons, IonButton, IonSearchbar
  ],
})
export class HomePage implements OnInit {
  pokemons = signal<Pokemon[]>([]);
  textoBusqueda = '';

  constructor(
    private pokemonService: PokemonService,
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    this.cargar();
  }

  // ---------- LISTAR (GET /pokemons) ----------
  cargar() {
    this.pokemonService.getPokemons().subscribe({
      next: (data) => this.pokemons.set(data),
      error: (err) => this.mostrarError(err, 'No se pudo conectar con el backend'),
    });
  }

  // Vuelve a pedir la lista respetando lo que haya escrito en el buscador
  private refrescar() {
    if (this.textoBusqueda) {
      this.buscar(this.textoBusqueda);
    } else {
      this.cargar();
    }
  }

  // ---------- BUSCAR en la lista (GET /pokemons/buscar?query=) ----------
  onBuscar(valor: string | null | undefined) {
    this.textoBusqueda = (valor ?? '').trim();
    if (!this.textoBusqueda) {
      this.cargar();
      return;
    }
    this.buscar(this.textoBusqueda);
  }

  private buscar(query: string) {
    this.pokemonService.buscar(query).subscribe({
      next: (data) => this.pokemons.set(data),
      error: (err) => this.mostrarError(err, 'Error al buscar'),
    });
  }

  // ---------- AGREGAR (buscar por id o nombre -> elegir -> formulario -> POST /pokemons) ----------
  async agregar() {
    // 1) Modal de búsqueda
    const buscador = await this.modalCtrl.create({ component: PokemonImportComponent });
    await buscador.present();
    const elegido = await buscador.onDidDismiss();
    if (elegido.role !== 'confirm' || !elegido.data) return;

    // 2) Formulario con los datos del Pokémon ya puestos
    const formulario = await this.modalCtrl.create({
      component: PokemonFormComponent,
      componentProps: { pokemon: elegido.data, modo: 'crear' },
    });
    await formulario.present();
    const { data, role } = await formulario.onWillDismiss();

    // 3) Guardar en el backend
    if (role === 'confirm' && data) {
      this.pokemonService.crear(data).subscribe({
        next: () => {
          this.mostrarMensaje('Pokémon agregado correctamente');
          this.refrescar();
        },
        error: (err) => this.mostrarError(err, 'No se pudo agregar el Pokémon'),
      });
    }
  }

  // ---------- EDITAR (PUT /pokemons/:id) ----------
  async editar(p: Pokemon) {
    const modal = await this.modalCtrl.create({
      component: PokemonFormComponent,
      componentProps: { pokemon: p, modo: 'editar' },
    });
    await modal.present();
    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm' && data) {
      const { nombre, imagen_url, tipos, precio, stock } = data as Pokemon;
      this.pokemonService.actualizar(p.id!, { nombre, imagen_url, tipos, precio, stock }).subscribe({
        next: () => {
          this.mostrarMensaje('Pokémon actualizado correctamente');
          this.refrescar();
        },
        error: (err) => this.mostrarError(err, 'No se pudo actualizar el Pokémon'),
      });
    }
  }

  // ---------- ELIMINAR (DELETE /pokemons/:id) ----------
  async eliminar(p: Pokemon) {
    const alerta = await this.alertCtrl.create({
      header: 'Eliminar Pokémon',
      message: `¿Seguro que quieres eliminar a ${p.nombre}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.pokemonService.eliminar(p.id!).subscribe({
              next: (r) => {
                this.mostrarMensaje(r.mensaje || 'Pokémon eliminado');
                this.refrescar();
              },
              error: (err) => this.mostrarError(err, 'No se pudo eliminar el Pokémon'),
            });
          },
        },
      ],
    });
    await alerta.present();
  }

  // ---------- Mensajes ----------
  private mostrarError(err: any, porDefecto: string) {
    console.error(err);
    this.mostrarMensaje(err?.error?.mensaje || porDefecto);
  }

  private async mostrarMensaje(mensaje: string) {
    const toast = await this.toastCtrl.create({ message: mensaje, duration: 2500 });
    await toast.present();
  }
}