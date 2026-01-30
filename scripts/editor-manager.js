// scripts/editor-manager.js
let editor;

async function loadMonaco() {
    return new Promise((resolve) => {
        const loader = document.createElement('script');
        loader.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js';
        loader.onload = () => {
            require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
            require(['vs/editor/editor.main'], () => {
                resolve(monaco);
            });
        };
        document.head.appendChild(loader);
    });
}

async function initEditor() {
    const monaco = await loadMonaco();
    const container = document.getElementById('editor-container');
    
    // editor = monaco.editor.create(container, {
    //     value: "// AI-generated code will appear here...\n",
    //     language: 'javascript',
    //     theme: 'vs-dark',
    //     automaticLayout: true,
    //     fontSize: 14,
    //     minimap: { enabled: false },
    //     lineNumbers: "on",
    //     roundedSelection: true,
    //     scrollBeyondLastLine: false,
    //     readOnly: false,
    // });

    console.log("🚀 Monaco Editor Initialized");
}

// Global function to update editor content
window.setEditorContent = function(text, language = 'javascript') {
    if (!editor) return;
    const model = editor.getModel();
    editor.setValue(text);
    if (language) {
        monaco.editor.setModelLanguage(model, language);
    }
};

// Global function to get content (for saving)
window.getEditorContent = function() {
    return editor ? editor.getValue() : '';
};

document.addEventListener('DOMContentLoaded', initEditor);