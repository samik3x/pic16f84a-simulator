/**
 * C Language Lexer, Parser & AST Generator for PIC16F84A Simulator
 * Supports XC8 / Microchip PIC C syntax, macro expansion, and detailed syntax errors.
 */

class CCompiler {
    constructor() {
        this.errors = [];
        this.macros = new Map();
    }

    /**
     * Compile C source code. Returns { success: boolean, ast: object, errors: array }
     */
    compile(sourceCode) {
        this.errors = [];
        this.macros = new Map();

        try {
            // 1. Preprocessing (handle #define, #pragma, #include)
            const preprocessed = this.preprocess(sourceCode);

            // 2. Tokenize
            const tokens = this.tokenize(preprocessed.code, preprocessed.lineMap);

            if (this.errors.length > 0) {
                return { success: false, ast: null, errors: this.errors };
            }

            // 3. Parse AST
            const parser = new CParser(tokens, sourceCode);
            const ast = parser.parse();

            if (parser.errors.length > 0) {
                return { success: false, ast: null, errors: parser.errors };
            }

            return { success: true, ast: ast, errors: [] };
        } catch (err) {
            if (this.errors.length === 0) {
                this.errors.push({
                    line: err.line || 1,
                    column: err.column || 1,
                    message: err.message || 'Neznáma syntaktická chyba'
                });
            }
            return { success: false, ast: null, errors: this.errors };
        }
    }

