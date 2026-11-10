# PRM - Webový simulátor mikropočítačov (PIC16F84A)

Webová aplikácia na simuláciu mikrokontroléra PIC16F84A. Projekt slúži ako pomôcka pri výučbe programovania mikropočítačov na SPŠT.

Aplikácia je hostovaná na: **[www.prmspst.eu](https://www.prmspst.eu)**


---

## Prehľad funkcií

### Hardvérová doska
- **Vstupný modul tlačidiel (TL1 - TL5):**
  - 5 tlačidiel pripojených na piny RA0 až RA4 (PORTA).
  - Predvolený stav je 0 (rozopnuté), pri stlačení a držaní hodnota 1.
  - Možnosť ovládania myšou alebo klávesmi 1 až 5 na klávesnici.
- **Riadiaci modul:**
  - Čip PIC16F84A s kryštálom 4.0 MHz a tlačidlom MCLR reset.
  - Indikačné diódy logických stavov pinov pre MODUL A (PORTA) a MODUL B (PORTB).
- **Výstupný modul LED diód (LED 1 - LED 8):**
  - 8 LED diód pripojených na piny RB0 až RB7 (PORTB), zľava (LED 1) doprava (LED 8).
  - Možnosť voľby farby diód (žltá, červená, zelená, modrá).
  - Zobrazenie celkového stavu registra PORTB v hexadecimálnom (HEX) a binárnom (BIN) tvare.

### Editor kódu a kompilátor
- Podpora syntaxe Microchip XC8 C (`#pragma config`, `#include <xc.h>`, registre `TRISA`, `TRISB`, `PORTA`, `PORTB`, bitové polia `PORTAbits`, `PORTBbits`, skratky `TL1` až `TL5`, funkcia `__delay_ms()`, polia, cykly a podmienky).
- Kontrola syntaxe s označením riadka a výpisom chýb v konzole kompilátora.
- Spustenie programu, pozastavenie, krokovanie po riadkoch a nastavovanie bodov prerušenia (breakpointov).
- Prepínanie vzhľadu prostredia (Svetlý režim, Tmavý režim, Podľa systému) uložené v prehliadači.
- Tlačidlá na obnovenie šablóny (template.c), kopírovanie kódu do schránky a stiahnutie súboru .c.

---

## Licencia

Tento projekt je zverejnený pod licenciou [MIT](LICENSE).
