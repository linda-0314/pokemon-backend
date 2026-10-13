import { Injectable } from '@angular/core';

/**
 * Reconocedor de Pokémon con la cámara (todo corre en el navegador).
 *  1. Se carga MobileNet (red neuronal ya entrenada) con TensorFlow.js.
 *  2. MobileNet convierte cada imagen en un "vector" de 1280 números que describe lo que se ve.
 *  3. Se calculan los vectores de las imágenes oficiales de los 3 Pokémon y de otros "distractores".
 *  4. Cada foto de la cámara se compara: si se parece más a uno de los 3 se reconoce;
 *     si se parece más a un distractor, o a nada, sale el error "no reconocido".
 */

// ===== Los 3 Pokémon que la cámara sabe reconocer (cámbialos aquí si quieres otros) =====
export const POKEMON_RECONOCIBLES = ['pikachu', 'bulbasaur', 'charmander'] as const;

// Pokémon que NO se aceptan: sirven para que la cámara sepa decir "este no es".
const DISTRACTORES = [
  'raichu', 'pichu', 'ivysaur', 'venusaur', 'charmeleon', 'charizard',
  'squirtle', 'eevee', 'jigglypuff', 'meowth', 'psyduck', 'gengar',
  'snorlax', 'mewtwo', 'togepi', 'oddish', 'vulpix', 'magikarp',
];

export const CLASE_OTRO = 'otro';

// Similitud mínima (0 a 1) para aceptar un resultado. Súbela si reconoce cosas que no son.
const UMBRAL_SIMILITUD = 0.5;
// Diferencia mínima entre el 1.º y el 2.º lugar para no confundir dos Pokémon.
const MARGEN_MINIMO = 0.03;

const CLAVE_STORAGE = 'pokedex-camara-entrenamiento-v1';
const TAM = 224; // tamaño de entrada de MobileNet

export interface ResultadoReconocimiento {
  reconocido: boolean;
  nombre: string | null;
  similitud: number;
  mensaje: string;
}

interface Muestra {
  clase: string;
  vector: Float32Array;
  propia: boolean; // true = foto tomada por ti con la cámara
}

@Injectable({ providedIn: 'root' })
export class ReconocedorService {
  private modelo: any = null;
  private tf: any = null;
  private muestras: Muestra[] = [];
  private cargaEnCurso: Promise<void> | null = null;
  private ultimoError = '';

  get listo(): boolean {
    return this.modelo !== null && this.muestras.length > 0;
  }

  /** Carga TensorFlow, MobileNet y las imágenes de referencia (solo la primera vez). */
  preparar(progreso?: (texto: string) => void): Promise<void> {
    if (this.listo) return Promise.resolve();
    if (!this.cargaEnCurso) {
      this.cargaEnCurso = this.cargar(progreso).catch((e) => {
        this.cargaEnCurso = null; // permite reintentar
        throw e;
      });
    }
    return this.cargaEnCurso;
  }

  private async cargar(progreso?: (texto: string) => void) {
    // ---- Paso 1: TensorFlow ----
    progreso?.('Cargando inteligencia artificial...');
    let mobilenet: any;
    try {
      this.tf = await import('@tensorflow/tfjs-core');
      await import('@tensorflow/tfjs-backend-cpu');   // respaldo
      await import('@tensorflow/tfjs-backend-webgl'); // usa la tarjeta gráfica (más rápido)
      mobilenet = await import('@tensorflow-models/mobilenet');
      // Si la tarjeta gráfica (WebGL) no funciona, se usa el procesador (CPU)
      const okWebgl = await this.tf.setBackend('webgl').catch(() => false);
      if (!okWebgl) await this.tf.setBackend('cpu');
      await this.tf.ready();
    } catch (e: any) {
      throw new Error(`Paso 1 (cargar TensorFlow): ${e?.message ?? e}`);
    }

    // ---- Paso 2: modelo MobileNet ----
    progreso?.('Cargando modelo MobileNet...');
    this.modelo = await this.cargarModelo(mobilenet);

    // ---- Paso 3: imágenes de referencia de la PokeAPI ----
    const todos = [...POKEMON_RECONOCIBLES, ...DISTRACTORES];
    let hechos = 0;
    const referencias: Muestra[] = [];

    for (let i = 0; i < todos.length; i += 6) {
      const grupo = todos.slice(i, i + 6);
      const resultados = await Promise.all(grupo.map((n) => this.vectoresDeReferencia(n)));
      grupo.forEach((nombre, j) => {
        const clase = (POKEMON_RECONOCIBLES as readonly string[]).includes(nombre) ? nombre : CLASE_OTRO;
        resultados[j].forEach((vector) => referencias.push({ clase, vector, propia: false }));
        hechos++;
      });
      progreso?.(`Aprendiendo Pokémon... ${hechos}/${todos.length}`);
    }

    if (referencias.filter((m) => m.clase !== CLASE_OTRO).length === 0) {
      throw new Error(`Paso 3 (imágenes de la PokeAPI): ${this.ultimoError || 'no se descargó ninguna'}`);
    }
    // Si el navegador no tiene entrenamiento, se usa el del proyecto (src/assets/entrenamiento.json)
    let propias = this.leerEntrenamiento();
    if (propias.length === 0) propias = await this.entrenamientoDelProyecto();
    this.muestras = [...referencias, ...propias];
  }

