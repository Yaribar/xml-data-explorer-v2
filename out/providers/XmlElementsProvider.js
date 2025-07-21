"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XmlElementsProvider = exports.XmlElementItem = void 0;
const vscode = require("vscode");
const fs = require("fs");
const xmldom_1 = require("xmldom");
class XmlElementItem extends vscode.TreeItem {
    constructor(label, collapsibleState, element, xpath, filePath) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.element = element;
        this.xpath = xpath;
        this.filePath = filePath;
        this.tooltip = xpath;
        this.description = this.getAttributeDescription();
        this.iconPath = new vscode.ThemeIcon('symbol-class');
        this.contextValue = 'xmlElement';
    }
    getAttributeDescription() {
        const attributes = this.element.attributes;
        if (attributes && attributes.length > 0) {
            const attrArray = Array.from(attributes).map((attr) => `${attr.name}="${attr.value}"`);
            return attrArray.join(' ');
        }
        return '';
    }
}
exports.XmlElementItem = XmlElementItem;
class XmlElementsProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.currentXmlFile = null;
        this.xmlDocument = null;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    setXmlFile(filePath) {
        this.currentXmlFile = filePath;
        this.loadXmlDocument(filePath);
        this.refresh();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!this.currentXmlFile || !this.xmlDocument) {
            return Promise.resolve([]);
        }
        if (element) {
            return this.getChildElements(element);
        }
        else {
            return this.getRootElements();
        }
    }
    async loadXmlDocument(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const parser = new xmldom_1.DOMParser();
            this.xmlDocument = parser.parseFromString(content, 'text/xml');
        }
        catch (error) {
            console.error('Error loading XML document:', error);
            this.xmlDocument = null;
        }
    }
    getRootElements() {
        if (!this.xmlDocument) {
            return Promise.resolve([]);
        }
        const rootElements = [];
        const root = this.xmlDocument.documentElement;
        if (root) {
            const rootItem = new XmlElementItem(root.tagName, this.hasChildElements(root) ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None, root, `/${root.tagName}`, this.currentXmlFile);
            rootElements.push(rootItem);
        }
        return Promise.resolve(rootElements);
    }
    getChildElements(parentElement) {
        const children = [];
        const element = parentElement.element;
        // Count occurrences of each tag name to create proper XPath indices
        const tagCounts = {};
        for (let i = 0; i < element.childNodes.length; i++) {
            const child = element.childNodes[i];
            if (child.nodeType === 1) { // Element node
                const childElement = child;
                const tagName = childElement.tagName;
                // Count this tag name
                tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
                // Create XPath with index for multiple elements with same name
                const childXPath = tagCounts[tagName] > 1
                    ? `${parentElement.xpath}/${tagName}[${tagCounts[tagName]}]`
                    : `${parentElement.xpath}/${tagName}`;
                const childItem = new XmlElementItem(childElement.tagName, this.hasChildElements(childElement) ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None, childElement, childXPath, this.currentXmlFile);
                children.push(childItem);
            }
        }
        return Promise.resolve(children);
    }
    hasChildElements(element) {
        for (let i = 0; i < element.childNodes.length; i++) {
            if (element.childNodes[i].nodeType === 1) { // Element node
                return true;
            }
        }
        return false;
    }
}
exports.XmlElementsProvider = XmlElementsProvider;
//# sourceMappingURL=XmlElementsProvider.js.map