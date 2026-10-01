import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import {
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent,
    IonList, IonItem, IonInput, ModalController
} from '@ionic/angular';

@Component({
    selector: 'app-pokemon-form',
    templateUrl: './pokemon-form.component.html',
    standalone: true,
    imports: [ReactiveFormsModule, IonHeader, IonToolbar, IonTitle, IonButtons,
            IonButton, IonContent, IonList, IonItem, IonInput],
})
export class PokemonFormComponent {
    private fb = inject(FormBuilder);
    private modalCtrl = inject(ModalController);

    form = this.fb.group({
    numero_pokedex: [null, [Validators.required, Validators.min(1)]],
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    imagen_url: ['', Validators.required],
    tipos: ['', Validators.required],
    precio: [null, [Validators.required, Validators.min(0)]],
    stock: [null, [Validators.required, Validators.min(0)]],
    });

    cancelar() {
    this.modalCtrl.dismiss(null, 'cancel');
    }

    guardar() {
    if (this.form.invalid) {
        this.form.markAllAsTouched();
        return;
    }
    this.modalCtrl.dismiss(this.form.value, 'confirm');
    }
}