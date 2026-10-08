import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
    IonCard, IonSpinner
} from '@ionic/angular';
import { PokemonService } from '../services/pokemon.service';
import { PokemonDetalle } from '../models/pokemon';

@Component({
    selector: 'app-pokemon-detalle',
    templateUrl: 'pokemon-detalle.page.html',
    styleUrls: ['pokemon-detalle.page.scss'],
    standalone: true,
    imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
    IonCard, IonSpinner
    ],
})
export class PokemonDetallePage implements OnInit {
    private route = inject(ActivatedRoute);
    private pokemonService = inject(PokemonService);

    pokemon = signal<PokemonDetalle | null>(null);
    cargando = signal(true);
    errorMsg = signal('');

    private tiposEs: Record<string, string> = {
    normal: 'normal', fire: 'fuego', water: 'agua', electric: 'eléctrico',
    grass: 'planta', ice: 'hielo', fighting: 'lucha', poison: 'veneno',
    ground: 'tierra', flying: 'volador', psychic: 'psíquico', bug: 'insecto',
    rock: 'roca', ghost: 'fantasma', dragon: 'dragón', dark: 'siniestro',
    steel: 'acero', fairy: 'hada',
    };

    ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.pokemonService.getDetalle(id).subscribe({
        next: (data) => {
        this.pokemon.set(data);
        this.cargando.set(false);
        },
        error: (err) => {
        this.errorMsg.set(err?.error?.mensaje || 'No se pudo cargar el Pokémon');
        this.cargando.set(false);
        },
    });
    }

  // "grass" -> "planta" (si ya viene en español, lo deja igual)
    traducirTipo(tipo: string): string {
    return this.tiposEs[tipo.toLowerCase()] ?? tipo;
    }

  // 1 -> "0001"
    numero(n: number): string {
    return String(n).padStart(4, '0');
    }
}