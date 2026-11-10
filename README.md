# PRM - Programovanie mikropočítačov web simulátor (Microchip PIC16F84A)

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Ready-brightgreen.svg)](https://pages.github.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-orange.svg)]()
[![Offline Capable](https://img.shields.io/badge/Offline-100%25-success.svg)]()

Moderný, responzívny webový simulátor vývojovej dosky s mikrokontrolérom **Microchip PIC16F84A** a vstavaným **C kompilátorom (XC8 syntax)**. Vhodný pre výučbu programovania mikropočítačov na stredných a vysokých školách, pre študentov aj učiteľov.

---

## ✨ Hlavné funkcie

### 1. ⚡ Hardvérová vývojová doska (ľavá časť)
- **Vstupný modul tlačidiel (TL1 až TL5)**:
  - 5 realistických 3D hmatníkových tlačidiel usporiadaných zľava doprava: **TL1 (RA0)**, **TL2 (RA1)**, **TL3 (RA2)**, **TL4 (RA3)** a **TL5 (RA4)**.
  - **Predvolený stav**: Všetky tlačidlá sú vypnuté (`0`).
  - **Stlačenie / držanie**: Pri stlačení alebo držaní myšou (alebo klávesom) majú hodnotu `1`. Po uvoľnení sa ihneď vrátia na `0`.
  - **Klávesové skratky**: Klávesy **`1`**, **`2`**, **`3`**, **`4`**, **`5`** umožňujú rýchle ovládanie tlačidiel priamo z klávesnice.
- **Riadiaci modul PIC16F84A**:
  - Realistické DIP-18 puzdro čipu `PIC16F84A-04/P`, 4.0 MHz oscilátor a červené tlačidlo **MCLR RESET**.
  - **MODUL A**: LED indikátory logických stavov vstupných pinov RA0 až RA4.
  - **MODUL B**: LED indikátory pinov PORTB (RB0 až RB7).
- **Výstupný modul LED diód (LED 1 až LED 8)**:
  - 8 LED diód zoradených zľava doprava (**LED 1 vľavo = RB0** až **LED 8 vpravo = RB7**).
  - Výber farby LED (žltá, červená, zelená, modrá).
  - Zobrazenie stavu registra PORTB v **HEX** (`0x00`) aj **BIN** (`00000000`).

### 2. 💻 C Kompilátor & Editor (pravá časť)
- **XC8 C syntax**: Podpora pre `#pragma config`, `#include <xc.h>`, registre `TRISA`, `TRISB`, `PORTA`, `PORTB`, bitové polia `PORTAbits.RA0` až `RA4`, `PORTBbits.RB0` až `RB7`, skratky `TL1`–`TL5`, funkciu oneskorenia `__delay_ms()` aj polia `int led[8] = {...};`.
- **Hlásenie chýb ako v C kompilátore**:
  - Značka **`❌`** priamo na čísle chybného riadka v editore.
  - Zvýraznenie chybného riadka a podrobný popis chyby v dolnej konzole s možnosťou kliknutia pre okamžitý skok na riadok.
- **Ladenie a krokovanie**:
  - **`▶ Spustiť (F5)`**: Kompilácia a spustenie virtuálneho PIC procesora.
  - **`⏸ Pozastaviť`**: Zastavenie behu na aktuálnom príkaze.
  - **`⏭ Krok (F10)`**: Krokovanie po jednotlivých riadkoch C kódu s vizuálnym zeleným zvýraznením vykonávaného riadka.
  - **`⏹ Zastaviť`**: Reset simulácie a registrov.
  - **Body prerušenia (Breakpoints `🔴`)**: Kliknutím na číslo riadka nastavíš bod prerušenia.
  - **Sledovať riadok**: Inteligentné sledovanie bežiaceho riadka bez zbytočného trhania či sťahovania stránky.

### 3. 🎨 Motívy vzhľadu (Biele, Čierne, Systémové)
- **☀️ Biele pozadie**: Moderný svetlý režim.
- **🌙 Čierne pozadie**: Tmavý režim vrátane tmavého editora kódu so zvýraznením syntaxe C.
- **💻 Systémové pozadie**: Automaticky sa riadi nastavením operačného systému Windows / macOS / Linux.
- Voľba sa automaticky ukladá do `localStorage`.

### 4. 🎛️ Rýchle akcie
- **`↺ template.c`**: Okamžité obnovenie editora na čistú počiatočnú šablónu.
- **`📋 Kopírovať`**: Skopírovanie celého kódu do schránky jedným klikom.
- **`📥 Stiahnuť .c`**: Stiahnutie súboru `main.c` do počítača.

---

## 🌐 Ako nahrať projekt na GitHub a spustiť ho online (GitHub Pages)

Tento projekt je navrhnutý ako **statická webová aplikácia s nulovými závislosťami** – nepotrebuje žiaden backend a funguje 100% v prehliadači!

### Postup nahratia na GitHub (jednoducho cez web):

1. Otvor si stránku **[github.com](https://github.com)** a prihlás sa.
2. Vpravo hore klikni na **`+`** -> **`New repository`**.
3. Pomenuj repozitár, napr.: `pic16f84a-simulator`.
4. Nastav ho ako **Public** a klikni na **`Create repository`**.
5. Na novej stránke klikni na odkaz **`uploading an existing file`**.
6. Pretiahni (drag & drop) všetky súbory a priečinky z tohto projektu (`index.html`, `style.css`, `app.js`, `c_compiler.js`, `pic_emulator.js`, `examples.js`, `library.js`, `server.js`, `README.md`, `LICENSE`, `package.json` a celý priečinok `vendor`).
7. Dole klikni na zelené tlačidlo **`Commit changes`**.

### Zapnutie online verzie zadarmo (GitHub Pages):

1. V tvojom vytvorenom repozitári na GitHube klikni hore na záložku **`Settings`** (Nastavenia).
2. V ľavom bočnom menu klikni na **`Pages`**.
3. V sekcii **Build and deployment** pod položkou **Branch**:
   - Zvoľ vetvu **`main`** (alebo `master`).
   - Priečinok nechaj **`/(root)`**.
   - Klikni na **`Save`**.
4. Po cca 1 minúte GitHub vygeneruje tvoju online adresu, napr.:
   ```text
   https://<tvoje-meno>.github.io/pic16f84a-simulator/
   ```
5. Simulátor je okamžite prístupný pre každého odkiaľkoľvek na svete!

---

## 🚀 Lokálne spustenie na počítači

Projekt má 0 externých závislostí a funguje aj kompletne **offline**:

### Spôsob 1: Dvojklik (najrýchlejší)
Stačí dvakrát kliknúť na súbor **`index.html`** vo Windows Prieskumníkovi. Otvorí sa v ľubovoľnom prehliadači (Chrome, Edge, Firefox, Brave).

### Spôsob 2: Cez lokálny Node.js server
V príkazovom riadku v priečinku projektu spusti:
```bash
node server.js
```
alebo:
```bash
npm start
```
A v prehliadači otvor adresu: **`http://localhost:3000`**

---

## ⌨️ Klávesové skratky

| Kláves | Akcia |
|---|---|
| **`1`** | Stlačenie a držanie tlačidla **TL1 (RA0)** |
| **`2`** | Stlačenie a držanie tlačidla **TL2 (RA1)** |
| **`3`** | Stlačenie a držanie tlačidla **TL3 (RA2)** |
| **`4`** | Stlačenie a držanie tlačidla **TL4 (RA3)** |
| **`5`** | Stlačenie a držanie tlačidla **TL5 (RA4)** |
| **`F5`** | Spustiť / Pokračovať v behu programu |
| **`F10`** | Vykonanie jedného kroku (Krokovať) |
| **Klik na číslo riadka** | Nastavenie / zrušenie bodu prerušenia (Breakpoint `🔴`) |

---

## 📁 Štruktúra projektu

```text
pic16f84a-simulator/
├── index.html          # Hlavná štruktúra webstránky a rozloženie simulátora
├── style.css           # Moderné CSS štýly, PCB dosky, svetlý a tmavý motív
├── app.js              # Prepojenie editora, udalostí tlačidiel, klávesov a UI
├── c_compiler.js       # Lexer, parser a AST kompilátor pre C (XC8 syntax)
├── pic_emulator.js     # Virtuálne jadro PIC16F84A, pamäť, registre, TRIS a PORTy
├── examples.js         # Predvolené šablóny kódu (template.c, commandy.c)
├── library.js          # Definície knižničných prvkov
├── server.js           # Voliteľný odľahčený lokálny Node.js server
├── package.json        # NPM konfigurácia projektu
├── LICENSE             # MIT Licencia
├── .gitignore          # Konfigurácia ignorovaných súborov pre Git
└── vendor/             # Lokálne offline knižnice editora CodeMirror 5
    ├── codemirror.min.js
    ├── codemirror.min.css
    ├── clike.min.js
    ├── active-line.min.js
    ├── matchbrackets.min.js
    └── closebrackets.min.js
```

---

## 📜 Licencia

Tento projekt je zverejnený pod slobodnou licenciou [MIT](LICENSE). Môže sa voľne používať, upravovať a šíriť na vzdelávacie aj komerčné účely.
