import * as vscode from "vscode";
import { XmlFilesProvider, XmlFileItem } from "./providers/XmlFilesProvider";
import { XmlElementsProvider, XmlElementItem } from "./providers/XmlElementsProvider";

export function activate(context: vscode.ExtensionContext) {
    console.log("XML Data Explorer v2 is now active!");

    // Create tree data providers
    const xmlFilesProvider = new XmlFilesProvider();
    const xmlElementsProvider = new XmlElementsProvider();

    // Register tree data providers
    const xmlFilesTreeView = vscode.window.createTreeView('xmlExplorer.files', {
        treeDataProvider: xmlFilesProvider
    });

    const xmlElementsTreeView = vscode.window.createTreeView('xmlExplorer.elements', {
        treeDataProvider: xmlElementsProvider
    });

    // Register commands
    const openExplorer = vscode.commands.registerCommand("xmlDataExplorer.openExplorer", async (uri?: vscode.Uri) => {
        const xmlPath = uri?.fsPath || getActiveXmlFilePath();
        if (xmlPath) {
            await loadXmlFile(xmlPath);
            xmlElementsProvider.setXmlFile(xmlPath);
        } else {
            vscode.window.showErrorMessage("No XML file selected or open");
        }
    });

    const viewData = vscode.commands.registerCommand("xmlDataExplorer.viewData", async (element: XmlElementItem) => {
        if (element) {
            await openDataView(element);
        }
    });

    const copyData = vscode.commands.registerCommand("xmlDataExplorer.copyData", async (element: XmlElementItem) => {
        if (element) {
            const data = getElementData(element.element);
            await vscode.env.clipboard.writeText(data);
            vscode.window.showInformationMessage("Element data copied to clipboard");
        }
    });

    const copyXPath = vscode.commands.registerCommand("xmlDataExplorer.copyXPath", async (element: XmlElementItem) => {
        if (element) {
            await vscode.env.clipboard.writeText(element.xpath);
            vscode.window.showInformationMessage("XPath copied to clipboard");
        }
    });

    // Register file selection handler
    const fileSelectionHandler = vscode.commands.registerCommand('xmlExplorer.files.selectFile', async (fileItem: XmlFileItem) => {
        if (fileItem) {
            xmlElementsProvider.setXmlFile(fileItem.filePath);
            // Open the file in editor
            const document = await vscode.workspace.openTextDocument(fileItem.filePath);
            await vscode.window.showTextDocument(document);
        }
    });

    // Subscribe to editor changes to update elements view
    const editorChangeListener = vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && editor.document.languageId === 'xml') {
            xmlElementsProvider.setXmlFile(editor.document.fileName);
        }
    });

    // Add subscriptions
    context.subscriptions.push(
        openExplorer,
        viewData,
        copyData,
        copyXPath,
        fileSelectionHandler,
        editorChangeListener,
        xmlFilesTreeView,
        xmlElementsTreeView
    );
}

function getActiveXmlFilePath(): string | null {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && activeEditor.document.languageId === "xml") {
        return activeEditor.document.fileName;
    }
    return null;
}

async function loadXmlFile(filePath: string): Promise<void> {
    try {
        vscode.window.showInformationMessage(`Loading XML file: ${filePath}`);
        console.log("XML file path:", filePath);
    } catch (error) {
        vscode.window.showErrorMessage(`Error loading XML file: ${error}`);
    }
}

async function openDataView(element: XmlElementItem): Promise<void> {
    // TODO: Implement webview panel for data visualization
    vscode.window.showInformationMessage(`Opening data view for: ${element.label}`);
}

function getElementData(element: any): string {
    // TODO: Implement proper data extraction
    return element.textContent || element.nodeValue || '';
}

export function deactivate() {}
