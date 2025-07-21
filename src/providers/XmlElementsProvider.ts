import * as vscode from 'vscode';
import * as fs from 'fs';
import { DOMParser } from 'xmldom';

// Use DOM types from xmldom
type Element = any;
type Document = any;

export class XmlElementItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly element: Element,
        public readonly xpath: string,
        public readonly filePath: string
    ) {
        super(label, collapsibleState);
        this.tooltip = xpath;
        this.description = this.getAttributeDescription();
        this.iconPath = new vscode.ThemeIcon('symbol-class');
        this.contextValue = 'xmlElement';
    }

    private getAttributeDescription(): string {
        const attributes = this.element.attributes;
        if (attributes && attributes.length > 0) {
            const attrArray = Array.from(attributes).map((attr: any) => `${attr.name}="${attr.value}"`);
            return attrArray.join(' ');
        }
        return '';
    }
}

export class XmlElementsProvider implements vscode.TreeDataProvider<XmlElementItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<XmlElementItem | undefined | null | void> = new vscode.EventEmitter<XmlElementItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<XmlElementItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private currentXmlFile: string | null = null;
    private xmlDocument: Document | null = null;

    constructor() {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    setXmlFile(filePath: string): void {
        this.currentXmlFile = filePath;
        this.loadXmlDocument(filePath);
        this.refresh();
    }

    getTreeItem(element: XmlElementItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: XmlElementItem): Thenable<XmlElementItem[]> {
        if (!this.currentXmlFile || !this.xmlDocument) {
            return Promise.resolve([]);
        }

        if (element) {
            return this.getChildElements(element);
        } else {
            return this.getRootElements();
        }
    }

    private async loadXmlDocument(filePath: string): Promise<void> {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const parser = new DOMParser();
            this.xmlDocument = parser.parseFromString(content, 'text/xml');
        } catch (error) {
            console.error('Error loading XML document:', error);
            this.xmlDocument = null;
        }
    }

    private getRootElements(): Promise<XmlElementItem[]> {
        if (!this.xmlDocument) {
            return Promise.resolve([]);
        }

        const rootElements: XmlElementItem[] = [];
        const root = this.xmlDocument.documentElement;
        
        if (root) {
            const rootItem = new XmlElementItem(
                root.tagName,
                this.hasChildElements(root) ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                root,
                `/${root.tagName}`,
                this.currentXmlFile!
            );
            rootElements.push(rootItem);
        }

        return Promise.resolve(rootElements);
    }

    private getChildElements(parentElement: XmlElementItem): Promise<XmlElementItem[]> {
        const children: XmlElementItem[] = [];
        const element = parentElement.element;

        for (let i = 0; i < element.childNodes.length; i++) {
            const child = element.childNodes[i];
            
            if (child.nodeType === 1) { // Element node
                const childElement = child as Element;
                const childXPath = `${parentElement.xpath}/${childElement.tagName}`;
                
                const childItem = new XmlElementItem(
                    childElement.tagName,
                    this.hasChildElements(childElement) ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                    childElement,
                    childXPath,
                    this.currentXmlFile!
                );
                children.push(childItem);
            }
        }

        return Promise.resolve(children);
    }

    private hasChildElements(element: Element): boolean {
        for (let i = 0; i < element.childNodes.length; i++) {
            if (element.childNodes[i].nodeType === 1) { // Element node
                return true;
            }
        }
        return false;
    }
} 