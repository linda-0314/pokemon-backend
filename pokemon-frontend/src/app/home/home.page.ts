import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonGrid, IonRow, IonCol,
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonButtons, IonButton, ModalController
} from '@ionic/angular';
import { PokemonService } from '../services/pokemon.service';
import { Pokemon } from '../models/pokemon';
import { PokemonFormComponent } from '../components/pokemon-form/pokemon-form.component';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonGrid, IonRow, IonCol,
    IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
    IonButtons, IonButton
  ],
})
export class HomePage implements OnInit {
  pokemons = signal<Pokemon[]>([]);

  constructor(private pokemonService: PokemonService, private modalCtrl: ModalController) {}

  ngOnInit() {
    this.pokemonService.getPokemons().subscribe({
      next: (data) => this.pokemons.set(data),
      error: (err) => console.error('Error al cargar pokémon', err),
    });
  }

  async abrirFormulario() {
    const modal = await this.modalCtrl.create({ component: PokemonFormComponent });
    await modal.present();
    const { data, role } = await modal.onWillDismiss();
    if (role === 'confirm') {
  console.log('Datos del formulario:', data);
  alert('Pokémon recibido: ' + JSON.stringify(data));
}
  }
}