import * as vscode from 'vscode';
import * as path from 'path';
import { XmlElementItem } from '../providers/XmlElementsProvider';

export class DataViewPanel {
    public static currentPanel: DataViewPanel | undefined;
    public static readonly viewType = 'xmlDataView';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _pendingChanges: Map<string, string> = new Map();
    private _originalXmlContent: string = '';
    private _currentElement: XmlElementItem | null = null;

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

        // Load the original XML content
        this.loadOriginalXmlContent(element.filePath);

        // Set the webview's initial html content
        this.update(element);

        // Open the XML file in a real editor
        this.openXmlEditor(element.filePath);

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
                    case 'refreshTable':
                        this.refreshTable();
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public update(element: XmlElementItem) {
        console.log('DataViewPanel.update called with element:', element.label, 'xpath:', element.xpath);
        this._currentElement = element;
        const webview = this._panel.webview;
        this._panel.title = `XML Data View - ${element.label}`;
        this._panel.webview.html = this._getHtmlForWebview(webview, element);
    }

    private _getHtmlForWebview(webview: vscode.Webview, element: XmlElementItem) {
        const flattenedData = this.flattenElementData(element);
        
        // Debug: Log the flattened data being used in HTML
        console.log('Flattened data for HTML:');
        flattenedData.forEach(row => {
            console.log(`  HTML row: ${row.xpath} = "${row.data}"`);
        });
        
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
        .refresh-btn {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 8px 16px;
            border-radius: 3px;
            cursor: pointer;
            margin: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="left-panel">
            <div class="panel-header">
                Data Table
                <button class="save-all-btn" onclick="saveAll()">Save All Changes</button>
                <button class="refresh-btn" onclick="refreshTable()">Refresh from XML</button>
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
                        ${flattenedData.map(row => {
                            console.log(`HTML row XPath: ${row.xpath}`);
                            return `
                            <tr data-xpath="${row.xpath}">
                                <td>${row.path}</td>
                                <td>${row.attributes}</td>
                                <td><input type="text" class="editable" value="${row.data}" onchange="updateData('${row.xpath}', this.value)"></td>
                                <td><button class="save-btn" onclick="saveElement('${row.xpath}')">Save</button></td>
                            </tr>
                        `}).join('')}
                    </tbody>
                </table>
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
        
        function refreshTable() {
            vscode.postMessage({
                command: 'refreshTable'
            });
        }
        
        // Add click handlers for table rows to navigate to XML (but not on input fields)
        document.querySelectorAll('tbody tr').forEach(row => {
            row.addEventListener('click', function(event) {
                // Don't trigger navigation if clicking on input fields or buttons
                if (event.target.tagName === 'INPUT' || event.target.tagName === 'BUTTON') {
                    return;
                }
                
                const xpath = this.getAttribute('data-xpath');
                console.log('Navigation clicked with XPath:', xpath);
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
        
        // Debug: Log all generated XPaths
        console.log('Generated XPaths:');
        result.forEach(item => {
            console.log(`  ${item.xpath} = "${item.data}"`);
        });
        
        return result;
    }

    private flattenElement(element: XmlElementItem, parentPath: string, result: any[]) {
        const currentPath = parentPath ? `${parentPath}/${element.label}` : element.label;
        const elementText = this.getElementText(element.element);
        
        // Only add elements that have text content (not just container elements)
        if (elementText.trim()) {
            console.log(`Adding element: ${element.xpath} = "${elementText}"`);
            result.push({
                path: currentPath,
                xpath: element.xpath,
                attributes: this.getAttributesString(element.element),
                data: elementText
            });
        }

        // Use the same logic as XmlElementsProvider for consistency
        const children = element.element.childNodes;
        const tagCounts: { [key: string]: number } = {};

        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (child.nodeType === 1) { // Element node
                const childElement = child as any;
                const tagName = childElement.tagName;
                
                // Count this tag name (same logic as XmlElementsProvider)
                tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
                
                // Create XPath with index for multiple elements with same name (same logic as XmlElementsProvider)
                const childXPath = tagCounts[tagName] > 1 
                    ? `${element.xpath}/${tagName}[${tagCounts[tagName]}]`
                    : `${element.xpath}/${tagName}`;
                
                console.log(`Generated child XPath: ${childXPath} for tag ${tagName} (count: ${tagCounts[tagName]})`);
                
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
        // Get only direct text content, not inherited from children
        let text = '';
        for (let i = 0; i < element.childNodes.length; i++) {
            const child = element.childNodes[i];
            if (child.nodeType === 3) { // Text node
                text += child.nodeValue || '';
            }
        }
        return text.trim();
    }

    private getXmlContent(element: XmlElementItem): string {
        if (!this._originalXmlContent) {
            return `<!-- No XML content loaded -->`;
        }
        
        console.log('Original XML content length:', this._originalXmlContent.length);
        console.log('First 200 characters:', this._originalXmlContent.substring(0, 200));
        
        // Format the XML with syntax highlighting
        const highlighted = this.formatXmlWithHighlighting(this._originalXmlContent, element.xpath);
        
        // If highlighting didn't work, show raw XML
        if (highlighted === this._originalXmlContent) {
            return `<pre>${this._originalXmlContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`;
        }
        
        return highlighted;
    }

    private loadOriginalXmlContent(filePath: string): void {
        try {
            const fs = require('fs');
            this._originalXmlContent = fs.readFileSync(filePath, 'utf8');
        } catch (error) {
            console.error('Error loading original XML content:', error);
            this._originalXmlContent = '';
        }
    }

    private async openXmlEditor(filePath: string): Promise<void> {
        try {
            const document = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(document, vscode.ViewColumn.Two);
        } catch (error) {
            console.error('Error opening XML editor:', error);
        }
    }

    private formatXmlWithHighlighting(xmlContent: string, currentXPath: string): string {
        // Simple XML formatting with basic syntax highlighting
        let formatted = xmlContent
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/&lt;(\/?)([^&]*?)&gt;/g, '<span class="xml-tag">&lt;$1$2&gt;</span>')
            .replace(/&lt;!--([^&]*)--&gt;/g, '<span class="xml-comment">&lt;!--$1--&gt;</span>')
            .replace(/&lt;\?([^&]*?)\?&gt;/g, '<span class="xml-declaration">&lt;?$1?&gt;</span>');
        
        // Add line breaks for better readability
        formatted = formatted.replace(/\n/g, '<br>');
        
        return formatted;
    }

    private async saveElement(data: { xpath: string, value: string }) {
        try {
            console.log('SaveElement called with:', data);
            
            // Update the XML content with the new value
            await this.updateXmlContent(data.xpath, data.value);
            vscode.window.showInformationMessage(`Saved: ${data.xpath} = ${data.value}`);
        } catch (error) {
            console.error('SaveElement error:', error);
            vscode.window.showErrorMessage(`Error saving element: ${error}`);
        }
    }

    private async saveAll() {
        try {
            // Apply all pending changes
            for (const [xpath, value] of this._pendingChanges) {
                await this.updateXmlContent(xpath, value);
            }
            this._pendingChanges.clear();
            vscode.window.showInformationMessage('All changes saved successfully!');
        } catch (error) {
            vscode.window.showErrorMessage(`Error saving all changes: ${error}`);
        }
    }

    private async navigateToElement(xpath: string) {
        try {
            vscode.window.showInformationMessage(`Navigating to: ${xpath}`);
            
            // Find the element in the XML document
            const fs = require('fs');
            const DOMParser = require('xmldom').DOMParser;
            
            const xmlContent = fs.readFileSync(this._currentElement!.filePath, 'utf8');
            const parser = new DOMParser();
            const doc = parser.parseFromString(xmlContent, 'text/xml');
            
            const element = this.findElementByXPath(doc, xpath);
            if (element) {
                console.log(`Found element for navigation: ${element.tagName}, text: "${element.textContent}"`);
                
                // Open the XML file
                const document = await vscode.workspace.openTextDocument(this._currentElement!.filePath);
                const editor = await vscode.window.showTextDocument(document, vscode.ViewColumn.Two);
                
                // Find the element text in the XML content
                const elementText = element.textContent || '';
                const elementTag = element.tagName;
                
                // Search for the element tag and text in the XML content
                const searchPattern = new RegExp(`<${elementTag}[^>]*>\\s*([^<]*)</${elementTag}>`, 'g');
                let match;
                let foundPosition = -1;
                
                while ((match = searchPattern.exec(xmlContent)) !== null) {
                    if (match[1].trim() === elementText.trim()) {
                        foundPosition = match.index;
                        break;
                    }
                }
                
                if (foundPosition !== -1 && match) {
                    // Calculate line and character positions
                    const startLine = this.getLineNumberFromPosition(xmlContent, foundPosition);
                    const startChar = this.getCharacterInLine(xmlContent, foundPosition);
                    
                    // Create a range for the entire element
                    const endPosition = foundPosition + match[0].length;
                    const endLine = this.getLineNumberFromPosition(xmlContent, endPosition);
                    const endChar = this.getCharacterInLine(xmlContent, endPosition);
                    
                    const range = new vscode.Range(
                        new vscode.Position(startLine, startChar),
                        new vscode.Position(endLine, endChar)
                    );
                    
                    // Highlight the element
                    editor.selection = new vscode.Selection(range.start, range.end);
                    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
                    
                    console.log(`Highlighted element at line ${startLine}, char ${startChar} to line ${endLine}, char ${endChar}`);
                } else {
                    console.log('Could not find element text in XML content');
                }
            } else {
                console.log(`Element not found for XPath: ${xpath}`);
            }
        } catch (error) {
            console.error('Error navigating to element:', error);
            vscode.window.showErrorMessage(`Error navigating to element: ${error}`);
        }
    }

    private getTextBeforeElement(doc: any, element: any): string {
        // Get all text content before this element
        const serializer = require('xmldom').XMLSerializer;
        const xmlSerializer = new serializer();
        
        // Create a temporary document with content up to this element
        const tempDoc = doc.cloneNode(true);
        
        // Find the element in the temp document by traversing the same path
        let tempElement = tempDoc.documentElement;
        let currentElement = doc.documentElement;
        
        // Navigate to the same element in the temp document
        while (currentElement !== element && currentElement.parentNode) {
            const parent = currentElement.parentNode;
            const index = Array.from(parent.childNodes).indexOf(currentElement);
            if (index >= 0 && tempElement.parentNode) {
                tempElement = tempElement.parentNode.childNodes[index];
            }
            currentElement = parent;
        }
        
        if (tempElement) {
            // Remove everything after this element
            let node = tempElement.nextSibling;
            while (node) {
                const nextNode = node.nextSibling;
                tempElement.parentNode.removeChild(node);
                node = nextNode;
            }
            
            return xmlSerializer.serializeToString(tempDoc);
        }
        
        return '';
    }

    private getLineNumberFromPosition(text: string, position: number): number {
        return text.substring(0, position).split('\n').length - 1;
    }

    private getCharacterInLine(text: string, position: number): number {
        const lines = text.substring(0, position).split('\n');
        return lines[lines.length - 1].length;
    }

    private async refreshTable() {
        try {
            vscode.window.showInformationMessage('Refreshing table from XML...');
            
            if (this._currentElement) {
                // Reload the XML content from file
                this.loadOriginalXmlContent(this._currentElement.filePath);
                
                // Update the table with fresh data
                this.update(this._currentElement);
                
                vscode.window.showInformationMessage('Table refreshed successfully!');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error refreshing table: ${error}`);
        }
    }

    private async updateXmlContent(xpath: string, newValue: string): Promise<void> {
        try {
            console.log(`Updating XML content for XPath: ${xpath} with value: ${newValue}`);
            
            if (!this._currentElement) {
                throw new Error('No current element set');
            }
            
            const fs = require('fs');
            const DOMParser = require('xmldom').DOMParser;
            const XMLSerializer = require('xmldom').XMLSerializer;

            // Read current XML content
            const xmlContent = fs.readFileSync(this._currentElement.filePath, 'utf8');
            console.log('Current XML content length:', xmlContent.length);
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(xmlContent, 'text/xml');
            console.log('Parsed XML document, root element:', doc.documentElement.tagName);

            // Find element by XPath
            const element = this.findElementByXPath(doc, xpath);
            if (element) {
                console.log(`Found element: ${element.tagName}, current text: "${element.textContent}"`);
                
                // Update text content
                element.textContent = newValue;
                console.log(`Updated text content to: "${element.textContent}"`);
                
                // Write back to file
                const serializer = new XMLSerializer();
                const updatedXml = serializer.serializeToString(doc);
                console.log('Serialized XML length:', updatedXml.length);
                
                fs.writeFileSync(this._currentElement.filePath, updatedXml, 'utf8');
                console.log('XML file updated successfully');
                
                // Update our cached content
                this._originalXmlContent = updatedXml;
            } else {
                throw new Error(`Element not found: ${xpath}`);
            }
        } catch (error) {
            console.error('Error updating XML content:', error);
            throw error;
        }
    }

    private findElementByXPath(doc: any, xpath: string): any {
        try {
            console.log('Finding element by XPath:', xpath);
            
            // Use a simpler approach: find by text content and tag name
            const parts = xpath.split('/').filter(part => part.length > 0);
            const targetTag = parts[parts.length - 1]; // Last part is the target element
            
            // Remove index from target tag if present
            const cleanTag = targetTag.includes('[') ? targetTag.split('[')[0] : targetTag;
            
            console.log(`Looking for tag: ${cleanTag} in XPath: ${xpath}`);
            
            // Get all elements with this tag name
            const allElements = doc.getElementsByTagName(cleanTag);
            console.log(`Found ${allElements.length} elements with tag ${cleanTag}`);
            
            // Find the one that matches our XPath by checking its path
            for (let i = 0; i < allElements.length; i++) {
                const element = allElements[i];
                const elementXPath = this.getElementXPath(element);
                console.log(`Checking element ${i}: ${elementXPath}`);
                
                if (elementXPath === xpath) {
                    console.log(`Found matching element: ${element.tagName}, text: "${element.textContent}"`);
                    return element;
                }
            }
            
            console.log(`No element found matching XPath: ${xpath}`);
            return null;
        } catch (error) {
            console.error('Error in findElementByXPath:', error);
            return null;
        }
    }

    private getElementXPath(element: any): string {
        const path: string[] = [];
        let current = element;
        
        while (current && current.nodeType === 1) {
            const tagName = current.tagName;
            const parent = current.parentNode;
            
            if (parent && parent.nodeType === 1) {
                // Count siblings with same tag name
                const siblings = Array.from(parent.childNodes).filter((child: any) => 
                    child.nodeType === 1 && child.tagName === tagName
                );
                const index = siblings.indexOf(current) + 1;
                
                if (siblings.length > 1) {
                    path.unshift(`${tagName}[${index}]`);
                } else {
                    path.unshift(tagName);
                }
            } else {
                path.unshift(tagName);
            }
            
            current = parent;
        }
        
        return '/' + path.join('/');
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