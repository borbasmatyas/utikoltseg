# Útiköltség-elszámolás

Egyszerű, böngészőben futó útiköltség-elszámoló webalkalmazás. Keretrendszer nélkül, tiszta HTML/CSS/JS alapon – GitHub Pages-en is üzemképes.

## Funkciók

- **Egyszerű mód** – km-alapú vagy összeg-alapú visszaszámítás
- **Részletes mód** – útvonalsorok rögzítése dátummal és km-óra állásokkal
  - Dátum szerinti automatikus rendezés (azonos dátumnál km-óra szerint)
  - Kötelező dátummező; dátum nélküli utolsó sorhoz nem lehet új sort felvenni
  - Soft validáció: km-óra átfedés és növekvési sorrend ellenőrzése (figyelmeztetéssel, nem tiltással)
- **Üzemanyag-norma automatikus kitöltése** a 60/1992. (IV. 1.) Korm. rendelet alapján (`norma.json`)
  - Benzin, Gázolaj, LPG (benzin × 1,2), CNG/LNG (benzin × 0,8)
  - Motorkerékpár kategóriák is
- **Elszámoló és gépjármű adatok** – cégnév, cím, adószám (csoportos adószám-kezeléssel), forgalmi rendszám
- **Nyomtatási nézet** – elszámoló, gépjármű és útvonal adatok 3-hasábos elrendezésben
- **LocalStorage mentés** – adatok automatikusan megmaradnak újratöltés után; lapfül (egyszerű/részletes) állása is mentődik
- **Lapfül-váltás védelme** – kitöltött fülről csak megerősítés után lehet váltani

## Fájlok

| Fájl | Leírás |
|---|---|
| `index.html` | Az alkalmazás teljes UI-ja |
| `app.js` | Minden logika (számítás, validáció, mentés, nyomtatás) |
| `style.css` | Stílusok, reszponzív és print layout |
| `norma.json` | Üzemanyag-norma adatok (60/1992. Korm. rendelet) |
| `ceg.json` | Opcionális előtöltött cégesadatok |

## Helyi futtatás

A `fetch()` hívások miatt HTTP kiszolgáló szükséges (nem nyitható meg simán fájlként):

```bash
python3 -m http.server 8080
# vagy
npx serve .
```

Majd böngészőben: `http://localhost:8080`

## Cégadatok előtöltése

A `ceg.json` fájlban megadhatók az alapértelmezett elszámoló adatok:

```json
{
  "nev": "Minta Kft.",
  "cim": "1234 Budapest, Példa utca 1.",
  "adoszam": "12345678-2-42",
  "csoporttag_adoszam": ""
}
```

Az itt megadott értékek automatikusan betöltődnek az űrlapba. A LocalStorage-ban tárolt adatok felülírják ezeket.

## Norma testreszabása

A `norma.json` szerkesztésével frissíthetők az üzemanyag-normaértékek jogszabályváltozás esetén. A `amortizacio_alapertelmezett` mező adja az alapértelmezett amortizációs értéket (Ft/km).


## Kapcsolódó jogszabályok és hivatkozások

- NAV üzemanyag elszámolás [nav.gov.hu/ugyfeliranytu/uzemanyag/](https://nav.gov.hu/ugyfeliranytu/uzemanyag/)

- 60/1992. (IV. 1.) Korm. rendelet a közúti gépjárművek, az egyes mezőgazdasági, erdészeti és halászati erőgépek üzemanyag- és kenőanyag-fogyasztásának igazolás nélkül elszámolható mértékéről [net.jogtar.hu/jogszabaly?docid=99200060.kor](https://net.jogtar.hu/jogszabaly?docid=99200060.kor)

---

Ez a projekt a GitHub CoPilot segítségével jött létre.