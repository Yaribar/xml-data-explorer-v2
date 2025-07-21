import * as vscode from 'vscode';
import * as path from 'path';
import { XmlElementItem } from '../providers/XmlElementsProvider';

export class DataViewPanel {
    public static currentPanel: DataViewPanel | undefined;
    public static readonly viewType = 'xmlDataView';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, element: XmlElementItem) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (DataViewPanel.currentPanel) {
            DataViewPanel.currentPanel._panel.reveal(column);
            DataViewPanel.currentPanel.update(element);
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            DataViewPanel.viewType,
            `XML Data View - ${element.label}`,
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media'),
                    vscode.Uri.joinPath(extensionUri, 'out/compiled')
                ]
            }
        );

        DataViewPanel.currentPanel = new DataViewPanel(panel, extensionUri, element);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, element: XmlElementItem) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Set the webview's initial html content
        this.update(element);

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'saveElement':
                        this.saveElement(message.data);
                        return;
                    case 'saveAll':
                        this.saveAll();
                        return;
                    case 'navigateToElement':
                        this.navigateToElement(message.xpath);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public update(element: XmlElementItem) {
        const webview = this._panel.webview;
        this._panel.title = `XML Data View - ${element.label}`;
        this._panel.webview.html = this._getHtmlForWebview(webview, element);
    }

    private _getHtmlForWebview(webview: vscode.Webview, element: XmlElementItem) {
        const flattenedData = this.flattenElementData(element);
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>XML Data View</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
        }
        .container {
            display: flex;
            height: calc(100vh - 40px);
            gap: 20px;
        }
        .left-panel {
            flex: 1;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            overflow: hidden;
        }
        .right-panel {
            flex: 1;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            overflow: hidden;
        }
        .panel-header {
            background-color: var(--vscode-panel-background);
            padding: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
            font-weight: bold;
        }
        .table-container {
            height: calc(100% - 50px);
            overflow: auto;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            border: 1px solid var(--vscode-panel-border);
            padding: 8px;
            text-align: left;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        th {
            background-color: var(--vscode-panel-background);
            position: sticky;
            top: 0;
        }
        .editable {
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 4px;
            width: 100%;
            box-sizing: border-box;
        }
        .save-btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 4px 8px;
            border-radius: 3px;
            cursor: pointer;
            margin: 2px;
        }
        .save-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .save-all-btn {
            background-color: var(--vscode-button-prominentBackground);
            color: var(--vscode-button-prominentForeground);
            border: none;
            padding: 8px 16px;
            border-radius: 3px;
            cursor: pointer;
            margin: 10px;
        }
        .xml-content {
            height: calc(100% - 50px);
            overflow: auto;
            padding: 10px;
            font-family: 'Courier New', monospace;
            white-space: pre-wrap;
            background-color: var(--vscode-editor-background);
        }
        .highlighted {
            background-color: var(--vscode-editor-selectionBackground);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="left-panel">
            <div class="panel-header">
                Data Table
                <button class="save-all-btn" onclick="saveAll()">Save All Changes</button>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Element Path</th>
                            <th>Attributes</th>
                            <th>Data</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${flattenedData.map(row => `
                            <tr data-xpath="${row.xpath}">
                                <td>${row.path}</td>
                                <td>${row.attributes}</td>
                                <td><input type="text" class="editable" value="${row.data}" onchange="updateData('${row.xpath}', this.value)"></td>
                                <td><button class="save-btn" onclick="saveElement('${row.xpath}')">Save</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        <div class="right-panel">
            <div class="panel-header">XML File with Diff</div>
            <div class="xml-content" id="xmlContent">
                ${this.getXmlContent(element)}
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        function updateData(xpath, value) {
            // Store the change for later saving
            if (!window.pendingChanges) {
                window.pendingChanges = {};
            }
            window.pendingChanges[xpath] = value;
        }
        
        function saveElement(xpath) {
            const value = window.pendingChanges ? window.pendingChanges[xpath] : null;
            if (value !== null) {
                vscode.postMessage({
                    command: 'saveElement',
                    data: { xpath, value }
                });
                delete window.pendingChanges[xpath];
            }
        }
        
        function saveAll() {
            if (window.pendingChanges) {
                vscode.postMessage({
                    command: 'saveAll',
                    data: window.pendingChanges
                });
                window.pendingChanges = {};
            }
        }
        
        // Add click handlers for table rows to navigate to XML
        document.querySelectorAll('tbody tr').forEach(row => {
            row.addEventListener('click', function() {
                const xpath = this.getAttribute('data-xpath');
                vscode.postMessage({
                    command: 'navigateToElement',
                    xpath: xpath
                });
            });
        });
    </script>
</body>
</html>`;
    }

    private flattenElementData(element: XmlElementItem): any[] {
        const result: any[] = [];
        this.flattenElement(element, '', result);
        return result;
    }

    private flattenElement(element: XmlElementItem, parentPath: string, result: any[]) {
        const currentPath = parentPath ? `${parentPath}/${element.label}` : element.label;
        
        // Add current element
        result.push({
            path: currentPath,
            xpath: element.xpath,
            attributes: this.getAttributesString(element.element),
            data: this.getElementText(element.element)
        });

        // Add child elements
        const children = element.element.childNodes;
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (child.nodeType === 1) { // Element node
                const childElement = child as any;
                const childXPath = `${element.xpath}/${childElement.tagName}`;
                const childItem = new XmlElementItem(
                    childElement.tagName,
                    vscode.TreeItemCollapsibleState.None,
                    childElement,
                    childXPath,
                    element.filePath
                );
                this.flattenElement(childItem, currentPath, result);
            }
        }
    }

    private getAttributesString(element: any): string {
        const attributes = element.attributes;
        if (attributes && attributes.length > 0) {
            return Array.from(attributes).map((attr: any) => `${attr.name}="${attr.value}"`).join(' ');
        }
        return '';
    }

    private getElementText(element: any): string {
        return element.textContent || element.nodeValue || '';
    }

    private getXmlContent(element: XmlElementItem): string {
        // For now, return a simple representation
        // TODO: Implement proper XML formatting with diff highlighting
        return `<!-- XML content for ${element.label} -->
<${element.label} ${this.getAttributesString(element.element)}>
    ${this.getElementText(element.element)}
</${element.label}>`;
    }

    private saveElement(data: any) {
        vscode.window.showInformationMessage(`Saving element: ${data.xpath}`);
        // TODO: Implement actual save logic
    }

    private saveAll() {
        vscode.window.showInformationMessage('Saving all changes...');
        // TODO: Implement actual save logic
    }

    private navigateToElement(xpath: string) {
        vscode.window.showInformationMessage(`Navigating to: ${xpath}`);
        // TODO: Implement navigation to XML element
    }

    public dispose() {
        DataViewPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
} 