    /**
     * Preprocessor: extracts #define macros and strips #pragma / #include
     */
    preprocess(source) {
        const lines = source.split(/\r?\n/);
        const resultLines = [];
        const lineMap = []; // Maps processed line index to original line number (1-based)

        for (let i = 0; i < lines.length; i++) {
            const originalLineNum = i + 1;
            const line = lines[i];
            const trimmed = line.trim();

            if (trimmed.startsWith('#pragma')) {
                // Ignore #pragma config ... but keep empty line to preserve line count
                resultLines.push('/* ' + line + ' */');
                lineMap.push(originalLineNum);
            } else if (trimmed.startsWith('#include')) {
                // Ignore #include <xc.h>
                resultLines.push('/* ' + line + ' */');
                lineMap.push(originalLineNum);
            } else if (trimmed.startsWith('#define')) {
                // Parse #define KEY VALUE
                const match = trimmed.match(/^#define\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+(.*))?$/);
                if (match) {
                    const name = match[1];
                    const value = (match[2] || '').trim();
                    this.macros.set(name, value);
                    resultLines.push('/* ' + line + ' */');
                } else {
                    this.errors.push({
                        line: originalLineNum,
                        column: 1,
                        message: "Neplatná direktíva #define"
                    });
                    resultLines.push('');
                }
                lineMap.push(originalLineNum);
            } else {
                resultLines.push(line);
                lineMap.push(originalLineNum);
            }
        }

        return { code: resultLines.join('\n'), lineMap };
    }

    /**
     * Tokenize C source code with line and column tracking
     */
    tokenize(code, lineMap) {
        const tokens = [];
        let index = 0;
        let line = 1;
        let column = 1;

        const isAlpha = c => /[a-zA-Z_]/.test(c);
        const isAlphaNum = c => /[a-zA-Z0-9_]/.test(c);
        const isDigit = c => /[0-9]/.test(c);

        while (index < code.length) {
            let char = code[index];

            // Newlines
            if (char === '\n') {
                line++;
                column = 1;
                index++;
                continue;
            }

            // Spaces, tabs, carriage returns
            if (/\s/.test(char)) {
                column++;
                index++;
                continue;
            }

            // Single line comment: //
            if (char === '/' && code[index + 1] === '/') {
                while (index < code.length && code[index] !== '\n') {
                    index++;
                }
                continue;
            }

            // Multi line comment: /* ... */
            if (char === '/' && code[index + 1] === '*') {
                const startLine = line;
                const startCol = column;
                index += 2;
                column += 2;
                let closed = false;
                while (index < code.length) {
                    if (code[index] === '*' && code[index + 1] === '/') {
                        index += 2;
                        column += 2;
                        closed = true;
                        break;
                    }
                    if (code[index] === '\n') {
                        line++;
                        column = 1;
                        index++;
                    } else {
                        column++;
                        index++;
                    }
                }
                if (!closed) {
                    this.errors.push({
                        line: startLine,
                        column: startCol,
                        message: 'Neukončený viacriadkový komentár /* ... */'
                    });
                    break;
                }
                continue;
            }

            const tokenStartCol = column;
            const tokenStartLine = line;

            // Numbers: hex (0x...), binary (0b...), decimal
            if (isDigit(char) || (char === '0' && (code[index + 1] === 'x' || code[index + 1] === 'X' || code[index + 1] === 'b' || code[index + 1] === 'B'))) {
                let numStr = '';

                if (char === '0' && (code[index + 1] === 'x' || code[index + 1] === 'X')) {
                    numStr += code.substr(index, 2);
                    index += 2;
                    column += 2;
                    while (index < code.length && /[0-9a-fA-F]/.test(code[index])) {
                        numStr += code[index];
                        index++;
                        column++;
                    }
                    tokens.push({
                        type: 'NUMBER',
                        value: parseInt(numStr, 16),
                        raw: numStr,
                        line: tokenStartLine,
                        column: tokenStartCol
                    });
                    continue;
                } else if (char === '0' && (code[index + 1] === 'b' || code[index + 1] === 'B')) {
                    numStr += code.substr(index, 2);
                    index += 2;
                    column += 2;
                    while (index < code.length && /[01]/.test(code[index])) {
                        numStr += code[index];
                        index++;
                        column++;
                    }
                    tokens.push({
                        type: 'NUMBER',
                        value: parseInt(numStr.substr(2), 2),
                        raw: numStr,
                        line: tokenStartLine,
                        column: tokenStartCol
                    });
                    continue;
                } else {
                    while (index < code.length && /[0-9]/.test(code[index])) {
                        numStr += code[index];
                        index++;
                        column++;
                    }
                    tokens.push({
                        type: 'NUMBER',
                        value: parseInt(numStr, 10),
                        raw: numStr,
                        line: tokenStartLine,
                        column: tokenStartCol
                    });
                    continue;
                }
            }

            // String literals: "..."
            if (char === '"') {
                let str = '';
                index++;
                column++;
                while (index < code.length && code[index] !== '"' && code[index] !== '\n') {
                    if (code[index] === '\\' && index + 1 < code.length) {
                        index++;
                        column++;
                        const escapeChar = code[index];
                        if (escapeChar === 'n') str += '\n';
                        else if (escapeChar === 't') str += '\t';
                        else str += escapeChar;
                    } else {
                        str += code[index];
                    }
                    index++;
                    column++;
                }
                if (code[index] !== '"') {
                    this.errors.push({
                        line: tokenStartLine,
                        column: tokenStartCol,
                        message: 'Neukončený reťazec (chýba uzatváracia úvodzovka ")'
                    });
                } else {
                    index++;
                    column++;
                }
                tokens.push({
                    type: 'STRING',
                    value: str,
                    line: tokenStartLine,
                    column: tokenStartCol
                });
                continue;
            }

            // Character literal: '...'
            if (char === '\'') {
                index++;
                column++;
                let chVal = 0;
                if (index < code.length && code[index] !== '\'') {
                    if (code[index] === '\\') {
                        index++;
                        column++;
                    }
                    chVal = code.charCodeAt(index);
                    index++;
                    column++;
                }
                if (code[index] === '\'') {
                    index++;
                    column++;
                }
                tokens.push({
                    type: 'NUMBER',
                    value: chVal,
                    line: tokenStartLine,
                    column: tokenStartCol
                });
                continue;
            }

            // Identifiers or Keywords
            if (isAlpha(char)) {
                let ident = '';
                while (index < code.length && isAlphaNum(code[index])) {
                    ident += code[index];
                    index++;
                    column++;
                }

                // Check if this identifier is a preprocessor macro
                if (this.macros.has(ident)) {
                    const macroVal = this.macros.get(ident);
                    if (macroVal.length > 0) {
                        // Expand simple macro tokens
                        const subTokens = this.tokenizeMacroValue(macroVal, tokenStartLine, tokenStartCol);
                        for (let st of subTokens) {
                            tokens.push(st);
                        }
                        continue;
                    }
                }

                const keywords = [
                    'void', 'int', 'char', 'unsigned', 'signed', 'short', 'long',
                    'float', 'double', 'if', 'else', 'while', 'for', 'do',
                    'switch', 'case', 'default', 'break', 'continue', 'return',
                    'struct', 'typedef', 'const', 'static', 'volatile', 'sizeof',
                    'bool', 'true', 'false', 'uint8_t', 'int8_t', 'uint16_t', 'int16_t'
                ];

                if (keywords.includes(ident)) {
                    tokens.push({
                        type: 'KEYWORD',
                        value: ident,
                        line: tokenStartLine,
                        column: tokenStartCol
                    });
                } else {
                    tokens.push({
                        type: 'IDENTIFIER',
                        value: ident,
                        line: tokenStartLine,
                        column: tokenStartCol
                    });
                }
                continue;
            }

            // Multi-char operators
            const twoChar = code.substr(index, 2);
            const threeChar = code.substr(index, 3);

            if (['<<=', '>>='].includes(threeChar)) {
                tokens.push({ type: 'OPERATOR', value: threeChar, line: tokenStartLine, column: tokenStartCol });
                index += 3;
                column += 3;
                continue;
            }

            if (['==', '!=', '<=', '>=', '&&', '||', '<<', '>>', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '->'].includes(twoChar)) {
                tokens.push({ type: 'OPERATOR', value: twoChar, line: tokenStartLine, column: tokenStartCol });
                index += 2;
                column += 2;
                continue;
            }

            // Single-char operators and punctuation
            const singles = ['+', '-', '*', '/', '%', '&', '|', '^', '~', '!', '=', '<', '>', '?', ':', ';', ',', '.', '(', ')', '{', '}', '[', ']'];
            if (singles.includes(char)) {
                tokens.push({
                    type: ['(', ')', '{', '}', '[', ']', ';', ',', '.', ':'].includes(char) ? 'PUNCT' : 'OPERATOR',
                    value: char,
                    line: tokenStartLine,
                    column: tokenStartCol
                });
                index++;
                column++;
                continue;
            }

            // Unknown character
            this.errors.push({
                line: tokenStartLine,
                column: tokenStartCol,
                message: `Neočakávaný znak '${char}'`
            });
            index++;
            column++;
        }

        tokens.push({
            type: 'EOF',
            value: '',
            line: line,
            column: column
        });

        return tokens;
    }

    tokenizeMacroValue(valStr, line, col) {
        // Quick tokenizer for macro replacements like "PORTAbits.RA0" or "4000000"
        const tokens = [];
        let i = 0;
        while (i < valStr.length) {
            if (/\s/.test(valStr[i])) { i++; continue; }
            if (/[a-zA-Z_]/.test(valStr[i])) {
                let s = '';
                while (i < valStr.length && /[a-zA-Z0-9_]/.test(valStr[i])) {
                    s += valStr[i++];
                }
                tokens.push({ type: 'IDENTIFIER', value: s, line, column: col });
            } else if (/[0-9]/.test(valStr[i])) {
                let s = '';
                if (valStr[i] === '0' && (valStr[i+1] === 'x' || valStr[i+1] === 'X')) {
                    s += valStr.substr(i, 2); i += 2;
                    while (i < valStr.length && /[0-9a-fA-F]/.test(valStr[i])) s += valStr[i++];
                    tokens.push({ type: 'NUMBER', value: parseInt(s, 16), raw: s, line, column: col });
                } else {
                    while (i < valStr.length && /[0-9]/.test(valStr[i])) s += valStr[i++];
                    tokens.push({ type: 'NUMBER', value: parseInt(s, 10), raw: s, line, column: col });
                }
            } else if (valStr[i] === '.') {
                tokens.push({ type: 'PUNCT', value: '.', line, column: col });
                i++;
            } else {
                tokens.push({ type: 'OPERATOR', value: valStr[i], line, column: col });
                i++;
            }
        }
        return tokens;
    }
}

/**
 * Recursive Descent Parser for C
 */
class CParser {
    constructor(tokens, sourceCode) {
        this.tokens = tokens;
        this.sourceCode = sourceCode;
        this.pos = 0;
        this.errors = [];
    }

