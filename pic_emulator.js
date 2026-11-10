/**
 * Virtual PIC16F84A Microcontroller Hardware & Execution Engine
 */

class PIC16F84A {
    constructor() {
        // Hardware Registers (PIC16F84A has 8-bit registers)
        this.registers = {
            TRISA: 0x1F,  // 5 bits: 1 = input, 0 = output (default on reset: all inputs)
            TRISB: 0xFF,  // 8 bits: default all inputs
            PORTA: 0x00,  // 5 bits: RA0 - RA4
            PORTB: 0x00,  // 8 bits: RB0 - RB7
            STATUS: 0x18,
            OPTION_REG: 0xFF,
            INTCON: 0x00,
            TMR0: 0x00,
            W: 0x00,      // Working register
            PC: 0x00      // Program counter
        };

        // Button physical state: true = physically pressed, false = unpressed
        this.buttons = {
            TL1: false, // RA0
            TL2: false, // RA1
            TL3: false, // RA2
            TL4: false, // RA3
            TL5: false  // RA4
        };

        // Button logic: 'pulldown' (unpressed = 0, pressed = 1)
        this.buttonLogic = 'pulldown';

        // Simulation control
        this.isRunning = false;
        this.isPaused = false;
        this.isStepping = false;
        this.stepResolver = null;
        this.abortController = null;
        this.speedMultiplier = 1.0; // 1.0 = real-time, can be slowed or sped up
        this.stepDelayMs = 0;       // delay between steps in continuous mode

        this.cycleCount = 0;
        this.currentLine = 1;

        // Callbacks for UI updates
        this.onStateChange = null;
        this.onLineChange = null;
        this.onConsoleLog = null;
        this.onExecutionEnd = null;

        // Global variables table for C code
        this.globals = new Map();
        this.functions = new Map();
    }

    reset() {
        this.stop();
        this.registers.TRISA = 0x1F;
        this.registers.TRISB = 0xFF;
        this.registers.PORTA = 0x00;
        this.registers.PORTB = 0x00;
        this.registers.STATUS = 0x18;
        this.registers.OPTION_REG = 0xFF;
        this.registers.INTCON = 0x00;
        this.registers.TMR0 = 0x00;
        this.registers.W = 0x00;
        this.registers.PC = 0x00;
        this.cycleCount = 0;
        this.currentLine = 1;
        this.globals.clear();
        this.functions.clear();
        this.updatePortAFromButtons();
        this.notifyState();
    }

    setButtonState(buttonName, isPressed) {
        if (this.buttons.hasOwnProperty(buttonName)) {
            this.buttons[buttonName] = isPressed;
            this.updatePortAFromButtons();
            this.notifyState();
        }
    }

    toggleButtonState(buttonName) {
        if (this.buttons.hasOwnProperty(buttonName)) {
            this.buttons[buttonName] = !this.buttons[buttonName];
            this.updatePortAFromButtons();
            this.notifyState();
            return this.buttons[buttonName];
        }
        return false;
    }

    setButtonLogic(logic) {
        this.buttonLogic = logic;
        this.updatePortAFromButtons();
        this.notifyState();
    }

    updatePortAFromButtons() {
        let val = 0;
        const btnKeys = ['TL1', 'TL2', 'TL3', 'TL4', 'TL5'];
        for (let i = 0; i < 5; i++) {
            const btnName = btnKeys[i];
            const isPressed = this.buttons[btnName];
            let bit = 0;
            if (this.buttonLogic === 'pullup') {
                // Pull-up: unpressed = 1 (5V), pressed = 0 (GND)
                bit = isPressed ? 0 : 1;
            } else {
                // Pull-down: unpressed = 0, pressed = 1
                bit = isPressed ? 1 : 0;
            }
            if (bit) {
                val |= (1 << i);
            }
        }
        this.registers.PORTA = val & 0x1F;
    }

