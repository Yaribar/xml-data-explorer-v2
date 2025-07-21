"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
function activate(context) {
    console.log("XML Data Explorer v2 is now active!");
    // Register the basic command
    const openExplorer = vscode.commands.registerCommand("xmlDataExplorer.openExplorer", async (uri) => {
        const xmlPath = uri?.fsPath || getActiveXmlFilePath();
        if (xmlPath) {
            await loadXmlFile(xmlPath);
        }
        else {
            vscode.window.showErrorMessage("No XML file selected or open");
        }
    });
    context.subscriptions.push(openExplorer);
}
function getActiveXmlFilePath() {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && activeEditor.document.languageId === "xml") {
        return activeEditor.document.fileName;
    }
    return null;
}
async function loadXmlFile(filePath) {
    try {
        vscode.window.showInformationMessage(`Loading XML file: ${filePath}`);
        // TODO: Add XML parsing and visualization logic
        console.log("XML file path:", filePath);
    }
    catch (error) {
        vscode.window.showErrorMessage(`Error loading XML file: ${error}`);
    }
}
function deactivate() { }
//# sourceMappingURL=extension.js.map