    peek() {
        return this.tokens[this.pos] || { type: 'EOF', value: '', line: 0, column: 0 };
    }

    previous() {
        return this.tokens[this.pos - 1] || null;
    }

    isAtEnd() {
        return this.peek().type === 'EOF';
    }

    advance() {
        if (!this.isAtEnd()) this.pos++;
        return this.previous();
    }

    check(type, value) {
        if (this.isAtEnd()) return false;
        const tok = this.peek();
        if (tok.type !== type) return false;
        if (value !== undefined && value !== null && tok.value !== value) return false;
        return true;
    }

    match(type, value) {
        if (this.check(type, value)) {
            this.advance();
            return true;
        }
        return false;
    }

    consume(type, value, errorMessage) {
        if (this.check(type, value)) {
            return this.advance();
        }
        const current = this.peek();
        this.error(current.line, current.column, errorMessage || `Očakáva sa '${value || type}', ale nájdené bolo '${current.value}'`);
        throw new Error(errorMessage);
    }

    error(line, col, message) {
        this.errors.push({ line, column: col, message });
    }

    parse() {
        const body = [];
        while (!this.isAtEnd()) {
            try {
                const decl = this.parseTopLevelDeclaration();
                if (decl) body.push(decl);
            } catch (e) {
                this.synchronize();
            }
        }
        return { type: 'Program', body };
    }