    getPinRead(portName, bitIndex) {
        if (portName === 'PORTA') {
            const isInput = (this.registers.TRISA & (1 << bitIndex)) !== 0;
            if (isInput) {
                // Return button state according to logic
                const btnKeys = ['TL1', 'TL2', 'TL3', 'TL4', 'TL5'];
                const isPressed = this.buttons[btnKeys[bitIndex]] || false;
                return this.buttonLogic === 'pullup' ? (isPressed ? 0 : 1) : (isPressed ? 1 : 0);
            } else {
                return (this.registers.PORTA >> bitIndex) & 1;
            }
        } else if (portName === 'PORTB') {
            return (this.registers.PORTB >> bitIndex) & 1;
        }
        return 0;
    }

    setPinWrite(portName, bitIndex, val) {
        const bit = val ? 1 : 0;
        if (portName === 'PORTA') {
            if (bit) {
                this.registers.PORTA |= (1 << bitIndex);
            } else {
                this.registers.PORTA &= ~(1 << bitIndex);
            }
            this.registers.PORTA &= 0x1F;
        } else if (portName === 'PORTB') {
            if (bit) {
                this.registers.PORTB |= (1 << bitIndex);
            } else {
                this.registers.PORTB &= ~(1 << bitIndex);
            }
            this.registers.PORTB &= 0xFF;
        }
        this.notifyState();
    }

    notifyState() {
        if (this.onStateChange) {
            this.onStateChange({
                registers: { ...this.registers },
                buttons: { ...this.buttons },
                buttonLogic: this.buttonLogic,
                cycleCount: this.cycleCount,
                currentLine: this.currentLine,
                isRunning: this.isRunning,
                isPaused: this.isPaused
            });
        }
    }

    log(msg) {
        if (this.onConsoleLog) {
            this.onConsoleLog(msg);
        }
    }

    stop() {
        this.isRunning = false;
        this.isPaused = false;
        this.isStepping = false;
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        if (this.stepResolver) {
            this.stepResolver();
            this.stepResolver = null;
        }
        if (this.onExecutionEnd) {
            this.onExecutionEnd();
        }
        this.notifyState();
    }

    pause() {
        if (this.isRunning && !this.isPaused) {
            this.isPaused = true;
            this.notifyState();
            this.log('⏸ Program pozastavený');
        }
    }

    resume() {
        if (this.isRunning && this.isPaused) {
            this.isPaused = false;
            this.isStepping = false;
            if (this.stepResolver) {
                const res = this.stepResolver;
                this.stepResolver = null;
                res();
            }
            this.notifyState();
            this.log('▶ Program pokračuje');
        }
    }

    step() {
        if (!this.isRunning) return;
        this.isPaused = true;
        this.isStepping = true;
        if (this.stepResolver) {
            const res = this.stepResolver;
            this.stepResolver = null;
            res();
        }
    }

    async runAST(ast, breakpoints = new Set()) {
        this.stop();
        this.isRunning = true;
        this.isPaused = false;
        this.isStepping = false;
        this.abortController = new AbortController();
        const signal = this.abortController.signal;

        this.globals.clear();
        this.functions.clear();
        this.updatePortAFromButtons();

        // Register functions and global variables
        for (const node of ast.body) {
            if (node.type === 'FunctionDecl') {
                this.functions.set(node.name, node);
            } else if (node.type === 'VarDeclStatement') {
                for (const decl of node.declarations) {
                    let initVal = 0;
                    if (decl.init) {
                        initVal = await this.evalExpression(decl.init, this.globals, signal);
                        if (Array.isArray(initVal) && decl.arraySize) {
                            const size = await this.evalExpression(decl.arraySize, this.globals, signal);
                            while (initVal.length < size) initVal.push(0);
                        }
                    } else if (decl.arraySize) {
                        const size = await this.evalExpression(decl.arraySize, this.globals, signal);
                        initVal = new Array(Math.max(0, size)).fill(0);
                    }
                    this.globals.set(decl.id, initVal);
                }
            }
        }

        const mainFunc = this.functions.get('main');
        if (!mainFunc) {
            throw new Error("Chýba funkcia 'void main(void)' v programe");
        }

        this.log('🚀 Spustenie programu PIC16F84A...');
        this.notifyState();

        try {
            const localScope = new Map();
            await this.executeStatement(mainFunc.body, localScope, signal, breakpoints);
            this.log('✅ Program ukončený (main vrátil návratovú hodnotu).');
        } catch (err) {
            if (signal.aborted) {
                this.log('⏹ Simulácia zastavená.');
            } else {
                this.log(`❌ Chyba za behu: ${err.message}`);
                console.error(err);
            }
        } finally {
            this.isRunning = false;
            this.isPaused = false;
            this.isStepping = false;
            if (this.onExecutionEnd) this.onExecutionEnd();
            this.notifyState();
        }
    }

