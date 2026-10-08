import { Component, Input, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import {
  IonContent, IonButton, IonList, IonItem, IonInput, ModalController
} from '@ionic/angular';
import { Pokemon } from '../../models/pokemon';

@Component({
  selector: 'app-pokemon-form',
  templateUrl: './pokemon-form.component.html',
  standalone: true,
  imports: [ReactiveFormsModule, IonContent, IonButton, IonList, IonItem, IonInput],
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

    .contenido { padding: 16px 16px 24px; }

    .portada {
      text-align: center; background: #f3f4fb;
      border-radius: 16px; padding: 12px; margin-bottom: 12px;
    }
    .portada img { width: 120px; height: 120px; object-fit: contain; image-rendering: pixelated; }

    .nota { font-size: 13px; color: #6b7280; margin: 12px 4px 0; }

    .btn-guardar {
      --background: #3b4cca;
      --background-hover: #4a5ce0;
      --background-activated: #2d3a9e;
      --color: #fff;
      --border-radius: 24px;
      font-weight: 700;
      text-transform: none;
      height: 48px;
      margin-top: 20px;
    }
  `],
})
export class PokemonFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private modalCtrl = inject(ModalController);

  // Datos con los que se rellena el formulario (de la PokeAPI al agregar, o del Pokémon al editar)
  @Input() pokemon?: Pokemon;
  // 'crear' = agregar uno nuevo, 'editar' = modificar uno existente
  @Input() modo: 'crear' | 'editar' = 'crear';

  form = this.fb.group({
    numero_pokedex: [null as number | null, [Validators.required, Validators.min(1)]],
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    imagen_url: ['', Validators.required], // no se muestra, se guarda con el valor que ya trae
    tipos: ['', Validators.required],
    precio: [null as number | null, [Validators.required, Validators.min(0)]],
    stock: [null as number | null, [Validators.required, Validators.min(0)]],
  });

  get editando(): boolean {
    return this.modo === 'editar';
  }

  ngOnInit() {
    if (this.pokemon) {
      this.form.patchValue({
        numero_pokedex: this.pokemon.numero_pokedex,
        nombre: this.pokemon.nombre,
        imagen_url: this.pokemon.imagen_url,
        tipos: this.pokemon.tipos.join(', '),
      });

      // Al editar se cargan el precio y el stock actuales.
      // Al agregar quedan vacíos para que los escribas tú.
      if (this.editando) {
        this.form.patchValue({
          precio: this.pokemon.precio,
          stock: this.pokemon.stock,
        });
      }

      // El número de Pokédex y el nombre no se pueden cambiar
      this.form.controls.numero_pokedex.disable();
      this.form.controls.nombre.disable();
    }
  }

  guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const resultado: Pokemon = {
      numero_pokedex: Number(v.numero_pokedex),
      nombre: (v.nombre ?? '').trim().toLowerCase(),
      imagen_url: (v.imagen_url ?? '').trim(),
      // "grass, poison" -> ["grass", "poison"]
      tipos: (v.tipos ?? '')
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0),
      precio: Number(v.precio),
      stock: Number(v.stock),
    };

    this.modalCtrl.dismiss(resultado, 'confirm');
  }
}