    parseTopLevelDeclaration() {
        const startTok = this.peek();

        // Check types
        const types = ['void', 'int', 'char', 'unsigned', 'signed', 'short', 'long', 'bool', 'uint8_t', 'int8_t'];
        if (this.check('KEYWORD') && types.includes(startTok.value)) {
            let fullType = this.advance().value;
            while (this.check('KEYWORD') && types.includes(this.peek().value)) {
                fullType += ' ' + this.advance().value;
            }

            if (!this.check('IDENTIFIER')) {
                this.error(startTok.line, startTok.column, `Očakáva sa názov funkcie alebo premennej po type '${fullType}'`);
                this.advance();
                return null;
            }
            const nameTok = this.advance();

            if (this.match('PUNCT', '(')) {
                return this.finishFunctionDeclaration(fullType, nameTok);
            } else {
                return this.finishVarDeclaration(fullType, nameTok);
            }
        }

        this.error(startTok.line, startTok.column, `Neočakávaný token '${startTok.value}'. Očakáva sa deklarácia funkcie alebo premennej.`);
        this.advance();
        return null;
    }

    finishFunctionDeclaration(returnType, nameTok) {
        const params = [];
        if (!this.check('PUNCT', ')')) {
            do {
                if (this.check('KEYWORD', 'void') && this.tokens[this.pos + 1] && this.tokens[this.pos + 1].value === ')') {
                    this.advance();
                    break;
                }
                let paramType = this.consume('KEYWORD', null, "Očakáva sa typ parametra").value;
                let paramName = '';
                if (this.check('IDENTIFIER')) {
                    paramName = this.advance().value;
                }
                params.push({ type: paramType, name: paramName });
            } while (this.match('PUNCT', ','));
        }
        this.consume('PUNCT', ')', "Chýba uzatváracia zátvorka ')' za parametrami funkcie");

        if (this.match('PUNCT', ';')) {
            return {
                type: 'FunctionPrototype',
                returnType,
                name: nameTok.value,
                params,
                line: nameTok.line
            };
        }

        const body = this.parseBlockStatement();
        return {
            type: 'FunctionDecl',
            returnType,
            name: nameTok.value,
            params,
            body,
            line: nameTok.line
        };
    }

    finishVarDeclaration(type, nameTok) {
        const declarations = [];
        let curName = nameTok;

        while (true) {
            let init = null;
            let arraySize = null;

            if (this.match('PUNCT', '[')) {
                if (!this.check('PUNCT', ']')) {
                    arraySize = this.parseExpression();
                }
                this.consume('PUNCT', ']', "Chýba ']' pri deklarácii poľa");
            }

            if (this.match('OPERATOR', '=')) {
                init = this.parseExpression();
            }

            declarations.push({
                id: curName.value,
                arraySize,
                init,
                line: curName.line
            });

            if (this.match('PUNCT', ',')) {
                curName = this.consume('IDENTIFIER', null, "Očakáva sa názov premennej po ','");
            } else {
                break;
            }
        }

        this.consume('PUNCT', ';', "Chýba bodkočiarka ';' na konci deklarácie premennej");
        return {
            type: 'VarDeclStatement',
            varType: type,
            declarations,
            line: nameTok.line
        };
    }