    async yieldCheck(line, signal, breakpoints) {
        if (signal.aborted) throw new Error('Simulation aborted');

        if (line) {
            this.currentLine = line;
            if (this.onLineChange) {
                this.onLineChange(line);
            }
        }

        this.cycleCount++;

        // Check breakpoint
        if (line && breakpoints && breakpoints.has(line)) {
            this.isPaused = true;
            this.log(`🔴 Pozastavené na bode prerušenia (riadok ${line})`);
            this.notifyState();
        }

        // Handle pause or step
        while (this.isPaused && !signal.aborted) {
            await new Promise(resolve => {
                this.stepResolver = resolve;
            });
            if (this.isStepping) {
                // One step allowed
                break;
            }
        }

        if (this.stepDelayMs > 0) {
            await new Promise(r => setTimeout(r, this.stepDelayMs));
        } else if (this.cycleCount % 30 === 0) {
            // Micro yield to keep browser UI responsive
            await new Promise(r => setTimeout(r, 0));
        }
    }

    async executeStatement(stmt, scope, signal, breakpoints) {
        if (!stmt || signal.aborted) return { type: 'normal' };

        await this.yieldCheck(stmt.line, signal, breakpoints);

        switch (stmt.type) {
            case 'BlockStatement': {
                for (const subStmt of stmt.body) {
                    const res = await this.executeStatement(subStmt, scope, signal, breakpoints);
                    if (res.type === 'return' || res.type === 'break' || res.type === 'continue') {
                        return res;
                    }
                }
                return { type: 'normal' };
            }

            case 'VarDeclStatement': {
                for (const decl of stmt.declarations) {
                    let val = 0;
                    if (decl.init) {
                        val = await this.evalExpression(decl.init, scope, signal);
                        if (Array.isArray(val) && decl.arraySize) {
                            const size = await this.evalExpression(decl.arraySize, scope, signal);
                            while (val.length < size) val.push(0);
                        }
                    } else if (decl.arraySize) {
                        const size = await this.evalExpression(decl.arraySize, scope, signal);
                        val = new Array(Math.max(0, size)).fill(0);
                    }
                    scope.set(decl.id, val);
                }
                return { type: 'normal' };
            }

            case 'ExpressionStatement': {
                await this.evalExpression(stmt.expression, scope, signal);
                this.notifyState();
                return { type: 'normal' };
            }

            case 'IfStatement': {
                const cond = await this.evalExpression(stmt.test, scope, signal);
                if (cond) {
                    return await this.executeStatement(stmt.consequent, scope, signal, breakpoints);
                } else if (stmt.alternate) {
                    return await this.executeStatement(stmt.alternate, scope, signal, breakpoints);
                }
                return { type: 'normal' };
            }

            case 'WhileStatement': {
                while (!signal.aborted) {
                    await this.yieldCheck(stmt.line, signal, breakpoints);
                    const cond = await this.evalExpression(stmt.test, scope, signal);
                    if (!cond) break;

                    const res = await this.executeStatement(stmt.body, scope, signal, breakpoints);
                    if (res.type === 'break') break;
                    if (res.type === 'return') return res;
                }
                return { type: 'normal' };
            }

            case 'DoWhileStatement': {
                while (!signal.aborted) {
                    const res = await this.executeStatement(stmt.body, scope, signal, breakpoints);
                    if (res.type === 'break') break;
                    if (res.type === 'return') return res;

                    await this.yieldCheck(stmt.line, signal, breakpoints);
                    const cond = await this.evalExpression(stmt.test, scope, signal);
                    if (!cond) break;
                }
                return { type: 'normal' };
            }

            case 'ForStatement': {
                const forScope = new Map(scope);
                if (stmt.init) {
                    if (stmt.init.type === 'VarDeclStatement') {
                        await this.executeStatement(stmt.init, forScope, signal, breakpoints);
                    } else {
                        await this.evalExpression(stmt.init, forScope, signal);
                    }
                }

                while (!signal.aborted) {
                    await this.yieldCheck(stmt.line, signal, breakpoints);
                    if (stmt.test) {
                        const cond = await this.evalExpression(stmt.test, forScope, signal);
                        if (!cond) break;
                    }

                    const res = await this.executeStatement(stmt.body, forScope, signal, breakpoints);
                    if (res.type === 'break') break;
                    if (res.type === 'return') return res;

                    if (stmt.update) {
                        await this.evalExpression(stmt.update, forScope, signal);
                    }
                }
                return { type: 'normal' };
            }

            case 'SwitchStatement': {
                const val = await this.evalExpression(stmt.discriminant, scope, signal);
                let matched = false;
                for (const c of stmt.cases) {
                    if (!matched) {
                        if (c.test === null) {
                            // default case
                            matched = true;
                        } else {
                            const cVal = await this.evalExpression(c.test, scope, signal);
                            if (cVal === val) matched = true;
                        }
                    }

                    if (matched) {
                        for (const s of c.consequent) {
                            const res = await this.executeStatement(s, scope, signal, breakpoints);
                            if (res.type === 'break') return { type: 'normal' };
                            if (res.type === 'return') return res;
                        }
                    }
                }
                return { type: 'normal' };
            }

            case 'BreakStatement':
                return { type: 'break' };

            case 'ContinueStatement':
                return { type: 'continue' };

            case 'ReturnStatement': {
                let val = undefined;
                if (stmt.argument) {
                    val = await this.evalExpression(stmt.argument, scope, signal);
                }
                return { type: 'return', value: val };
            }

            case 'EmptyStatement':
                return { type: 'normal' };

            default:
                console.warn('Unknown statement:', stmt);
                return { type: 'normal' };
        }
    }