  /** Intenta cargar MobileNet: primero la copia local, luego TF Hub y Kaggle. */
  private async cargarModelo(mobilenet: any) {
    const opciones = [
      { modelUrl: 'assets/modelo/model.json' }, // copia local (npm run descargar-modelo)
      {},                                        // tfhub.dev (por defecto)
      { modelUrl: 'https://www.kaggle.com/models/google/mobilenet-v2/TfJs/100-224-classification/3/model.json?tfjs-format=file' },
    ];
    const errores: string[] = [];
    for (const extra of opciones) {
      try {
        return await mobilenet.load({ version: 2, alpha: 1.0, inputRange: [0, 1], ...extra });
      } catch (e: any) {
        errores.push(`${(extra as any).modelUrl ?? 'tfhub.dev'} -> ${e?.message ?? e}`);
      }
    }
    console.error('No se pudo cargar MobileNet:', errores);
    throw new Error(`Paso 2 (modelo MobileNet): ${errores[0]}`);
  }

  /** Descarga las imágenes oficiales de un Pokémon y calcula sus vectores (con variaciones). */
  private async vectoresDeReferencia(nombre: string): Promise<Float32Array[]> {
    try {
      const resp = await fetch(`https://pokeapi.co/api/v2/pokemon/${nombre}`);
      if (!resp.ok) throw new Error(`PokeAPI respondió ${resp.status}`);
      const d = await resp.json();
      const urls: string[] = [
        d.sprites?.other?.['official-artwork']?.front_default,
        d.sprites?.other?.home?.front_default,
      ].filter(Boolean);

      const vectores: Float32Array[] = [];
      for (const url of urls) {
        const img = await this.cargarImagen(url);
        // Variaciones: fondo blanco/gris/oscuro, tamaño y espejo -> imita fotos reales
        const variaciones = [
          { fondo: '#ffffff', escala: 0.9, espejo: false },
          { fondo: '#ffffff', escala: 0.65, espejo: true },
          { fondo: '#bfbfbf', escala: 0.8, espejo: false },
          { fondo: '#2b2b2b', escala: 0.8, espejo: true },
        ];
        for (const v of variaciones) {
          vectores.push(await this.vector(this.componer(img, v.fondo, v.escala, v.espejo)));
        }
      }
      return vectores;
    } catch (e: any) {
      this.ultimoError = `${nombre}: ${e?.message ?? e}`;
      console.error('Error con', nombre, e);
      return [];
    }
  }

