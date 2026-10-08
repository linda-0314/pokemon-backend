import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'pokemon/:id',
    loadComponent: () =>
      import('./pokemon-detalle/pokemon-detalle.page').then((m) => m.PokemonDetallePage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];