    async evalExpression(expr, scope, signal) {
        if (!expr || signal.aborted) return 0;

        switch (expr.type) {
            case 'Literal':
                return expr.value;

            case 'ArrayInitializer': {
                const arr = [];
                for (const el of expr.elements) {
                    arr.push(await this.evalExpression(el, scope, signal));
                }
                return arr;
            }

            case 'Identifier':
                return this.getVariableOrRegisterValue(expr.name, scope);

            case 'MemberExpression': {
                // e.g. PORTAbits.RA0 or arr[i]
                if (expr.computed) {
                    // Array access
                    const objName = expr.object.name;
                    const idx = await this.evalExpression(expr.property, scope, signal);
                    const arr = scope.get(objName) || this.globals.get(objName);
                    if (Array.isArray(arr)) return arr[idx] || 0;
                    return 0;
                } else {
                    const objName = expr.object.name;
                    const propName = expr.property.name;
                    return this.getBitfieldValue(objName, propName);
                }
            }

            case 'AssignmentExpression': {
                const val = await this.evalExpression(expr.right, scope, signal);
                return this.applyAssignment(expr.left, expr.operator, val, scope, signal);
            }

            case 'BinaryExpression':
            case 'LogicalExpression': {
                const left = await this.evalExpression(expr.left, scope, signal);

                // Short-circuit logical
                if (expr.operator === '&&') {
                    if (!left) return 0;
                    return (await this.evalExpression(expr.right, scope, signal)) ? 1 : 0;
                }
                if (expr.operator === '||') {
                    if (left) return 1;
                    return (await this.evalExpression(expr.right, scope, signal)) ? 1 : 0;
                }

                const right = await this.evalExpression(expr.right, scope, signal);

                switch (expr.operator) {
                    case '+': return left + right;
                    case '-': return left - right;
                    case '*': return left * right;
                    case '/': return right !== 0 ? Math.floor(left / right) : 0;
                    case '%': return right !== 0 ? left % right : 0;
                    case '&': return left & right;
                    case '|': return left | right;
                    case '^': return left ^ right;
                    case '<<': return (left << right) & 0xFF;
                    case '>>': return left >> right;
                    case '==': return left === right ? 1 : 0;
                    case '!=': return left !== right ? 1 : 0;
                    case '<': return left < right ? 1 : 0;
                    case '<=': return left <= right ? 1 : 0;
                    case '>': return left > right ? 1 : 0;
                    case '>=': return left >= right ? 1 : 0;
                    default: return 0;
                }
            }

            case 'UnaryExpression': {
                const arg = await this.evalExpression(expr.argument, scope, signal);
                switch (expr.operator) {
                    case '!': return arg ? 0 : 1;
                    case '~': return (~arg) & 0xFF;
                    case '+': return +arg;
                    case '-': return -arg;
                    default: return arg;
                }
            }

            case 'UpdateExpression': {
                const curVal = await this.evalExpression(expr.argument, scope, signal);
                const newVal = expr.operator === '++' ? curVal + 1 : curVal - 1;
                await this.applyAssignment(expr.argument, '=', newVal, scope, signal);
                return expr.prefix ? newVal : curVal;
            }

            case 'ConditionalExpression': {
                const test = await this.evalExpression(expr.test, scope, signal);
                return test
                    ? await this.evalExpression(expr.consequent, scope, signal)
                    : await this.evalExpression(expr.alternate, scope, signal);
            }

            case 'CallExpression': {
                return await this.callFunction(expr.callee, expr.arguments, scope, signal);
            }

            default:
                console.warn('Unknown expression:', expr);
                return 0;
        }
    }

