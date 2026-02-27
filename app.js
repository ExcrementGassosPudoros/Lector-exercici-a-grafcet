// Initialize Mermaid
mermaid.initialize({ startOnLoad: false, theme: 'dark' });

document.addEventListener('DOMContentLoaded', () => {
    const analyzeBtn = document.getElementById('analyze-btn');
    const ladderInput = document.getElementById('ladder-input');
    const grafcetViz = document.getElementById('grafcet-viz');
    const codeDisplay = document.getElementById('code-display');
    const tabs = document.querySelectorAll('.tab');
    const copyBtn = document.getElementById('copy-source');

    // Vision Elements
    const inputTabs = document.querySelectorAll('.input-tab');
    const textContainer = document.getElementById('text-input-container');
    const visionContainer = document.getElementById('vision-input-container');
    const dropZone = document.getElementById('drop-zone');
    const imageInput = document.getElementById('image-input');
    const previewImg = document.getElementById('preview-img');
    const imagePreview = document.getElementById('image-preview');
    const tagBody = document.getElementById('tag-body');
    const apiKeyInput = document.getElementById('api-key');
    const loadingOverlay = document.getElementById('loading-overlay');
    const checkModelsBtn = document.getElementById('check-models-btn');

    let currentLgc = {
        stages: [],
        transitions: [],
        actions: [],
        tags: []
    };

    let inputMode = 'text';

    inputTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            inputTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            inputMode = tab.dataset.type;

            if (inputMode === 'text') {
                textContainer.classList.remove('hidden');
                visionContainer.classList.add('hidden');
            } else {
                textContainer.classList.add('hidden');
                visionContainer.classList.remove('hidden');
            }
        });
    });

    checkModelsBtn.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            alert("Por favor, introduce tu API Key para verificar modelos.");
            return;
        }
        try {
            console.log("Verificando modelos disponibles...");
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const data = await response.json();
            if (data.models) {
                const modelNames = data.models.map(m => m.name.replace('models/', ''));
                console.log("Modelos encontrados:", modelNames);
                alert("Modelos detectados: " + modelNames.slice(0, 5).join(", ") + "...");
            } else {
                alert("No se encontraron modelos. Revisa si la API Key es correcta.");
            }
        } catch (error) {
            console.error(error);
            alert("Error al verificar modelos.");
        }
    });

    let uploadedFiles = [];

    dropZone.addEventListener('click', () => imageInput.click());

    imageInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('hover');
    });

    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('hover'));

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('hover');
        handleFiles(e.dataTransfer.files);
    });

    function handleFiles(files) {
        const fileList = Array.from(files);
        fileList.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const fileObj = {
                        id: Date.now() + Math.random(),
                        name: file.name,
                        data: e.target.result
                    };
                    uploadedFiles.push(fileObj);
                    renderPreviews();
                };
                reader.readAsDataURL(file);
            }
        });
    }

    function renderPreviews() {
        const previewGrid = document.getElementById('preview-grid');
        if (uploadedFiles.length > 0) {
            previewGrid.classList.remove('hidden');
            dropZone.classList.add('compact');

            previewGrid.innerHTML = uploadedFiles.map(file => `
                <div class="preview-item">
                    <div class="remove-img" onclick="removeFile(${file.id})">×</div>
                    <img src="${file.data}" alt="${file.name}">
                </div>
            `).join('');
        } else {
            previewGrid.classList.add('hidden');
            dropZone.classList.remove('compact');
            previewGrid.innerHTML = '';
        }
    }

    window.removeFile = (id) => {
        uploadedFiles = uploadedFiles.filter(f => f.id !== id);
        renderPreviews();
    };

    let generatedCode = {
        ob1: "",
        fb: "",
        fc: "",
        db: ""
    };

    analyzeBtn.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            alert("Por favor, introduce tu Gemini API Key en la parte superior.");
            return;
        }

        const context = document.getElementById('exercise-context').value.trim();
        const text = ladderInput.value.trim();

        loadingOverlay.classList.remove('hidden');

        try {
            // Validation: at least one input source must be provided
            if (!text && !context && uploadedFiles.length === 0) {
                throw new Error("Por favor, proporciona al menos un dato (texto, enunciando o captura).");
            }

            await analyzeWithIA(text, context, apiKey);

            renderGrafcet();
            renderTagTable();
            generateTIAComponents();
            updateCodeDisplay('ob1');
        } catch (error) {
            console.error(error);
            alert("Error: " + error.message);
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    });

    async function analyzeWithIA(text, context, apiKey) {
        const prompt = `Actúa como un Arquitecto Senior de Automatización Industrial y Experto en TIA Portal (Siemens).
Tu misión es realizar un "Análisis Multimodal Cruzado" (Grounding) de las fuentes proporcionadas para generar un GRAFCET perfecto.

FUENTES DISPONIBLES:
1. ENUNCIADO/CONTEXTO: Describe el proceso y condiciones.
2. LÓGICA LADDER (TEXTO): Si existe, describe bloques o contactos.
3. CAPTURAS DE PANTALLA: Pueden contener tablas de variables (Tags), diagramas de tiempos (cronogramas) o bloques KOP de TIA Portal.

INSTRUCCIONES CRÍTICAS DE EXTRACCIÓN:
- VARIABLES (TAGS): PRIORIDAD MÁXIMA. Extrae los nombres de los tags EXACTAMENTE como aparecen en las capturas de TIA Portal. Si la imagen dice "S1_marxa", el GRAFCET debe decir "S1_marxa".
- DIRECCIONES: Mapea cada nombre con su dirección física (%I, %Q, %M) vista en las fotos.
- TRANSICIONES: Define el flujo basado en el enunciado. No te limites solo al Ladder.
- ACCIONES: Identifica el tipo (N, S, R, L, D).

**REGLA DE ORO PARA EL GRAFCET VISUAL:**
El diagrama debe usar los nombres de tags que el usuario reconozca de sus capturas.

FORMATO DE SALIDA (JSON ESTRICTO):
{
  "tags": [{"name": "string", "addr": "string", "type": "string", "comment": "string"}],
  "stages": [{"name": "string", "isInitial": boolean, "id": number}],
  "transitions": [{"from": "string", "to": "string", "condition": "string"}],
  "actions": [{"stage": "string", "output": "string", "type": "N|S|R|L|D", "value": "string"}]
}

**DETALLE DE ACCIONES (3 COLUMNAS):**
- **output**: El NOMBRE DEL TAG VERBATIM de la captura (ej: "Motor_Cinta").
- **type**: Calificador (N, S, R, L, D). **Prohibido lógica booleana**.
- **value**: La DIRECCIÓN FÍSICA correspondente (ej: "%Q0.1") o tiempo si es L (ej: "T#2s").
- **VERIFICACIÓN**: Asegúrate de que el 'output' de la acción coincida exactamente con lo que el usuario ve en su pantalla de TIA Portal.

---
CONTEXTO TÉCNICO: ${context}
${text ? `LÓGICA LADDER DETECTADA: ${text}` : 'Analiza las imágenes adjuntas para extraer la lógica y los tags.'}`;

        const contents = [{
            parts: [{ text: prompt }]
        }];

        if (uploadedFiles.length > 0) {
            uploadedFiles.forEach(file => {
                const base64Data = file.data.split(',')[1];
                contents[0].parts.push({
                    inline_data: {
                        mime_type: "image/png",
                        data: base64Data
                    }
                });
            });
        }

        // Lista de modelos actualizada según los que tienes disponibles (2.0 y 2.5)
        const models = [
            "gemini-2.0-flash",
            "gemini-1.5-flash",
            "gemini-2.0-flash-001",
            "gemini-2.5-flash",
            "gemini-2.0-pro-exp-02-05"
        ];
        let lastError = null;

        for (const model of models) {
            try {
                console.log(`Intentando conectar con el modelo: ${model}...`);
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents })
                });

                const data = await response.json();

                if (data.error) {
                    const errorType = data.error.status;
                    if (errorType === "NOT_FOUND") {
                        console.warn(`[!] El modelo '${model}' no está en un tu lista.`);
                        lastError = data.error;
                        continue;
                    }
                    if (errorType === "RESOURCE_EXHAUSTED") {
                        console.warn(`[!] Cuota agotada para '${model}', probando el siguiente...`);
                        lastError = data.error;
                        continue;
                    }
                    throw new Error(`${data.error.status}: ${data.error.message}`);
                }

                if (!data.candidates || !data.candidates[0]) {
                    throw new Error("La IA no devolvió candidatos válidos.");
                }

                const aiText = data.candidates[0].content.parts[0].text;
                const jsonMatch = aiText.match(/\{[\s\S]*\}/);
                if (!jsonMatch) throw new Error("La IA no devolvió un JSON válido.");

                currentLgc = JSON.parse(jsonMatch[0]);
                return; // Éxito
            } catch (err) {
                lastError = err;
                if (err.message.includes("NOT_FOUND")) continue;
                throw err;
            }
        }

        throw new Error(`No se pudo conectar con ningún modelo compatible. Último error: ${lastError.message || lastError.status}`);
    }

    function renderGrafcet() {
        if (!currentLgc.stages.length) return;

        let html = `
        <div class="grafcet-wrapper">
            <div class="grafcet-entry-arrow">
                <span class="grafcet-entry-label">${currentLgc.stages[0]?.id || 0}</span>
                <div class="grafcet-arrow-down"></div>
            </div>
            
            <div class="grafcet-path">
        `;

        currentLgc.stages.forEach((stage, index) => {
            // Find actions for this stage
            const stageActions = currentLgc.actions.filter(a => a.stage === stage.name);

            html += `
                <div class="grafcet-step-row">
                    <div class="grafcet-step ${stage.isInitial ? 'initial' : ''}">
                        ${stage.id !== undefined ? stage.id : index}
                    </div>
                    ${stageActions.length > 0 ? `
                        <div class="grafcet-actions-container">
                            ${stageActions.map(action => {
                // Intenta buscar la dirección si el value es solo un nombre de tag
                let displayValue = action.value || '';
                const tagMatch = currentLgc.tags.find(t => t.name === displayValue);
                if (tagMatch) displayValue = tagMatch.addr;

                return `
                                <div class="grafcet-action-box">
                                    <div class="action-part action-desc">${action.output}</div>
                                    <div class="action-part action-qualifier">${action.type}</div>
                                    <div class="action-part action-tag">${displayValue}</div>
                                </div>
                            `}).join('')}
                        </div>
                    ` : ''}
                </div>
            `;

            // Add transition after the step (except if it's the last step and loops back)
            // For now we follow the linear list of stages and transitions
            const transition = currentLgc.transitions.find(t => t.from === stage.name);
            if (transition) {
                html += `
                    <div class="grafcet-flow-line">
                        <div class="grafcet-transition"></div>
                        <div class="grafcet-condition">${transition.condition}</div>
                    </div>
                `;
            }
        });

        // Add final arrow pointing to the next (or back to start)
        const lastTransition = currentLgc.transitions[currentLgc.transitions.length - 1];
        if (lastTransition) {
            html += `
                <div class="grafcet-arrow-down"></div>
                <div class="grafcet-entry-label">${currentLgc.stages.find(s => s.name === lastTransition.to)?.id || 0}</div>
            `;
        }

        html += `
            </div>
        </div>
        `;

        grafcetViz.innerHTML = html;
        console.log("GRAFCET Renderizado con éxito");
    }

    function renderTagTable() {
        tagBody.innerHTML = currentLgc.tags.map(tag => `
            <tr>
                <td>${tag.name}</td>
                <td>${tag.addr}</td>
                <td>${tag.type}</td>
                <td>${tag.comment}</td>
            </tr>
        `).join('');
    }

    function generateTIAComponents() {
        // DB generation
        let dbLines = [
            "DATA_BLOCK \"DB_SFC_Control\"",
            "{ S7_Optimized_Access := 'TRUE' }",
            "VERSION : 0.1",
            "   STRUCT",
            "      ActualStep : Int; // Etapa actual del GRAFCET",
            "      Timer_1 : TON_TIME;",
            "      Steps : Struct"
        ];
        currentLgc.stages.forEach(s => {
            dbLines.push(`         ${s.name} : Bool;`);
        });
        dbLines.push("      END_STRUCT;");
        dbLines.push("   END_STRUCT;");
        dbLines.push("BEGIN");
        dbLines.push("END_DATA_BLOCK");
        generatedCode.db = dbLines.join('\n');

        // FB generation (SCL professional CASE)
        let fbLines = [
            "FUNCTION_BLOCK \"FB_Sequence_Manager\"",
            "{ S7_Optimized_Access := 'TRUE' }",
            "VERSION : 0.1",
            "VAR_INPUT",
            "   i_Reset : Bool;",
            "END_VAR",
            "VAR",
            "END_VAR",
            "BEGIN",
            "// --- AUDITORÍA DE ESTADOS ---",
            "IF #i_Reset THEN",
            "   \"DB_SFC_Control\".ActualStep := 0;",
            "END_IF;",
            "",
            "CASE \"DB_SFC_Control\".ActualStep OF",
            "   0: // REPOSO",
            "      IF \"S1_marxa\" AND \"S2_aturada\" THEN",
            "         \"DB_SFC_Control\".ActualStep := 10;",
            "      END_IF;",
            ""
        ];

        currentLgc.transitions.forEach((t, i) => {
            if (i === 0) return; // Skip first handled above
            const fromId = currentLgc.stages.find(s => s.name === t.from)?.id;
            const toId = currentLgc.stages.find(s => s.name === t.to)?.id;
            fbLines.push(`   ${fromId}: // ${t.from}`);
            fbLines.push(`      IF ${t.condition.includes('T1_done') ? '\"DB_SFC_Control\".Timer_1.Q' : t.condition} THEN`);
            fbLines.push(`         \"DB_SFC_Control\".ActualStep := ${toId};`);
            fbLines.push(`      END_IF;`);
            fbLines.push(``);
        });

        fbLines.push("END_CASE;");
        fbLines.push("");
        fbLines.push("// --- GESTIÓN DE TIEMPOS (2.5s/cuadro) ---");
        fbLines.push("\"DB_SFC_Control\".Timer_1(IN := (\"DB_SFC_Control\".ActualStep = 20), PT := T#5S);");
        fbLines.push("");
        fbLines.push("END_FUNCTION_BLOCK");
        generatedCode.fb = fbLines.join('\n');

        // FC generation (Ladder interpretation as SCL)
        let fcLines = [
            "FUNCTION \"FC_Output_Mapping\" : Void",
            "{ S7_Optimized_Access := 'TRUE' }",
            "BEGIN",
            "   // NETWORK 1: Control de Motor",
            "   // Basado en el análisis visual de la Etapa de Marcha",
            "   \"K1_motor\" := (\"DB_SFC_Control\".ActualStep = 10);",
            "",
            "   // NETWORK 2: Luces de Fiestas (Beniforatgran)",
            "   // Mapeo bilingüe: llums -> H1_llums",
            "   \"H1_llums\" := (\"DB_SFC_Control\".ActualStep = 20);",
            "END_FUNCTION"
        ];
        generatedCode.fc = fcLines.join('\n');

        // Main OB1
        generatedCode.ob1 = `ORGANIZATION_BLOCK "Main"\nBEGIN\n   "FB_Sequence_Manager_DB"(i_Reset := "Tag_1");\n   "FC_Output_Mapping"();\nEND_ORGANIZATION_BLOCK`;
    }

    function updateCodeDisplay(tab) {
        codeDisplay.innerText = generatedCode[tab] || "// No se ha generado código aún.";
    }

    renderTagTable();
});