    parseBlockStatement() {
        const openBrace = this.consume('PUNCT', '{', "Očakáva sa začiatok bloku '{'");
        const body = [];
        while (!this.check('PUNCT', '}') && !this.isAtEnd()) {
            try {
                const stmt = this.parseStatement();
                if (stmt) body.push(stmt);
            } catch (err) {
                this.synchronize();
            }
        }
        this.consume('PUNCT', '}', "Chýba uzatváracia zložená zátvorka '}'");
        return {
            type: 'BlockStatement',
            body,
            line: openBrace.line
        };
    }

    synchronize() {
        while (!this.isAtEnd()) {
            if (this.previous() && this.previous().value === ';') return;
            if (this.peek().value === '}') return;
            if (['if', 'while', 'for', 'return', 'void', 'int', 'char', 'do', 'switch'].includes(this.peek().value)) return;
            this.advance();
        }
    }

    parseStatement() {
        const tok = this.peek();

        // Empty statement ;
        if (this.match('PUNCT', ';')) {
            return { type: 'EmptyStatement', line: tok.line };
        }

        // Nested block { ... }
        if (this.check('PUNCT', '{')) {
            return this.parseBlockStatement();
        }

        // Keywords
        if (tok.type === 'KEYWORD') {
            const types = ['void', 'int', 'char', 'unsigned', 'signed', 'short', 'long', 'bool', 'uint8_t', 'int8_t', 'uint16_t', 'int16_t'];
            if (types.includes(tok.value)) {
                let fullType = this.advance().value;
                while (this.check('KEYWORD') && types.includes(this.peek().value)) {
                    fullType += ' ' + this.advance().value;
                }
                const nameTok = this.consume('IDENTIFIER', null, "Očakáva sa názov premennej po type");
                return this.finishVarDeclaration(fullType, nameTok);
            }

            if (tok.value === 'if') return this.parseIfStatement();
            if (tok.value === 'while') return this.parseWhileStatement();
            if (tok.value === 'do') return this.parseDoWhileStatement();
            if (tok.value === 'for') return this.parseForStatement();
            if (tok.value === 'switch') return this.parseSwitchStatement();
            if (tok.value === 'break') {
                this.advance();
                this.consume('PUNCT', ';', "Chýba bodkočiarka ';' za 'break'");
                return { type: 'BreakStatement', line: tok.line };
            }
            if (tok.value === 'continue') {
                this.advance();
                this.consume('PUNCT', ';', "Chýba bodkočiarka ';' za 'continue'");
                return { type: 'ContinueStatement', line: tok.line };
            }
            if (tok.value === 'return') {
                this.advance();
                let argument = null;
                if (!this.check('PUNCT', ';')) {
                    argument = this.parseExpression();
                }
                this.consume('PUNCT', ';', "Chýba bodkočiarka ';' za 'return'");
                return { type: 'ReturnStatement', argument, line: tok.line };
            }
        }

        // Expression statement
        const expr = this.parseExpression();
        if (!this.check('PUNCT', ';')) {
            const errLine = expr.line || tok.line;
            this.error(errLine, tok.column, `Chýba bodkočiarka ';' na konci príkazu`);
            throw new Error(`Chýba bodkočiarka ';' na konci príkazu`);
        }
        this.advance();
        return {
            type: 'ExpressionStatement',
            expression: expr,
            line: tok.line
        };
    }

    parseIfStatement() {
        const ifTok = this.advance(); // consume 'if'
        this.consume('PUNCT', '(', "Chýba '(' po 'if'");
        const test = this.parseExpression();
        this.consume('PUNCT', ')', "Chýba ')' za podmienkou 'if'");
        const consequent = this.parseStatement();
        let alternate = null;
        if (this.match('KEYWORD', 'else')) {
            alternate = this.parseStatement();
        }
        return {
            type: 'IfStatement',
            test,
            consequent,
            alternate,
            line: ifTok.line
        };
    }