    async callFunction(callee, args, scope, signal) {
        const funcName = callee.name || (callee.property && callee.property.name);

        // Built-in delays
        if (funcName === '__delay_ms' || funcName === 'delay_ms') {
            const ms = args.length > 0 ? await this.evalExpression(args[0], scope, signal) : 0;
            const delayTime = Math.max(1, Math.round(ms * this.speedMultiplier));
            await new Promise(r => setTimeout(r, delayTime));
            return 0;
        }

        if (funcName === '__delay_us' || funcName === 'delay_us') {
            const us = args.length > 0 ? await this.evalExpression(args[0], scope, signal) : 0;
            const delayTime = Math.max(1, Math.round((us / 1000) * this.speedMultiplier));
            await new Promise(r => setTimeout(r, delayTime));
            return 0;
        }

        // User declared function
        const fn = this.functions.get(funcName);
        if (!fn) {
            throw new Error(`Volanie neznámej funkcie '${funcName}'`);
        }

        const fnScope = new Map();
        for (let i = 0; i < fn.params.length; i++) {
            const param = fn.params[i];
            const argVal = i < args.length ? await this.evalExpression(args[i], scope, signal) : 0;
            fnScope.set(param.name, argVal);
        }

        const res = await this.executeStatement(fn.body, fnScope, signal, null);
        return res.type === 'return' ? res.value : 0;
    }

