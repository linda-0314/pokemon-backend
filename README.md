# Pokémon Backend

Backend en Node.js + Express + Sequelize (SQLite) que almacena los 151 Pokémon
originales usando datos de [PokeAPI](https://pokeapi.co/) y expone un endpoint
REST para que una app en Ionic/Angular consuma la lista completa.

## Requisitos
- Node.js 18 o superior
- Conexión a internet (solo para ejecutar el script de carga, que consulta PokeAPI)

## Instalación

```bash
npm install
cp .env.example .env
```

## Historia 1: crear la base de datos y cargar los 151 Pokémon

```bash
npm run seed
```

Esto:
1. Crea (o recrea) el archivo `database.sqlite` con las tablas `pokemon`,
   `tipos` y la tabla intermedia `pokemon_tipos`.
2. Consulta PokeAPI (`GET https://pokeapi.co/api/v2/pokemon/{id}`) para los
   IDs del 1 al 151.
3. Inserta cada Pokémon con `numero_pokedex`, `nombre`, `imagen_url`, sus
   `tipos` (relación muchos a muchos) y valores generados de `precio` y
   `stock` (PokeAPI no provee estos dos últimos campos).

Verás en consola el progreso `(1/151) bulbasaur insertado correctamente.`
hasta completar los 151.

## Historia 2: exponer el endpoint GET /api/pokemons

```bash
npm start
```

El servidor queda escuchando en `http://localhost:3000`. Prueba el endpoint:

- Desde el navegador: `http://localhost:3000/api/pokemons`
- Desde Postman: `GET http://localhost:3000/api/pokemons`

Respuesta de ejemplo:

```json
[
  {
    "numero_pokedex": 1,
    "nombre": "bulbasaur",
    "imagen_url": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png",
    "tipos": ["grass", "poison"],
    "precio": 45.32,
    "stock": 78
  }
]
```

Este es el JSON que tu app en Ionic/Angular puede consumir directamente
haciendo un `GET` a esa misma ruta (recuerda ajustar la URL si despliegas el
backend en otro host/puerto, y CORS ya está habilitado).

## Estructura del proyecto

```
pokemon-backend/
├── server.js                     # Arranca el servidor y conecta la BD
├── src/
│   ├── app.js                    # Configuración de Express
│   ├── config/database.js        # Conexión Sequelize (SQLite)
│   ├── models/
│   │   ├── Pokemon.js
│   │   ├── Tipo.js
│   │   └── index.js              # Relación muchos a muchos
│   ├── scripts/seed.js           # Script de carga automatizada
│   ├── controllers/pokemonController.js
│   └── routes/pokemonRoutes.js
```

## Conectar a PostgreSQL en lugar de SQLite

El proyecto ya viene listo para las dos opciones; solo cambias variables de
entorno, no código.

1. Crea la base de datos vacía en tu servidor Postgres (con `psql`, pgAdmin o
   Docker):
   ```sql
   CREATE DATABASE pokemon_db;
   ```
2. En tu `.env`, comenta las líneas de SQLite y descomenta/ajusta las de
   Postgres:
   ```
   DB_DIALECT=postgres
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=pokemon_db
   DB_USER=postgres
   DB_PASSWORD=tu_clave
   ```
3. Instala el driver (ya está en `package.json`, solo falta `npm install` si
   aún no lo hiciste):
   ```bash
   npm install
   ```
4. Vuelve a correr la carga y el servidor, exactamente igual que con SQLite:
   ```bash
   npm run seed
   npm start
   ```

`src/config/database.js` detecta `DB_DIALECT` y arma la conexión con
Sequelize automáticamente; el resto del código (modelos, script de carga,
controlador y rutas) no cambia entre SQLite y PostgreSQL.

## Cambiar a MySQL (opcional)

Si en cambio necesitas MySQL: instala `mysql2`, agrega en `database.js` una
rama igual a la de `postgres` pero con `dialect: 'mysql'` y `port: 3306` por
defecto, y usa las mismas variables `DB_HOST`, `DB_NAME`, `DB_USER`,
`DB_PASSWORD` en tu `.env`.
