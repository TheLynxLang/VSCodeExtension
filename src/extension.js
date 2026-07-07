const vscode = require('vscode');
const cp = require('child_process');
const path = require('path');

let lspClient = null;

function activate(context) {
    console.log('🐱 Lynx extension activated');

    // Register commands
    let disposable = vscode.commands.registerCommand('lynx.runFile', runFile);
    context.subscriptions.push(disposable);

    // Start LSP client
    startLSP(context);

    // Register document formatting provider
    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider('lynx', {
            provideDocumentFormattingEdits(document) {
                return formatDocument(document);
            }
        })
    );
}

function startLSP(context) {
    const config = vscode.workspace.getConfiguration('lynx');
    const lspPath = config.get('lsp.path', 'lynx-lsp');

    const serverOptions = {
        command: lspPath,
        args: ['--stdio'],
        options: { env: process.env }
    };

    const clientOptions = {
        documentSelector: [{ scheme: 'file', language: 'lynx' }],
        synchronize: {
            configurationSection: 'lynx'
        }
    };

    try {
        lspClient = new (require('vscode-languageclient')).LanguageClient(
            'lynx-lsp',
            'Lynx LSP',
            serverOptions,
            clientOptions
        );
        lspClient.start();
        console.log('✅ Lynx LSP started');
    } catch (e) {
        console.warn('⚠️ Lynx LSP not found. Install lynx-lsp or set path.');
    }
}

function runFile() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
    }

    const document = editor.document;
    if (document.languageId !== 'lynx') {
        vscode.window.showErrorMessage('Not a Lynx file');
        return;
    }

    const filePath = document.fileName;
    const terminal = vscode.window.createTerminal('Lynx');
    terminal.show();
    terminal.sendText(`lynx "${filePath}"`);
}

function formatDocument(document) {
    const text = document.getText();
    const lines = text.split('\n');
    const formatted = [];
    let indent = 0;

    for (let line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            formatted.push('');
            continue;
        }

        if (trimmed.startsWith('}')) {
            indent = Math.max(0, indent - 1);
        }

        const indentStr = '  '.repeat(indent);
        formatted.push(indentStr + trimmed);

        if (trimmed.endsWith('{')) {
            indent++;
        }
    }

    const fullText = formatted.join('\n');
    const range = new vscode.Range(
        document.positionAt(0),
        document.positionAt(text.length)
    );

    return [vscode.TextEdit.replace(range, fullText)];
}

function deactivate() {
    if (lspClient) {
        lspClient.stop();
    }
    console.log('🐱 Lynx extension deactivated');
}

module.exports = {
    activate,
    deactivate
};