    parseWhileStatement() {
        const whileTok = this.advance(); // consume 'while'
        this.consume('PUNCT', '(', "Chýba '(' po 'while'");
        const test = this.parseExpression();
        this.consume('PUNCT', ')', "Chýba ')' za podmienkou 'while'");
        const body = this.parseStatement();
        return {
            type: 'WhileStatement',
            test,
            body,
            line: whileTok.line
        };
    }

    parseDoWhileStatement() {
        const doTok = this.advance(); // consume 'do'
        const body = this.parseStatement();
        this.consume('KEYWORD', 'while', "Očakáva sa 'while' na konci 'do-while' cyklu");
        this.consume('PUNCT', '(', "Chýba '(' po 'while'");
        const test = this.parseExpression();
        this.consume('PUNCT', ')', "Chýba ')' za podmienkou 'while'");
        this.consume('PUNCT', ';', "Chýba bodkočiarka ';' na konci 'do-while'");
        return {
            type: 'DoWhileStatement',
            body,
            test,
            line: doTok.line
        };
    }

    parseForStatement() {
        const forTok = this.advance(); // consume 'for'
        this.consume('PUNCT', '(', "Chýba '(' po 'for'");

        // Init: var decl or expr or empty
        let init = null;
        if (this.match('PUNCT', ';')) {
            init = null;
        } else {
            const types = ['int', 'char', 'unsigned', 'signed', 'short', 'long', 'uint8_t'];
            if (this.check('KEYWORD') && types.includes(this.peek().value)) {
                let fullType = this.advance().value;
                const nameTok = this.consume('IDENTIFIER', null, "Očakáva sa názov premennej");
                init = this.finishVarDeclaration(fullType, nameTok);
            } else {
                init = this.parseExpression();
                this.consume('PUNCT', ';', "Chýba bodkočiarka ';' po inicializácii for cyklu");
            }
        }

        // Test
        let test = null;
        if (!this.check('PUNCT', ';')) {
            test = this.parseExpression();
        }
        this.consume('PUNCT', ';', "Chýba bodkočiarka ';' po podmienke for cyklu");

        // Update
        let update = null;
        if (!this.check('PUNCT', ')')) {
            update = this.parseExpression();
        }
        this.consume('PUNCT', ')', "Chýba ')' na konci hlavičky for cyklu");

        const body = this.parseStatement();
        return {
            type: 'ForStatement',
            init,
            test,
            update,
            body,
            line: forTok.line
        };
    }

    parseSwitchStatement() {
        const switchTok = this.advance(); // consume 'switch'
        this.consume('PUNCT', '(', "Chýba '(' po 'switch'");
        const discriminant = this.parseExpression();
        this.consume('PUNCT', ')', "Chýba ')' po výraze switch");
        this.consume('PUNCT', '{', "Chýba '{' na začiatku tela switch");

        const cases = [];
        while (!this.check('PUNCT', '}') && !this.isAtEnd()) {
            if (this.match('KEYWORD', 'case')) {
                const caseVal = this.parseExpression();
                this.consume('PUNCT', ':', "Chýba dvojbodka ':' za 'case hodnota'");
                const caseBody = [];
                while (!this.check('KEYWORD', 'case') && !this.check('KEYWORD', 'default') && !this.check('PUNCT', '}') && !this.isAtEnd()) {
                    caseBody.push(this.parseStatement());
                }
                cases.push({ type: 'SwitchCase', test: caseVal, consequent: caseBody });
            } else if (this.match('KEYWORD', 'default')) {
                this.consume('PUNCT', ':', "Chýba dvojbodka ':' za 'default'");
                const defBody = [];
                while (!this.check('KEYWORD', 'case') && !this.check('KEYWORD', 'default') && !this.check('PUNCT', '}') && !this.isAtEnd()) {
                    defBody.push(this.parseStatement());
                }
                cases.push({ type: 'SwitchCase', test: null, consequent: defBody });
            } else {
                this.error(this.peek().line, this.peek().column, "Očakáva sa 'case' alebo 'default' vo vnútri switch bloku");
                this.advance();
            }
        }
        this.consume('PUNCT', '}', "Chýba '}' na konci switch");
        return {
            type: 'SwitchStatement',
            discriminant,
            cases,
            line: switchTok.line
        };
    }