    getVariableOrRegisterValue(name, scope) {
        // 1. Local scope
        if (scope.has(name)) return scope.get(name);

        // 2. Button aliases (TL1 - TL5)
        if (name === 'TL1') return this.getPinRead('PORTA', 0);
        if (name === 'TL2') return this.getPinRead('PORTA', 1);
        if (name === 'TL3') return this.getPinRead('PORTA', 2);
        if (name === 'TL4') return this.getPinRead('PORTA', 3);
        if (name === 'TL5') return this.getPinRead('PORTA', 4);

        // LED aliases (LED1 - LED8)
        if (name === 'LED1') return this.getPinRead('PORTB', 0);
        if (name === 'LED2') return this.getPinRead('PORTB', 1);
        if (name === 'LED3') return this.getPinRead('PORTB', 2);
        if (name === 'LED4') return this.getPinRead('PORTB', 3);
        if (name === 'LED5') return this.getPinRead('PORTB', 4);
        if (name === 'LED6') return this.getPinRead('PORTB', 5);
        if (name === 'LED7') return this.getPinRead('PORTB', 6);
        if (name === 'LED8') return this.getPinRead('PORTB', 7);

        // Pin aliases RA0-RA4, RB0-RB7
        const raMatch = name.match(/^RA([0-4])$/);
        if (raMatch) return this.getPinRead('PORTA', parseInt(raMatch[1], 10));

        const rbMatch = name.match(/^RB([0-7])$/);
        if (rbMatch) return this.getPinRead('PORTB', parseInt(rbMatch[1], 10));

        // 3. Registers
        if (name === 'PORTA') {
            this.updatePortAFromButtons();
            return this.registers.PORTA;
        }
        if (name === 'PORTB') return this.registers.PORTB;
        if (name === 'TRISA') return this.registers.TRISA;
        if (name === 'TRISB') return this.registers.TRISB;
        if (name === 'STATUS') return this.registers.STATUS;
        if (name === 'OPTION_REG') return this.registers.OPTION_REG;
        if (name === 'TMR0') return this.registers.TMR0;
        if (name === 'INTCON') return this.registers.INTCON;

        // 4. Globals
        if (this.globals.has(name)) return this.globals.get(name);

        return 0;
    }

    getBitfieldValue(objectName, bitName) {
        if (objectName === 'PORTAbits') {
            const m = bitName.match(/^RA([0-4])$/);
            if (m) {
                const bitIdx = parseInt(m[1], 10);
                return this.getPinRead('PORTA', bitIdx);
            }
        } else if (objectName === 'PORTBbits') {
            const m = bitName.match(/^RB([0-7])$/);
            if (m) {
                const bitIdx = parseInt(m[1], 10);
                return this.getPinRead('PORTB', bitIdx);
            }
        } else if (objectName === 'TRISAbits') {
            const m = bitName.match(/^TRISA([0-4])$/);
            if (m) {
                const bitIdx = parseInt(m[1], 10);
                return (this.registers.TRISA >> bitIdx) & 1;
            }
        } else if (objectName === 'TRISBbits') {
            const m = bitName.match(/^TRISB([0-7])$/);
            if (m) {
                const bitIdx = parseInt(m[1], 10);
                return (this.registers.TRISB >> bitIdx) & 1;
            }
        }
        return 0;
    }

