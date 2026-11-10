/**
 * Main Application Controller for PIC16F84A Simulator
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Simulator & Compiler
    const compiler = new CCompiler();
    const pic = new PIC16F84A();

    let editor = null;
    let activeLineHandle = null;
    let errorGutterMarkers = [];
    const breakpoints = new Set(); // Set of 1-based line numbers

    // 2. Initialize CodeMirror Editor
    const editorTextarea = document.getElementById('codeEditorArea');

    if (typeof CodeMirror !== 'undefined') {
        editor = CodeMirror.fromTextArea(editorTextarea, {
            mode: 'text/x-csrc',
            theme: 'default',
            lineNumbers: true,
            styleActiveLine: true,
            matchBrackets: true,
            autoCloseBrackets: true,
            indentUnit: 4,
            tabSize: 4,
            indentWithTabs: false,
            gutters: ['CodeMirror-linenumbers', 'breakpoints', 'error-gutter'],
            extraKeys: {
                'F5': () => handleRun(),
                'F10': () => handleStep(),
                'Tab': (cm) => cm.replaceSelection('    ', 'end')
            }
        });

        // Set initial code from template.c
        editor.setValue(TEMPLATE_C);

        // Click gutter for breakpoints
        editor.on('gutterClick', (cm, lineIndex, gutter) => {
            const lineNum = lineIndex + 1;
            if (gutter === 'CodeMirror-linenumbers' || gutter === 'breakpoints') {
                const info = cm.lineInfo(lineIndex);
                if (info.gutterMarkers && info.gutterMarkers['breakpoints']) {
                    cm.setGutterMarker(lineIndex, 'breakpoints', null);
                    breakpoints.delete(lineNum);
                } else {
                    const marker = document.createElement('div');
                    marker.className = 'breakpoint-marker';
                    marker.innerHTML = '●';
                    marker.title = `Bod prerušenia (riadok ${lineNum})`;
                    cm.setGutterMarker(lineIndex, 'breakpoints', marker);
                    breakpoints.add(lineNum);
                }
            }
        });

        // Clear error markers on edit
        editor.on('change', () => {
            clearErrors();
        });
    } else {
        // Fallback if CodeMirror fails to load
        editorTextarea.value = TEMPLATE_C;
        editor = {
            getValue: () => editorTextarea.value,
            setValue: (val) => { editorTextarea.value = val; },
            getSelection: () => '',
            replaceSelection: (val) => { editorTextarea.value += val; },
            setCursor: () => {},
            focus: () => editorTextarea.focus()
        };
    }

    // 3. UI Elements
    const btnRun = document.getElementById('btnRun');
    const btnPause = document.getElementById('btnPause');
    const btnStep = document.getElementById('btnStep');
    const btnStop = document.getElementById('btnStop');
    const btnMclrReset = document.getElementById('btnMclrReset');

    const statusPill = document.getElementById('statusPill');
    const statusText = document.getElementById('statusText');
    const speedSelector = document.getElementById('speedSelector');
    const ledColorPicker = document.getElementById('ledColorPicker');
    const exampleSelector = document.getElementById('exampleSelector');

    const btnResetTemplate = document.getElementById('btnResetTemplate');
    const btnInsertCommands = document.getElementById('btnInsertCommands');
    const btnCopyCode = document.getElementById('btnCopyCode');
    const btnDownloadCode = document.getElementById('btnDownloadCode');

    const buttonLogicSelect = document.getElementById('buttonLogicSelect');
    const buttonModeSelect = document.getElementById('buttonModeSelect');

    const compilerLogsList = document.getElementById('compilerLogsList');
    const errorCountBadge = document.getElementById('errorCountBadge');

    // 4. Activity Rail Buttons
    const railBtnEditor = document.getElementById('railBtnEditor');
    const railBtnLibrary = document.getElementById('railBtnLibrary');
    const railBtnQuickRun = document.getElementById('railBtnQuickRun');
    const railBtnSettings = document.getElementById('railBtnSettings');
    const helpModal = document.getElementById('helpModal');
    const btnCloseHelpModal = document.getElementById('btnCloseHelpModal');
    const btnDismissHelpModal = document.getElementById('btnDismissHelpModal');

    // 5. Setup Speed Configuration
    function applySpeedSetting() {
        const val = speedSelector.value;
        if (val.startsWith('step-')) {
            const ms = parseInt(val.replace('step-', ''), 10);
            pic.stepDelayMs = ms;
            pic.speedMultiplier = 1.0;
        } else {
            pic.stepDelayMs = 0;
            pic.speedMultiplier = parseFloat(val);
        }
    }
    speedSelector.addEventListener('change', applySpeedSetting);
    applySpeedSetting();

    // 6. LED Color Changing
    ledColorPicker.addEventListener('change', (e) => {
        const col = e.target.value;
        const root = document.documentElement;
        if (col === 'yellow') {
            root.style.setProperty('--led-yellow-on', '#fbbf24');
            root.style.setProperty('--led-yellow-off', '#5a4b10');
            root.style.setProperty('--led-yellow-glow', 'rgba(251, 191, 36, 0.7)');
        } else if (col === 'red') {
            root.style.setProperty('--led-yellow-on', '#ef4444');
            root.style.setProperty('--led-yellow-off', '#5f1212');
            root.style.setProperty('--led-yellow-glow', 'rgba(239, 68, 68, 0.7)');
        } else if (col === 'green') {
            root.style.setProperty('--led-yellow-on', '#22c55e');
            root.style.setProperty('--led-yellow-off', '#052e16');
            root.style.setProperty('--led-yellow-glow', 'rgba(34, 197, 94, 0.7)');
        } else if (col === 'blue') {
            root.style.setProperty('--led-yellow-on', '#38bdf8');
            root.style.setProperty('--led-yellow-off', '#0c4a6e');
            root.style.setProperty('--led-yellow-glow', 'rgba(56, 189, 248, 0.7)');
        }
    });

    // 7. Theme Management (Biele pozadie, Čierne pozadie, Systémové pozadie)
    const themeSelector = document.getElementById('themeSelector');
    const modalThemeSelector = document.getElementById('modalThemeSelector');

    function getSystemTheme() {
        return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }

    function applyTheme(choice, save = true) {
        let activeTheme = choice;
        if (choice === 'system') {
            activeTheme = getSystemTheme();
        }

        document.documentElement.setAttribute('data-theme', activeTheme);
        document.documentElement.setAttribute('data-theme-choice', choice);

        if (save) {
            localStorage.setItem('prm_theme', choice);
        }

        if (themeSelector) themeSelector.value = choice;
        if (modalThemeSelector) modalThemeSelector.value = choice;

        if (typeof editor !== 'undefined' && editor) {
            editor.refresh();
        }
    }

    // Load initial theme from localStorage (default to 'light' / biele pozadie)
    const savedTheme = localStorage.getItem('prm_theme') || 'light';
    applyTheme(savedTheme, false);

    if (themeSelector) {
        themeSelector.addEventListener('change', (e) => {
            applyTheme(e.target.value);
        });
    }

    if (modalThemeSelector) {
        modalThemeSelector.addEventListener('change', (e) => {
            applyTheme(e.target.value);
        });
    }

    // Listen for OS system theme changes when user chooses 'system'
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            const currentChoice = localStorage.getItem('prm_theme') || 'light';
            if (currentChoice === 'system') {
                applyTheme('system', false);
            }
        });
    }

    // 7. Compiler & Error Handling
    function clearErrors() {
        if (editor && editor.clearGutter) {
            editor.clearGutter('error-gutter');
            for (let i = 0; i < editor.lineCount(); i++) {
                editor.removeLineClass(i, 'background', 'cm-error-line');
            }
        }
        errorGutterMarkers = [];
        errorCountBadge.textContent = '0';
        errorCountBadge.classList.remove('error');
    }

    function addCompilerLog(msg, type = 'info', line = null) {
        const item = document.createElement('div');
        item.className = `console-log-item ${type}`;

        const icon = type === 'error' ? '❌' : (type === 'success' ? '✅' : 'ℹ️');
        item.innerHTML = `<span>${icon}</span><span>${msg}</span>`;

        if (line && editor) {
            item.title = `Klikni pre skok na riadok ${line}`;
            item.addEventListener('click', () => {
                editor.setCursor({ line: line - 1, ch: 0 });
                editor.focus();
            });
        }

        compilerLogsList.appendChild(item);
        compilerLogsList.scrollTop = compilerLogsList.scrollHeight;
    }

    function markErrorInEditor(err) {
        if (!editor || !err.line) return;
        const lineIdx = Math.max(0, err.line - 1);

        // Marker in gutter (Red ❌)
        const marker = document.createElement('div');
        marker.className = 'error-gutter-marker';
        marker.innerHTML = '❌';
        marker.title = `Riadok ${err.line}: ${err.message}`;

        marker.addEventListener('click', () => {
            editor.setCursor({ line: lineIdx, ch: 0 });
            editor.focus();
        });

        editor.setGutterMarker(lineIdx, 'error-gutter', marker);
        editor.addLineClass(lineIdx, 'background', 'cm-error-line');
        errorGutterMarkers.push(lineIdx);
    }

    function switchBottomTab(tabId) {
        document.querySelectorAll('.panel-tab').forEach(t => {
            t.classList.toggle('active', t.getAttribute('data-tab') === tabId);
        });
        document.querySelectorAll('.tab-pane').forEach(p => {
            p.classList.toggle('active', p.id === tabId);
        });
    }

    // 8. Compile Code
    function compileProgram() {
        clearErrors();
        compilerLogsList.innerHTML = '';

        const code = editor.getValue();
        const customLibEl = document.getElementById('customLibraryText');
        const customLib = customLibEl ? customLibEl.value.trim() : '';
        const fullSource = customLib ? `${customLib}\n\n${code}` : code;

        addCompilerLog('🔨 Spúšťam kompiláciu programu (Microchip XC8 C syntax)...', 'info');

        const result = compiler.compile(fullSource);

        if (!result.success || result.errors.length > 0) {
            statusPill.className = 'status-pill error';
            statusText.textContent = `Chyba (${result.errors.length})`;
            errorCountBadge.textContent = result.errors.length;
            errorCountBadge.classList.add('error');

            for (const err of result.errors) {
                markErrorInEditor(err);
                addCompilerLog(`Riadok ${err.line}, stĺpec ${err.column}: ${err.message}`, 'error', err.line);
            }

            switchBottomTab('tabConsole');
            return null;
        }

        addCompilerLog('✅ Kompilácia úspešná (0 chýb). Program je pripravený.', 'success');
        errorCountBadge.textContent = '0';
        errorCountBadge.classList.remove('error');
        return result.ast;
    }

    // 9. Simulation Controls (Run, Pause, Step, Stop)
    async function handleRun() {
        if (pic.isRunning) {
            if (pic.isPaused) {
                pic.resume();
                updateRunStateUI();
            }
            return;
        }

        const ast = compileProgram();
        if (!ast) return;

        applySpeedSetting();
        updateRunStateUI(true);

        try {
            await pic.runAST(ast, breakpoints);
        } catch (err) {
            console.error(err);
        } finally {
            updateRunStateUI(false);
        }
    }

    function handlePause() {
        if (pic.isRunning) {
            if (pic.isPaused) {
                pic.resume();
            } else {
                pic.pause();
            }
            updateRunStateUI();
        }
    }

    async function handleStep() {
        if (!pic.isRunning) {
            const ast = compileProgram();
            if (!ast) return;

            pic.isPaused = true;
            pic.isStepping = true;
            updateRunStateUI(true);

            // Run AST in background
            pic.runAST(ast, breakpoints).finally(() => {
                updateRunStateUI(false);
            });
            return;
        }

        if (pic.isPaused) {
            pic.step();
        } else {
            pic.pause();
        }
    }

    function handleStop() {
        pic.stop();
        clearActiveExecLine();
        pic.reset();
        updateRunStateUI(false);
        addCompilerLog('⏹ Simulácia zastavená a resetovaná.', 'info');
    }

    let autoScrollEnabled = false;
    const chkAutoScroll = document.getElementById('chkAutoScroll');
    if (chkAutoScroll) {
        chkAutoScroll.addEventListener('change', (e) => {
            autoScrollEnabled = e.target.checked;
        });
    }

    function clearActiveExecLine() {
        if (editor && activeLineHandle !== null) {
            editor.removeLineClass(activeLineHandle, 'background', 'cm-active-exec-line');
            activeLineHandle = null;
        }
    }

    // Zistí, či je daný riadok kódu už viditeľný v okne editora
    function isLineVisibleInEditor(lineIdx) {
        if (!editor) return true;
        try {
            const scrollInfo = editor.getScrollInfo();
            const lineTop = editor.heightAtLine(lineIdx, 'local');
            const lineHeight = editor.defaultTextHeight ? editor.defaultTextHeight() : 20;
            const lineBottom = lineTop + lineHeight;
            // Riadok je viditeľný ak je medzi horným a dolným okrajom viditeľnej časti
            return lineTop >= scrollInfo.top && lineBottom <= (scrollInfo.top + scrollInfo.clientHeight);
        } catch (e) {
            return false;
        }
    }

    function highlightExecutingLine(lineNum, forceScroll = false) {
        if (!editor) return;

        // Keď program beží v plnej rýchlosti a sledovanie riadku je vypnuté:
        // NEPOSÚVAJ editor a neber používateľovi kontrolu nad posuvníkom!
        if (!forceScroll && !pic.isPaused && !pic.isStepping && !autoScrollEnabled) {
            clearActiveExecLine();
            return;
        }

        if (!lineNum) return;
        clearActiveExecLine();
        const lineIdx = lineNum - 1;
        if (lineIdx >= 0 && lineIdx < editor.lineCount()) {
            activeLineHandle = lineIdx;
            editor.addLineClass(lineIdx, 'background', 'cm-active-exec-line');

            // Posúvanie na riadok:
            // Ak je riadok UŽ viditeľný na obrazovke, VÔBEC NESKROLUJ (aby to neťahalo stránku ani editor dole)!
            const lineVisible = isLineVisibleInEditor(lineIdx);
            if (forceScroll || (autoScrollEnabled && !lineVisible)) {
                editor.scrollIntoView({ line: lineIdx, ch: 0 }, 40);
            }
        }
    }

    function updateRunStateUI(running) {
        const isRunning = running !== undefined ? running : pic.isRunning;
        btnRun.disabled = isRunning && !pic.isPaused;
        btnPause.disabled = !isRunning;
        btnPause.innerHTML = pic.isPaused ? '<span>▶</span> Pokračovať' : '<span>⏸</span> Pozastaviť';

        if (!isRunning) {
            statusPill.className = 'status-pill';
            statusText.textContent = 'Pripravený';
        } else if (pic.isPaused) {
            statusPill.className = 'status-pill paused';
            statusText.textContent = `Pozastavené (Krok)`;
            if (pic.currentLine) highlightExecutingLine(pic.currentLine, true);
        } else {
            statusPill.className = 'status-pill running';
            statusText.textContent = 'Program beží...';
        }
    }

    // 10. Connect Simulator Callbacks
    pic.onLineChange = (line) => {
        // Počas plynulého behu sa scrollbar neblokuje, aby sa dalo voľne scrollovať k tlačidlám
        const isPausedOrStepping = pic.isPaused || pic.isStepping;
        highlightExecutingLine(line, isPausedOrStepping);
    };

    pic.onConsoleLog = (msg) => {
        addCompilerLog(msg, 'info');
    };

    pic.onExecutionEnd = () => {
        clearActiveExecLine();
        updateRunStateUI(false);
    };

    pic.onStateChange = (state) => {
        // Update 8 LED elements
        const portb = state.registers.PORTB;
        const trisb = state.registers.TRISB;

        for (let i = 0; i < 8; i++) {
            const ledEl = document.getElementById(`led_${i}`);
            const valEl = document.getElementById(`ledval_${i}`);
            const pinEl = document.getElementById(`pin_RB${i}`);

            const isOutput = ((trisb >> i) & 1) === 0;
            const bit = (portb >> i) & 1;
            const isLit = isOutput && (bit === 1);

            if (ledEl) ledEl.classList.toggle('lit', isLit);
            if (valEl) {
                valEl.textContent = bit;
                valEl.classList.toggle('lit', isLit);
            }
            if (pinEl) pinEl.classList.toggle('high', bit === 1);
        }

        // Update PORTB Summary Values
        document.getElementById('portbHex').textContent = '0x' + portb.toString(16).padStart(2, '0').toUpperCase();
        document.getElementById('portbBin').textContent = portb.toString(2).padStart(8, '0');
        const decEl = document.getElementById('portbDec');
        if (decEl) decEl.textContent = portb.toString();

        // Update Button State Indicators
        const btnKeys = ['TL1', 'TL2', 'TL3', 'TL4', 'TL5'];
        for (let i = 0; i < 5; i++) {
            const name = btnKeys[i];
            const isPressed = state.buttons[name];
            const pinInd = document.getElementById(`pin_RA${i}`);
            const raBit = (state.registers.PORTA >> i) & 1;

            if (pinInd) pinInd.classList.toggle('high', raBit === 1);

            document.querySelectorAll(`[data-button="${name}"]`).forEach(btnEl => {
                if (buttonModeSelect && buttonModeSelect.value === 'toggle') {
                    btnEl.classList.toggle('latched', isPressed);
                } else {
                    btnEl.classList.toggle('active-pressed', isPressed);
                }
            });
        }

        // Update Live Register Tab
        renderRegistersTable(state);
    };

    function renderRegistersTable(state) {
        document.getElementById('valTRISA').textContent = '0x' + state.registers.TRISA.toString(16).padStart(2, '0').toUpperCase();
        document.getElementById('valTRISB').textContent = '0x' + state.registers.TRISB.toString(16).padStart(2, '0').toUpperCase();
        document.getElementById('valPORTA').textContent = '0x' + state.registers.PORTA.toString(16).padStart(2, '0').toUpperCase();
        document.getElementById('valPORTB').textContent = '0x' + state.registers.PORTB.toString(16).padStart(2, '0').toUpperCase();

        const buildBits = (containerId, val, numBits) => {
            const cont = document.getElementById(containerId);
            if (!cont) return;
            cont.innerHTML = '';
            for (let b = numBits - 1; b >= 0; b--) {
                const bitVal = (val >> b) & 1;
                const box = document.createElement('div');
                box.className = 'bit-box';
                box.innerHTML = `<span class="bit-idx">${b}</span><span class="bit-val ${bitVal ? 'high' : ''}">${bitVal}</span>`;
                cont.appendChild(box);
            }
        };

        buildBits('bitsTRISA', state.registers.TRISA, 5);
        buildBits('bitsTRISB', state.registers.TRISB, 8);
        buildBits('bitsPORTA', state.registers.PORTA, 5);
        buildBits('bitsPORTB', state.registers.PORTB, 8);
    }

    // 11. Button Hardware Events (TL1 - TL5)
    // Všetky tlačidlá sú vypnuté (0), pri stlačení a držaní sú stlačené (1)
    const pressedButtons = new Set();

    function setBtnState(btnName, pressed) {
        if (pressed) {
            pressedButtons.add(btnName);
            pic.setButtonState(btnName, true);
            document.querySelectorAll(`[data-button="${btnName}"]`).forEach(b => b.classList.add('active-pressed'));
        } else {
            pressedButtons.delete(btnName);
            pic.setButtonState(btnName, false);
            document.querySelectorAll(`[data-button="${btnName}"]`).forEach(b => b.classList.remove('active-pressed'));
        }
    }

    document.querySelectorAll('[data-button]').forEach(el => {
        const btnName = el.getAttribute('data-button');

        el.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            setBtnState(btnName, true);
            try { el.setPointerCapture(e.pointerId); } catch (_) {}
        });

        el.addEventListener('pointerup', (e) => {
            e.preventDefault();
            setBtnState(btnName, false);
            try { el.releasePointerCapture(e.pointerId); } catch (_) {}
        });

        el.addEventListener('pointercancel', (e) => {
            e.preventDefault();
            setBtnState(btnName, false);
            try { el.releasePointerCapture(e.pointerId); } catch (_) {}
        });
    });

    window.addEventListener('pointerup', () => {
        if (pressedButtons.size > 0) {
            pressedButtons.forEach(btnName => setBtnState(btnName, false));
        }
    });

    // Keyboard Shortcuts (1, 2, 3, 4, 5 for TL1..TL5)
    window.addEventListener('keydown', (e) => {
        // Only if not focused on code editor or textarea
        if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;

        if (e.key === 'F5') {
            e.preventDefault();
            handleRun();
            return;
        }
        if (e.key === 'F10') {
            e.preventDefault();
            handleStep();
            return;
        }

        const keyMap = { '1': 'TL1', '2': 'TL2', '3': 'TL3', '4': 'TL4', '5': 'TL5' };
        if (keyMap[e.key]) {
            setBtnState(keyMap[e.key], true);
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
        const keyMap = { '1': 'TL1', '2': 'TL2', '3': 'TL3', '4': 'TL4', '5': 'TL5' };
        if (keyMap[e.key]) {
            setBtnState(keyMap[e.key], false);
        }
    });

    if (buttonLogicSelect) {
        buttonLogicSelect.addEventListener('change', (e) => {
            pic.setButtonLogic(e.target.value);
        });
    }

    btnMclrReset.addEventListener('click', () => {
        handleStop();
        addCompilerLog('🔄 Hardware MCLR Reset aktivovaný.', 'info');
    });

    // 12. Connect Toolbar Buttons
    btnRun.addEventListener('click', handleRun);
    btnPause.addEventListener('click', handlePause);
    btnStep.addEventListener('click', handleStep);
    btnStop.addEventListener('click', handleStop);

    // Activity Rail Quick Run
    railBtnQuickRun.addEventListener('click', handleRun);

    // Activity Rail Tab Switching
    if (railBtnEditor) {
        railBtnEditor.addEventListener('click', () => {
            railBtnEditor.classList.add('active');
            if (railBtnLibrary) railBtnLibrary.classList.remove('active');
            switchBottomTab('tabConsole');
            if (editor) editor.focus();
        });
    }

    if (railBtnLibrary) {
        railBtnLibrary.addEventListener('click', () => {
            railBtnLibrary.classList.add('active');
            if (railBtnEditor) railBtnEditor.classList.remove('active');
            switchBottomTab('tabLibrary');
        });
    }

    if (railBtnSettings) {
        railBtnSettings.addEventListener('click', () => {
            helpModal.classList.add('open');
        });
    }

    if (btnCloseHelpModal) btnCloseHelpModal.addEventListener('click', () => helpModal.classList.remove('open'));
    if (btnDismissHelpModal) btnDismissHelpModal.addEventListener('click', () => helpModal.classList.remove('open'));
    if (helpModal) {
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) helpModal.classList.remove('open');
        });
    }

    // 13. Preset & Template Actions
    if (btnResetTemplate) {
        btnResetTemplate.addEventListener('click', () => {
            if (confirm('Naozaj chceš obnoviť kód na pôvodný template.c? Všetky neuložené zmeny sa prepíšu.')) {
                editor.setValue(TEMPLATE_C);
                clearErrors();
                if (exampleSelector) exampleSelector.value = 'template';
            }
        });
    }

    if (btnInsertCommands) {
        btnInsertCommands.addEventListener('click', () => {
            if (confirm('Chceš vložiť program zo súboru commandy.c s definíciami tlačidiel a TRIS registrov?')) {
                editor.setValue(COMMANDY_C);
                clearErrors();
                if (exampleSelector) exampleSelector.value = 'commandy';
            }
        });
    }

    if (exampleSelector) {
        exampleSelector.addEventListener('change', (e) => {
            const id = e.target.value;
            const found = EXAMPLES.find(ex => ex.id === id);
            if (found) {
                editor.setValue(found.code);
                clearErrors();
                addCompilerLog(`Načítaný príklad: ${found.title}`, 'info');
            }
        });
    }

    if (btnCopyCode) {
        btnCopyCode.addEventListener('click', () => {
            navigator.clipboard.writeText(editor.getValue()).then(() => {
                const originalText = btnCopyCode.textContent;
                btnCopyCode.textContent = '✓ Skopírované!';
                setTimeout(() => { btnCopyCode.textContent = originalText; }, 1500);
            });
        });
    }

    if (btnDownloadCode) {
        btnDownloadCode.addEventListener('click', () => {
            const code = editor.getValue();
            const blob = new Blob([code], { type: 'text/x-csrc' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'main.c';
            a.click();
            URL.revokeObjectURL(a.href);
        });
    }

    // 14. Bottom Tabs Switching
    document.querySelectorAll('.panel-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-tab');
            switchBottomTab(target);
        });
    });

    // 15. Render Library Tab from library.js (if library container exists)
    const libraryContainer = document.getElementById('libraryContainer');
    if (libraryContainer && typeof PIC_LIBRARY !== 'undefined') {
        PIC_LIBRARY.forEach(cat => {
            const catDiv = document.createElement('div');
            catDiv.className = 'lib-category-block';
            catDiv.innerHTML = `
                <div class="lib-category-title">${cat.category}</div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 8px;">${cat.description}</div>
            `;

            cat.items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'lib-item-card';
                card.innerHTML = `
                    <div class="lib-item-info">
                        <span class="lib-item-name">${item.name}</span>
                        <span class="lib-item-desc">${item.desc}</span>
                        <div><code class="lib-item-code">${escapeHtml(item.code.replace(/\n/g, ' '))}</code></div>
                    </div>
                    <button class="btn btn-outline btn-sm btn-insert-snippet" title="Vložiť do kódu na pozíciu kurzora">
                        + Vložiť
                    </button>
                `;

                const insertBtn = card.querySelector('.btn-insert-snippet');
                insertBtn.addEventListener('click', () => {
                    if (editor) {
                        editor.replaceSelection(item.code + '\n');
                        editor.focus();
                    }
                });

                catDiv.appendChild(card);
            });

            libraryContainer.appendChild(catDiv);
        });
    }

    function escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // Ochrana: samotná webová stránka sa nikdy nesmie scrollovať
    window.addEventListener('scroll', () => {
        if (window.scrollY !== 0 || window.scrollX !== 0) {
            window.scrollTo(0, 0);
        }
    });

    // Initial hardware state notification
    pic.notifyState();
});