    // Expressions parser with full precedence
    parseExpression() {
        return this.parseAssignment();
    }

    parseAssignment() {
        const expr = this.parseTernary();

        const assignOps = ['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>='];
        if (this.check('OPERATOR') && assignOps.includes(this.peek().value)) {
            const opTok = this.advance();
            const right = this.parseAssignment();
            return {
                type: 'AssignmentExpression',
                operator: opTok.value,
                left: expr,
                right,
                line: opTok.line
            };
        }

        return expr;
    }

    parseTernary() {
        let expr = this.parseLogicalOr();
        if (this.match('OPERATOR', '?')) {
            const consequent = this.parseExpression();
            this.consume('PUNCT', ':', "Chýba ':' v ternárnom operátore");
            const alternate = this.parseAssignment();
            return {
                type: 'ConditionalExpression',
                test: expr,
                consequent,
                alternate,
                line: expr.line
            };
        }
        return expr;
    }

    parseLogicalOr() {
        let expr = this.parseLogicalAnd();
        while (this.match('OPERATOR', '||')) {
            const op = this.previous();
            const right = this.parseLogicalAnd();
            expr = { type: 'LogicalExpression', operator: op.value, left: expr, right, line: op.line };
        }
        return expr;
    }

    parseLogicalAnd() {
        let expr = this.parseBitwiseOr();
        while (this.match('OPERATOR', '&&')) {
            const op = this.previous();
            const right = this.parseBitwiseOr();
            expr = { type: 'LogicalExpression', operator: op.value, left: expr, right, line: op.line };
        }
        return expr;
    }

    parseBitwiseOr() {
        let expr = this.parseBitwiseXor();
        while (this.match('OPERATOR', '|')) {
            const op = this.previous();
            const right = this.parseBitwiseXor();
            expr = { type: 'BinaryExpression', operator: op.value, left: expr, right, line: op.line };
        }
        return expr;
    }

    parseBitwiseXor() {
        let expr = this.parseBitwiseAnd();
        while (this.match('OPERATOR', '^')) {
            const op = this.previous();
            const right = this.parseBitwiseAnd();
            expr = { type: 'BinaryExpression', operator: op.value, left: expr, right, line: op.line };
        }
        return expr;
    }

    parseBitwiseAnd() {
        let expr = this.parseEquality();
        while (this.match('OPERATOR', '&')) {
            const op = this.previous();
            const right = this.parseEquality();
            expr = { type: 'BinaryExpression', operator: op.value, left: expr, right, line: op.line };
        }
        return expr;
    }

    parseEquality() {
        let expr = this.parseRelational();
        while (this.match('OPERATOR', '==') || this.match('OPERATOR', '!=')) {
            const op = this.previous();
            const right = this.parseRelational();
            expr = { type: 'BinaryExpression', operator: op.value, left: expr, right, line: op.line };
        }
        return expr;
    }

    parseRelational() {
        let expr = this.parseShift();
        while (['<', '<=', '>', '>='].some(op => this.match('OPERATOR', op))) {
            const op = this.previous();
            const right = this.parseShift();
            expr = { type: 'BinaryExpression', operator: op.value, left: expr, right, line: op.line };
        }
        return expr;
    }

    parseShift() {
        let expr = this.parseAdditive();
        while (this.match('OPERATOR', '<<') || this.match('OPERATOR', '>>')) {
            const op = this.previous();
            const right = this.parseAdditive();
            expr = { type: 'BinaryExpression', operator: op.value, left: expr, right, line: op.line };
        }
        return expr;
    }

    parseAdditive() {
        let expr = this.parseMultiplicative();
        while (this.match('OPERATOR', '+') || this.match('OPERATOR', '-')) {
            const op = this.previous();
            const right = this.parseMultiplicative();
            expr = { type: 'BinaryExpression', operator: op.value, left: expr, right, line: op.line };
        }
        return expr;
    }

    parseMultiplicative() {
        let expr = this.parseUnary();
        while (this.match('OPERATOR', '*') || this.match('OPERATOR', '/') || this.match('OPERATOR', '%')) {
            const op = this.previous();
            const right = this.parseUnary();
            expr = { type: 'BinaryExpression', operator: op.value, left: expr, right, line: op.line };
        }
        return expr;
    }