    async applyAssignment(leftExpr, op, rightVal, scope, signal) {
        // Calculate new value based on operator
        const computeVal = (oldVal) => {
            switch (op) {
                case '=': return rightVal;
                case '+=': return oldVal + rightVal;
                case '-=': return oldVal - rightVal;
                case '*=': return oldVal * rightVal;
                case '/=': return rightVal !== 0 ? Math.floor(oldVal / rightVal) : 0;
                case '%=': return rightVal !== 0 ? oldVal % rightVal : 0;
                case '&=': return oldVal & rightVal;
                case '|=': return oldVal | rightVal;
                case '^=': return oldVal ^ rightVal;
                case '<<=': return (oldVal << rightVal) & 0xFF;
                case '>>=': return oldVal >> rightVal;
                default: return rightVal;
            }
        };

        if (leftExpr.type === 'Identifier') {
            const name = leftExpr.name;

            // PIC Registers
            if (name === 'TRISA') {
                const newVal = computeVal(this.registers.TRISA) & 0x1F;
                this.registers.TRISA = newVal;
                this.notifyState();
                return newVal;
            }
            if (name === 'TRISB') {
                const newVal = computeVal(this.registers.TRISB) & 0xFF;
                this.registers.TRISB = newVal;
                this.notifyState();
                return newVal;
            }
            if (name === 'PORTA') {
                const newVal = computeVal(this.registers.PORTA) & 0x1F;
                this.registers.PORTA = newVal;
                this.notifyState();
                return newVal;
            }
            if (name === 'PORTB') {
                const newVal = computeVal(this.registers.PORTB) & 0xFF;
                this.registers.PORTB = newVal;
                this.notifyState();
                return newVal;
            }

            // Direct pin aliases (LED1-8, RB0-7)
            if (name.startsWith('LED')) {
                const idx = parseInt(name.replace('LED', ''), 10) - 1;
                if (idx >= 0 && idx <= 7) {
                    const newVal = computeVal(this.getPinRead('PORTB', idx));
                    this.setPinWrite('PORTB', idx, newVal);
                    return newVal;
                }
            }
            const rbMatch = name.match(/^RB([0-7])$/);
            if (rbMatch) {
                const idx = parseInt(rbMatch[1], 10);
                const newVal = computeVal(this.getPinRead('PORTB', idx));
                this.setPinWrite('PORTB', idx, newVal);
                return newVal;
            }

            // Local variable
            if (scope.has(name)) {
                const newVal = computeVal(scope.get(name));
                scope.set(name, newVal);
                return newVal;
            }

            // Global variable
            if (this.globals.has(name)) {
                const newVal = computeVal(this.globals.get(name));
                this.globals.set(name, newVal);
                return newVal;
            }

            // Implicit declaration
            const newVal = computeVal(0);
            scope.set(name, newVal);
            return newVal;
        }

        if (leftExpr.type === 'MemberExpression') {
            if (leftExpr.computed) {
                // Array assignment
                const objName = leftExpr.object.name;
                const idx = await this.evalExpression(leftExpr.property, scope, signal);
                const target = scope.has(objName) ? scope.get(objName) : this.globals.get(objName);
                if (Array.isArray(target)) {
                    const newVal = computeVal(target[idx] || 0);
                    target[idx] = newVal;
                    return newVal;
                }
            } else {
                const objName = leftExpr.object.name;
                const propName = leftExpr.property.name;

                if (objName === 'PORTBbits') {
                    const m = propName.match(/^RB([0-7])$/);
                    if (m) {
                        const bitIdx = parseInt(m[1], 10);
                        const newVal = computeVal(this.getPinRead('PORTB', bitIdx));
                        this.setPinWrite('PORTB', bitIdx, newVal);
                        return newVal;
                    }
                } else if (objName === 'PORTAbits') {
                    const m = propName.match(/^RA([0-4])$/);
                    if (m) {
                        const bitIdx = parseInt(m[1], 10);
                        const newVal = computeVal(this.getPinRead('PORTA', bitIdx));
                        this.setPinWrite('PORTA', bitIdx, newVal);
                        return newVal;
                    }
                } else if (objName === 'TRISAbits') {
                    const m = propName.match(/^TRISA([0-4])$/);
                    if (m) {
                        const bitIdx = parseInt(m[1], 10);
                        const oldBit = (this.registers.TRISA >> bitIdx) & 1;
                        const newBit = computeVal(oldBit) ? 1 : 0;
                        if (newBit) this.registers.TRISA |= (1 << bitIdx);
                        else this.registers.TRISA &= ~(1 << bitIdx);
                        this.notifyState();
                        return newBit;
                    }
                } else if (objName === 'TRISBbits') {
                    const m = propName.match(/^TRISB([0-7])$/);
                    if (m) {
                        const bitIdx = parseInt(m[1], 10);
                        const oldBit = (this.registers.TRISB >> bitIdx) & 1;
                        const newBit = computeVal(oldBit) ? 1 : 0;
                        if (newBit) this.registers.TRISB |= (1 << bitIdx);
                        else this.registers.TRISB &= ~(1 << bitIdx);
                        this.notifyState();
                        return newBit;
                    }
                }
            }
        }

        return rightVal;
    }
}

// Export for Node and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PIC16F84A };
}
