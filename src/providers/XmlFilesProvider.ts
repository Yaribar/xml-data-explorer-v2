import * as vscode from 'vscode';
import * as path from 'path';

export class XmlFileItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly filePath: string
    ) {
        super(label, collapsibleState);
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

export class XmlFilesProvider implements vscode.TreeDataProvider<XmlFileItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<XmlFileItem | undefined | null | void> = new vscode.EventEmitter<XmlFileItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<XmlFileItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor() {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: XmlFileItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: XmlFileItem): Thenable<XmlFileItem[]> {
        if (element) {
            return Promise.resolve([]);
        }

        return this.getXmlFiles();
    }

    private async getXmlFiles(): Promise<XmlFileItem[]> {
        const xmlFiles: XmlFileItem[] = [];
        
        try {
            const files = await vscode.workspace.findFiles('**/*.xml', '**/node_modules/**');
            
            for (const file of files) {
                const fileName = path.basename(file.fsPath);
                const xmlFile = new XmlFileItem(
                    fileName,
                    vscode.TreeItemCollapsibleState.None,
                    file.fsPath
                );
                xmlFiles.push(xmlFile);
            }
        } catch (error) {
            console.error('Error finding XML files:', error);
        }

        return xmlFiles;
    }
} 