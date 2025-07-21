"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XmlFilesProvider = exports.XmlFileItem = void 0;
const vscode = require("vscode");
const path = require("path");
class XmlFileItem extends vscode.TreeItem {
    constructor(label, collapsibleState, filePath) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.filePath = filePath;
        this.tooltip = filePath;
        this.description = path.basename(filePath);
        this.iconPath = new vscode.ThemeIcon('file-code');
        this.contextValue = 'xmlFile';
        this.command = {
            command: 'xmlExplorer.files.selectFile',
            title: 'Open XML File',
            arguments: [this]
        };
    }
}
exports.XmlFileItem = XmlFileItem;
class XmlFilesProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (element) {
            return Promise.resolve([]);
        }
        return this.getXmlFiles();
    }
    async getXmlFiles() {
        const xmlFiles = [];
        try {
            const files = await vscode.workspace.findFiles('**/*.xml', '**/node_modules/**');
            for (const file of files) {
                const fileName = path.basename(file.fsPath);
                const xmlFile = new XmlFileItem(fileName, vscode.TreeItemCollapsibleState.None, file.fsPath);
                xmlFiles.push(xmlFile);
            }
        }
        catch (error) {
            console.error('Error finding XML files:', error);
        }
        return xmlFiles;
    }
}
exports.XmlFilesProvider = XmlFilesProvider;
//# sourceMappingURL=XmlFilesProvider.js.map