    parseUnary() {
        if (['!', '~', '+', '-', '++', '--'].some(op => this.match('OPERATOR', op))) {
            const op = this.previous();
            const arg = this.parseUnary();
            if (['++', '--'].includes(op.value)) {
                return { type: 'UpdateExpression', operator: op.value, argument: arg, prefix: true, line: op.line };
            }
            return { type: 'UnaryExpression', operator: op.value, argument: arg, prefix: true, line: op.line };
        }
        return this.parsePostfix();
    }

    parsePostfix() {
        let expr = this.parsePrimary();

        while (true) {
            if (this.match('PUNCT', '(')) {
                // Function call: expr(arg1, arg2)
                const args = [];
                if (!this.check('PUNCT', ')')) {
                    do {
                        args.push(this.parseExpression());
                    } while (this.match('PUNCT', ','));
                }
                this.consume('PUNCT', ')', "Chýba ')' na konci volania funkcie");
                expr = {
                    type: 'CallExpression',
                    callee: expr,
                    arguments: args,
                    line: expr.line
                };
            } else if (this.match('PUNCT', '[')) {
                // Array access: expr[index]
                const index = this.parseExpression();
                this.consume('PUNCT', ']', "Chýba ']' pri indexácii poľa");
                expr = {
                    type: 'MemberExpression',
                    object: expr,
                    property: index,
                    computed: true,
                    line: expr.line
                };
            } else if (this.match('PUNCT', '.') || this.match('OPERATOR', '->')) {
                // Member access: PORTAbits.RA0
                const propTok = this.consume('IDENTIFIER', null, "Očakáva sa názov vlastnosti po '.'");
                expr = {
                    type: 'MemberExpression',
                    object: expr,
                    property: { type: 'Identifier', name: propTok.value, line: propTok.line },
                    computed: false,
                    line: expr.line
                };
            } else if (this.match('OPERATOR', '++') || this.match('OPERATOR', '--')) {
                // Postfix ++ / --
                const op = this.previous();
                expr = {
                    type: 'UpdateExpression',
                    operator: op.value,
                    argument: expr,
                    prefix: false,
                    line: op.line
                };
            } else {
                break;
            }
        }

        return expr;
    }

    parsePrimary() {
        const tok = this.peek();

        if (tok.type === 'NUMBER') {
            this.advance();
            return { type: 'Literal', value: tok.value, raw: tok.raw, line: tok.line, column: tok.column };
        }

        if (tok.type === 'STRING') {
            this.advance();
            return { type: 'Literal', value: tok.value, raw: `"${tok.value}"`, line: tok.line, column: tok.column };
        }

        if (tok.type === 'KEYWORD') {
            if (tok.value === 'true') {
                this.advance();
                return { type: 'Literal', value: 1, raw: 'true', line: tok.line };
            }
            if (tok.value === 'false') {
                this.advance();
                return { type: 'Literal', value: 0, raw: 'false', line: tok.line };
            }
        }

        if (tok.type === 'IDENTIFIER') {
            this.advance();
            return { type: 'Identifier', name: tok.value, line: tok.line, column: tok.column };
        }

        if (this.match('PUNCT', '(')) {
            const expr = this.parseExpression();
            this.consume('PUNCT', ')', "Chýba uzatváracia zátvorka ')'");
            return expr;
        }

        if (this.match('PUNCT', '{')) {
            const elements = [];
            if (!this.check('PUNCT', '}')) {
                do {
                    if (this.check('PUNCT', '}')) break; // allow trailing comma
                    elements.push(this.parseExpression());
                } while (this.match('PUNCT', ','));
            }
            this.consume('PUNCT', '}', "Chýba uzatváracia zložená zátvorka '}' pri inicializácii poľa");
            return {
                type: 'ArrayInitializer',
                elements,
                line: tok.line,
                column: tok.column
            };
        }

        this.error(tok.line, tok.column, `Neočakávaný výraz alebo token '${tok.value}'`);
        this.advance();
        return { type: 'Literal', value: 0, line: tok.line, column: tok.column };
    }
}

// Export for Node and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CCompiler, CParser };
}
