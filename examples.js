/**
 * Presets and Code Examples for PIC16F84A Simulator
 */

const TEMPLATE_C = `// CONFIG
#pragma config FOSC = EXTRC     // Oscillator Selection bits (RC oscillator)
#pragma config WDTE = OFF       // Watchdog Timer (WDT disabled)
#pragma config PWRTE = ON       // Power-up Timer Enable bit (Power-up Timer is enabled)
#pragma config CP = OFF         // Code Protection bit (Code protection disabled)

#include <xc.h>


void main(void) {
    

    
    return;
}
`;

const COMMANDY_C = `// CONFIG
#pragma config FOSC = EXTRC
#pragma config WDTE = OFF
#pragma config PWRTE = ON
#pragma config CP = OFF

#include <xc.h>

#define TL1 PORTAbits.RA0
#define TL2 PORTAbits.RA1
#define TL3 PORTAbits.RA2
#define TL4 PORTAbits.RA3
#define TL5 PORTAbits.RA4

#define _XTAL_FREQ 4000000

void main(void) {
    // Nastavenie smeru pinov (TRIS): 1 = Vstup (Input), 0 = Výstup (Output)
    TRISA = 0x1f; // Všetkých 5 pinov PORTA ako vstupy pre tlačidlá TL1-TL5
    TRISB = 0x00; // Všetkých 8 pinov PORTB ako výstupy pre LED 1-8

    PORTB = 0x00; // Počiatočné zhasnutie všetkých LED diód

    while (1) {
        // Tlačidlá sú vypnuté (0), pri stlačení majú hodnotu 1
        if (TL1 == 1) {
            PORTB = 0x01; // Rozsvieť LED 1 (RB0)
        } else if (TL2 == 1) {
            PORTB = 0x02; // Rozsvieť LED 2 (RB1)
        } else if (TL3 == 1) {
            PORTB = 0x04; // Rozsvieť LED 3 (RB2)
        } else if (TL4 == 1) {
            PORTB = 0x08; // Rozsvieť LED 4 (RB3)
        } else if (TL5 == 1) {
            PORTB = 0xFF; // Rozsvieť všetky LED 1-8
        } else {
            PORTB = 0x00; // Žiadne tlačidlo nestlačené -> zhasni LED
        }
    }

    return;
}
`;

