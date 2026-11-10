/**
 * PIC16F84A Commands Library & User Custom Library Definitions
 */

const PIC_LIBRARY = [
    {
        category: 'Definície tlačidiel (commandy.c)',
        description: 'Mapovanie tlačidiel TL1 až TL5 na piny mikroprocesora PORTA (RA0 až RA4).',
        items: [
            {
                name: 'Definície všetkých tlačidiel TL1-TL5',
                code: `#define TL1 PORTAbits.RA0\n#define TL2 PORTAbits.RA1\n#define TL3 PORTAbits.RA2\n#define TL4 PORTAbits.RA3\n#define TL5 PORTAbits.RA4`,
                desc: 'Zadefinuje aliasy TL1..TL5 pre jednoduchú prácu s tlačidlami.'
            },
            {
                name: 'TL1 (Tlačidlo 1 - pin RA0)',
                code: `#define TL1 PORTAbits.RA0`,
                desc: 'Priradí TL1 na pin RA0'
            },
            {
                name: 'TL2 (Tlačidlo 2 - pin RA1)',
                code: `#define TL2 PORTAbits.RA1`,
                desc: 'Priradí TL2 na pin RA1'
            },
            {
                name: 'TL3 (Tlačidlo 3 - pin RA2)',
                code: `#define TL3 PORTAbits.RA2`,
                desc: 'Priradí TL3 na pin RA2'
            },
            {
                name: 'TL4 (Tlačidlo 4 - pin RA3)',
                code: `#define TL4 PORTAbits.RA3`,
                desc: 'Priradí TL4 na pin RA3'
            },
            {
                name: 'TL5 (Tlačidlo 5 - pin RA4)',
                code: `#define TL5 PORTAbits.RA4`,
                desc: 'Priradí TL5 na pin RA4'
            }
        ]
    },
    {
        category: 'Konfigurácia smeru pinov (TRIS)',
        description: 'Register TRIS určuje, či je pin VSTUP (1 = Input) alebo VÝSTUP (0 = Output).',
        items: [
            {
                name: 'TRISA = 0x1f; (Všetkých 5 pinov ako vstupy)',
                code: `TRISA = 0x1f;`,
                desc: 'Nastaví bity RA0..RA4 ako vstupné piny (vhodné pre tlačidlá TL1-5).'
            },
            {
                name: 'TRISB = 0x00; (Všetkých 8 pinov ako výstupy)',
                code: `TRISB = 0x00;`,
                desc: 'Nastaví bity RB0..RB7 ako výstupné piny (pre LED diódy 1-8).'
            },
            {
                name: 'TRISA = 0x01; (Len RA0 ako vstup)',
                code: `TRISA = 0x01;`,
                desc: 'Nastaví iba RA0 ako vstup, ostatné ako výstupy.'
            },
            {
                name: 'TRISA = 0x03; (RA0 a RA1 ako vstupy)',
                code: `TRISA = 0x03;`,
                desc: 'Nastaví RA0 a RA1 ako vstupy.'
            },
            {
                name: 'TRISA = 0x07; (RA0, RA1, RA2 ako vstupy)',
                code: `TRISA = 0x07;`,
                desc: 'Nastaví RA0, RA1 a RA2 ako vstupy.'
            },
            {
                name: 'TRISA = 0x0f; (RA0 až RA3 ako vstupy)',
                code: `TRISA = 0x0f;`,
                desc: 'Nastaví RA0, RA1, RA2, RA3 ako vstupy.'
            }
        ]
    },
    {
        category: 'Ovládanie LED diód (PORTB)',
        description: 'Zápis logických úrovní na piny PORTB (LED 1 naľavo až LED 8 napravo).',
        items: [
            {
                name: 'PORTB = 0x00; (Zhasnúť všetky LED)',
                code: `PORTB = 0x00;`,
                desc: 'Vynuluje všetky výstupy PORTB (zhasne LED 1 až 8).'
            },
            {
                name: 'PORTB = 0xFF; (Rozsvietiť všetky LED)',
                code: `PORTB = 0xFF;`,
                desc: 'Zapne všetkých 8 LED diód súčasne.'
            },
            {
                name: 'PORTB = 0x55; (Šachovnica 1)',
                code: `PORTB = 0x55; // 0b01010101`,
                desc: 'Rozsvieti každú druhú LED (LED 1, 3, 5, 7).'
            },
            {
                name: 'PORTB = 0xAA; (Šachovnica 2)',
                code: `PORTB = 0xAA; // 0b10101010`,
                desc: 'Rozsvieti opačnú polovicu LED diód (LED 2, 4, 6, 8).'
            },
            {
                name: 'Pole masiek LED diód (Pole / Array)',
                code: `int led[8] = {0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80};`,
                desc: 'Pole 8 hodnôt pre postupné rozsvecovanie LED diód cez led[i].'
            },
            {
                name: 'PORTBbits.RB0 = 1; (Ovládanie jednej LED)',
                code: `PORTBbits.RB0 = 1;`,
                desc: 'Rozsvieti iba LED 1 (pin RB0).'
            },
            {
                name: 'PORTBbits.RB0 = 0; (Zhasnutie jednej LED)',
                code: `PORTBbits.RB0 = 0;`,
                desc: 'Zhasne iba LED 1 (pin RB0).'
            }
        ]
    },
    {
        category: 'Podmienky a čítanie tlačidiel',
        description: 'Typické konštrukcie pre reakciu na stlačenie tlačidla.',
        items: [
            {
                name: 'Test stlačenia TL1',
                code: `if (TL1 == 1) {\n    PORTBbits.RB0 = 1;\n} else {\n    PORTBbits.RB0 = 0;\n}`,
                desc: 'Ak je stlačené TL1 (logická 1), zapne LED 1, inak vypne.'
            },
            {
                name: 'Čakanie na uvoľnenie tlačidla (Wait for release)',
                code: `while (TL1 == 1); // Počká, kým používateľ pustí TL1\n__delay_ms(50);   // Ošetrenie zákmitov`,
                desc: 'Zabráni viacnásobnému načítaniu jedného stlačenia.'
            },
            {
                name: 'Nekonečný cyklus programu (while loop)',
                code: `while (1) {\n    // Kód bežiaci dookola\n}`,
                desc: 'Hlavná slučka vykonávania mikroprocesora.'
            }
        ]
    },
    {
        category: 'Časové oneskorenia (Delays)',
        description: 'Pauzy a oneskorenia v milisekundách a mikrosekundách.',
        items: [
            {
                name: '__delay_ms(500); (Pol sekundy)',
                code: `__delay_ms(500);`,
                desc: 'Pozastaví beh programu na 500 milisekúnd.'
            },
            {
                name: '__delay_ms(100); (100 ms)',
                code: `__delay_ms(100);`,
                desc: 'Rýchlejšie oneskorenie 100 ms.'
            },
            {
                name: '__delay_us(50); (50 mikrosekúnd)',
                code: `__delay_us(50);`,
                desc: 'Krátke mikrosekundové oneskorenie.'
            }
        ]
    }
];

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PIC_LIBRARY };
}
