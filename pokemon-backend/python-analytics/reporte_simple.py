import requests

API_URL = "http://localhost:3000/api/pokemons"


def main():
    respuesta = requests.get(API_URL)
    respuesta.raise_for_status()
    pokemones = respuesta.json()

    print("=" * 50)
    print("REPORTE DE LA POKEDEX")
    print("=" * 50)

    total = len(pokemones)
    precios = [p["precio"] for p in pokemones]
    stocks = [p["stock"] for p in pokemones]

    print(f"\nTotal de Pokemon: {total}")
    print(f"Precio promedio: {sum(precios) / total:.2f}")
    print(f"Precio minimo: {min(precios):.2f}")
    print(f"Precio maximo: {max(precios):.2f}")
    print(f"Stock total: {sum(stocks)}")

    print("\nTop 5 Pokemon mas caros:")
    top_caros = sorted(pokemones, key=lambda p: p["precio"], reverse=True)[:5]
    for p in top_caros:
        print(f"  {p['numero_pokedex']:>3} {p['nombre']:<12} ${p['precio']}")

    print("\nCantidad de Pokemon por tipo:")
    conteo_tipos = {}
    for p in pokemones:
        for tipo in p["tipos"]:
            conteo_tipos[tipo] = conteo_tipos.get(tipo, 0) + 1

    for tipo, cantidad in sorted(conteo_tipos.items(), key=lambda t: t[1], reverse=True):
        print(f"  {tipo:<10} {cantidad}")


if __name__ == "__main__":
    main()