const EXAMPLES = [
    {
        id: 'template',
        title: 'Predvolená šablóna (template.c)',
        code: TEMPLATE_C,
        desc: 'Čistá štartovacia šablóna zo súboru template.c s konfiguráciou a funkciou main().'
    },
    {
        id: 'commandy',
        title: 'Príkazy a tlačidlá (commandy.c)',
        code: COMMANDY_C,
        desc: 'Ukážka so všetkými príkazmi z commandy.c (TL1-TL5 definície, TRISA, TRISB, PORTB).'
    },
    {
        id: 'blink',
        title: 'Blikanie prvej LED diódy (Blink)',
        code: `// CONFIG
#pragma config FOSC = EXTRC
#pragma config WDTE = OFF
#pragma config PWRTE = ON
#pragma config CP = OFF

#include <xc.h>
#define _XTAL_FREQ 4000000

void main(void) {
    TRISB = 0x00; // PORTB ako výstupy
    PORTB = 0x00; // Všetky LED zhasnuté

    while (1) {
        PORTBbits.RB0 = 1; // Rozsvieť LED 1 (RB0)
        __delay_ms(500);

        PORTBbits.RB0 = 0; // Zhasni LED 1
        __delay_ms(500);
    }

    return;
}
`,
        desc: 'Jednoduché periodické blikanie LED 1 v polsekundovom intervale.'
    },
    {
        id: 'chaser',
        title: 'Bežiace svetlo (Knight Rider)',
        code: `// CONFIG
#pragma config FOSC = EXTRC
#pragma config WDTE = OFF
#pragma config PWRTE = ON
#pragma config CP = OFF

#include <xc.h>
#define _XTAL_FREQ 4000000

void main(void) {
    TRISB = 0x00; // Všetkých 8 LED ako výstupy
    PORTB = 0x00;

    while (1) {
        // Beh zľava doprava: LED 1 -> LED 8
        for (int i = 0; i < 8; i++) {
            PORTB = (1 << i);
            __delay_ms(150);
        }

        // Beh sprava doľava: LED 7 -> LED 2
        for (int i = 6; i >= 1; i--) {
            PORTB = (1 << i);
            __delay_ms(150);
        }
    }

    return;
}
`,
        desc: 'Svetelný efekt bežiaceho svetla z LED 1 po LED 8 a naspäť.'
    },
    {
        id: 'counter',
        title: 'Binárne počítadlo s tlačidlom TL1',
        code: `// CONFIG
#pragma config FOSC = EXTRC
#pragma config WDTE = OFF
#pragma config PWRTE = ON
#pragma config CP = OFF

#include <xc.h>
#define _XTAL_FREQ 4000000

#define TL1 PORTAbits.RA0
#define TL5 PORTAbits.RA4

void main(void) {
    TRISA = 0x1F; // Vstupy pre tlačidlá
    TRISB = 0x00; // Výstupy pre 8 LED diód
    PORTB = 0x00;

    unsigned char counter = 0;

    while (1) {
        // Tlačidlo TL1 pripočíta 1
        if (TL1 == 1) {
            counter++;
            PORTB = counter;
            while (TL1 == 1); // Počkaj na pustenie tlačidla
            __delay_ms(50);   // Ošetrenie zákmitov (debounce)
        }

        // Tlačidlo TL5 vynuluje počítadlo
        if (TL5 == 1) {
            counter = 0;
            PORTB = 0;
            while (TL5 == 1);
            __delay_ms(50);
        }
    }

    return;
}
`,
        desc: '8-bitové binárne počítadlo na LED diódach (0-255) ovládané tlačidlom TL1, reset tlačidlom TL5.'
    },
    {
        id: 'toggle_button',
        title: 'Prepínanie LEDky stlačením TL1',
        code: `// CONFIG
#pragma config FOSC = EXTRC
#pragma config WDTE = OFF
#pragma config PWRTE = ON
#pragma config CP = OFF

#include <xc.h>
#define _XTAL_FREQ 4000000

#define TL1 PORTAbits.RA0

void main(void) {
    TRISA = 0x1F;
    TRISB = 0x00;
    PORTB = 0x00;

    while (1) {
        if (TL1 == 1) {
            PORTBbits.RB0 ^= 1; // Invertuj stav LED 1 (0 -> 1, 1 -> 0)
            while (TL1 == 1);   // Počkaj na uvoľnenie TL1
            __delay_ms(100);    // Debounce
        }
    }

    return;
}
`,
        desc: 'Každé stlačenie TL1 prepne stav LED 1 (zapne alebo vypne).'
    },
    {
        id: 'array_led',
        title: 'Sekvencia cez pole (int led[8])',
        code: `// CONFIG
#pragma config FOSC = EXTRC
#pragma config WDTE = OFF
#pragma config PWRTE = ON
#pragma config CP = OFF

#include <xc.h>
#define _XTAL_FREQ 4000000

void main(void) {
    TRISB = 0x00; // PORTB ako výstupy
    PORTB = 0x00; // Všetky LED zhasnuté

    // Pole bitových masiek pre každú z 8 LED diód
    int led[8] = {0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80};

    while (1) {
        for (int i = 0; i < 8; i++) {
            PORTB = led[i]; // Rozsvieť LED podľa indexu v poli
            __delay_ms(200);
        }
    }

    return;
}
`,
        desc: 'Rozsvecovanie LED diód pomocou inicializovaného poľa masiek int led[8] = {...}.'
    }
];

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TEMPLATE_C, COMMANDY_C, EXAMPLES };
}