  private cargarImagen(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // necesario para poder leer los píxeles
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`no cargó la imagen ${url}`));
      img.src = url;
    });
  }

  private componer(img: HTMLImageElement, fondo: string, escala: number, espejo: boolean): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = c.height = TAM;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = fondo;
    ctx.fillRect(0, 0, TAM, TAM);
    const lado = TAM * escala;
    const off = (TAM - lado) / 2;
    if (espejo) {
      ctx.translate(TAM, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(img, off, off, lado, lado);
    return c;
  }

  /** Recorta el centro (cuadrado) de un video/imagen, donde está el recuadro guía. */
  recortarCentro(fuente: HTMLVideoElement | HTMLImageElement, zona = 0.8): HTMLCanvasElement {
    const w = fuente instanceof HTMLVideoElement ? fuente.videoWidth : fuente.naturalWidth;
    const h = fuente instanceof HTMLVideoElement ? fuente.videoHeight : fuente.naturalHeight;
    const lado = Math.min(w, h) * zona;
    const c = document.createElement('canvas');
    c.width = c.height = TAM;
    c.getContext('2d')!.drawImage(fuente, (w - lado) / 2, (h - lado) / 2, lado, lado, 0, 0, TAM, TAM);
    return c;
  }

  /** Convierte una imagen en su vector de características (normalizado). */
  private async vector(canvas: HTMLCanvasElement): Promise<Float32Array> {
    const datos: Float32Array = this.tf.tidy(() => {
      const emb = this.modelo.infer(canvas, true); // true = devuelve el vector, no la clase
      return this.tf.div(emb, this.tf.norm(emb)).dataSync().slice();
    });
    return datos;
  }

  private similitud(a: Float32Array, b: Float32Array): number {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s; // ya están normalizados -> esto es la similitud coseno
  }

  /** Identifica qué Pokémon hay en la imagen. */
  async identificar(canvas: HTMLCanvasElement): Promise<ResultadoReconocimiento> {
    if (!this.listo) throw new Error('El reconocedor no está listo');
    const v = await this.vector(canvas);

    // Para cada clase: promedio de sus 3 muestras más parecidas
    const porClase = new Map<string, number[]>();
    for (const m of this.muestras) {
      const s = this.similitud(v, m.vector) + (m.propia ? 0.03 : 0);
      if (!porClase.has(m.clase)) porClase.set(m.clase, []);
      porClase.get(m.clase)!.push(s);
    }
    const puntajes = [...porClase.entries()]
      .map(([clase, sims]) => {
        const top = sims.sort((a, b) => b - a).slice(0, 3);
        return { clase, puntaje: top.reduce((x, y) => x + y, 0) / top.length };
      })
      .sort((a, b) => b.puntaje - a.puntaje);

    let [primero, segundo] = puntajes;
    // Si "otro" gana por muy poco, se le da la oportunidad al mejor de los 3
    if (primero.clase === CLASE_OTRO && segundo && primero.puntaje - segundo.puntaje < 0.04) {
      [primero, segundo] = [segundo, primero];
    }
    const similitud = Math.max(0, Math.min(1, primero.puntaje));
    const lista = POKEMON_RECONOCIBLES.map((n) => n[0].toUpperCase() + n.slice(1)).join(', ');
    const error = (mensaje: string): ResultadoReconocimiento => ({ reconocido: false, nombre: null, similitud, mensaje });

    if (primero.clase === CLASE_OTRO) {
      return error(`Error: Pokémon no reconocido. Solo puedo identificar a ${lista}.`);
    }
    if (primero.puntaje < UMBRAL_SIMILITUD) {
      return error('Error: no reconozco lo que estás mostrando. Acerca el Pokémon al recuadro.');
    }
    if (segundo && segundo.clase !== CLASE_OTRO && primero.puntaje - segundo.puntaje < MARGEN_MINIMO) {
      return error('No estoy seguro de cuál es. Intenta con mejor luz o más cerca.');
    }
    return {
      reconocido: true,
      nombre: primero.clase,
      similitud,
      mensaje: `¡Es ${primero.clase[0].toUpperCase() + primero.clase.slice(1)}!`,
    };
  }

  // ===================== Entrenamiento con tu cámara =====================

  async agregarEjemplo(canvas: HTMLCanvasElement, clase: string) {
    const vector = await this.vector(canvas);
    this.muestras.push({ clase, vector, propia: true });
    this.guardarEntrenamiento();
  }

  contarEjemplos(): Record<string, number> {
    const conteo: Record<string, number> = {};
    for (const m of this.muestras) {
      if (m.propia) conteo[m.clase] = (conteo[m.clase] ?? 0) + 1;
    }
    return conteo;
  }

  borrarEntrenamiento() {
    this.muestras = this.muestras.filter((m) => !m.propia);
    try { localStorage.removeItem(CLAVE_STORAGE); } catch { /* sin storage */ }
  }

  private guardarEntrenamiento() {
    const propias = this.muestras
      .filter((m) => m.propia)
      .map((m) => ({ c: m.clase, v: Array.from(m.vector, (x) => Math.round(x * 10000) / 10000) }));
    try { localStorage.setItem(CLAVE_STORAGE, JSON.stringify(propias)); } catch { /* storage lleno */ }
  }

  /** Devuelve el entrenamiento como texto JSON (para guardarlo en src/assets/entrenamiento.json). */
  exportarEntrenamiento(): string {
    try { return localStorage.getItem(CLAVE_STORAGE) ?? '[]'; } catch { return '[]'; }
  }

  /** Lee el entrenamiento guardado dentro del proyecto, si existe. */
  private async entrenamientoDelProyecto(): Promise<Muestra[]> {
    try {
      const r = await fetch('assets/entrenamiento.json');
      if (!r.ok) return [];
      const datos = (await r.json()) as { c: string; v: number[] }[];
      return datos.map((m) => ({ clase: m.c, vector: new Float32Array(m.v), propia: true }));
    } catch {
      return [];
    }
  }

  private leerEntrenamiento(): Muestra[] {
    try {
      const crudo = localStorage.getItem(CLAVE_STORAGE);
      if (!crudo) return [];
      return (JSON.parse(crudo) as { c: string; v: number[] }[]).map((m) => ({
        clase: m.c, vector: new Float32Array(m.v), propia: true,
      }));
    } catch {
      return [];
    }
  }
}