import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { IonContent, IonButton, IonSpinner, ModalController } from '@ionic/angular';
import {
  CLASE_OTRO, POKEMON_RECONOCIBLES, ReconocedorService, ResultadoReconocimiento,
} from '../../services/reconocedor.service';

@Component({
  selector: 'app-pokemon-camara',
  templateUrl: './pokemon-camara.component.html',
  styleUrls: ['./pokemon-camara.component.scss'],
  standalone: true,
  imports: [IonContent, IonButton, IonSpinner],
})
export class PokemonCamaraComponent implements OnInit, OnDestroy {
  private modalCtrl = inject(ModalController);
  private reconocedor = inject(ReconocedorService);

  @ViewChild('video', { static: true }) videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('archivo', { static: true }) archivoRef!: ElementRef<HTMLInputElement>;

  readonly reconocibles = POKEMON_RECONOCIBLES;
  readonly claseOtro = CLASE_OTRO;

  cargando = signal(true);
  estado = signal('Preparando...');
  errorCamara = signal('');
  camaraActiva = signal(false);
  resultado = signal<ResultadoReconocimiento | null>(null);
  imagenResultado = signal('');
  mostrarEntrenar = signal(false);
  ejemplos = signal<Record<string, number>>({});

  private stream: MediaStream | null = null;
  private intervalo: any = null;
  private analizando = false;
  private ultimoNombre: string | null = null;
  private repeticiones = 0;
  private pausaHasta = 0; // pausa la cámara en vivo tras analizar una foto

  async ngOnInit() {
    // La cámara y el modelo se preparan al mismo tiempo
    const camara = this.encenderCamara();
    try {
      await this.reconocedor.preparar((t) => this.estado.set(t));
      this.ejemplos.set(this.reconocedor.contarEjemplos());
      this.estado.set('');
    } catch (e: any) {
      console.error(e);
      this.estado.set('Error: ' + (e?.message || String(e)));
      this.cargando.set(false);
      return;
    }
    await camara;
    this.cargando.set(false);
    if (this.camaraActiva()) this.iniciarDeteccion();
  }

  ngOnDestroy() {
    this.apagarCamara();
  }

  // ---------------- Cámara ----------------
  private async encenderCamara() {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.errorCamara.set('Este navegador no permite usar la cámara en vivo (se necesita https o localhost). Usa "Tomar foto".');
      return;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      const video = this.videoRef.nativeElement;
      video.srcObject = this.stream;
      await video.play();
      this.camaraActiva.set(true);
    } catch (e: any) {
      console.error(e);
      this.errorCamara.set(
        e?.name === 'NotAllowedError'
          ? 'No diste permiso para usar la cámara. Actívalo en la configuración o usa "Tomar foto".'
          : 'No se encontró una cámara disponible. Usa "Tomar foto".'
      );
    }
  }

  private apagarCamara() {
    clearInterval(this.intervalo);
    this.intervalo = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  // ---------------- Detección en vivo ----------------
  private iniciarDeteccion() {
    clearInterval(this.intervalo);
    this.intervalo = setInterval(() => this.analizarCuadro(), 700);
  }

  private async analizarCuadro() {
    const video = this.videoRef.nativeElement;
    if (this.analizando || !this.reconocedor.listo || video.readyState < 2 || this.mostrarEntrenar() || Date.now() < this.pausaHasta) return;
    this.analizando = true;
    try {
      const recorte = this.reconocedor.recortarCentro(video);
      const r = await this.reconocedor.identificar(recorte);

      // Solo se muestra un resultado cuando se repite 2 veces seguidas (evita parpadeos)
      if (r.nombre === this.ultimoNombre) {
        this.repeticiones++;
      } else {
        this.ultimoNombre = r.nombre;
        this.repeticiones = 1;
      }
      if (this.repeticiones >= 2) {
        this.resultado.set(r);
        this.imagenResultado.set(r.reconocido ? recorte.toDataURL('image/jpeg', 0.8) : '');
      }
    } finally {
      this.analizando = false;
    }
  }

  // ---------------- Foto (respaldo si no hay cámara en vivo) ----------------
  tomarFoto() {
    this.archivoRef.nativeElement.value = '';
    this.archivoRef.nativeElement.click();
  }

  async fotoElegida(evento: Event) {
    const archivo = (evento.target as HTMLInputElement).files?.[0];
    if (!archivo || !this.reconocedor.listo) return;
    const url = URL.createObjectURL(archivo);
    try {
      const img = await new Promise<HTMLImageElement>((ok, mal) => {
        const i = new Image();
        i.onload = () => ok(i);
        i.onerror = mal;
        i.src = url;
      });
      const recorte = this.reconocedor.recortarCentro(img, 1);
      this.resultado.set(await this.reconocedor.identificar(recorte));
      this.imagenResultado.set(recorte.toDataURL('image/jpeg', 0.8));
      this.pausaHasta = Date.now() + 5000;
    } catch {
      this.resultado.set({ reconocido: false, nombre: null, similitud: 0, mensaje: 'Error: no se pudo leer la foto.' });
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // ---------------- Entrenamiento ----------------
  alternarEntrenar() {
    this.mostrarEntrenar.update((v) => !v);
  }

  async guardarEjemplo(clase: string) {
    if (!this.camaraActiva()) return;
    const recorte = this.reconocedor.recortarCentro(this.videoRef.nativeElement);
    await this.reconocedor.agregarEjemplo(recorte, clase);
    this.ejemplos.set(this.reconocedor.contarEjemplos());
  }

  descargarEntrenamiento() {
    const blob = new Blob([this.reconocedor.exportarEntrenamiento()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'entrenamiento.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  borrarEntrenamiento() {
    // Lógica para limpiar los datos guardados (por ejemplo, en localStorage o tus arreglos locales)
    localStorage.removeItem('entrenamiento_pokemon'); // o la clave que utilices
    }

  // ---------------- Salida ----------------
  usarPokemon() {
    const r = this.resultado();
    if (!r?.reconocido || !r.nombre) return;
    this.apagarCamara();
    this.modalCtrl.dismiss({ nombre: r.nombre }, 'confirm');
  }

  cerrar() {
    this.apagarCamara();
    this.modalCtrl.dismiss(null, 'cancel');
  }

  porcentaje(n: number): number {
    return Math.round(n * 100);
  }
}