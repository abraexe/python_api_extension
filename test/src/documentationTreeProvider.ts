import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { json } from 'stream/consumers';

export class NodeDependenciesProvider implements vscode.TreeDataProvider<DocsItem> {
    constructor(private workspaceRoot: string) {}

    getTreeItem(element: DocsItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: DocsItem): DocsItem[] {
        if (!this.workspaceRoot) {
            vscode.window.showInformationMessage('No documentation JSON in an empty workspace');
            return [];
        }

        if (element) {
            return this.scanDocsJson(element.pos);
        }
        // Limitations:
        // 1. It must be named 'docs.json'
        // 2. It must be in the main workspace directory
        // 3. Because of 1, there can only be one documentation file.
        const jsonPath = path.join(this.workspaceRoot, 'docs.json');

        if (!this.pathExists(jsonPath)) {
            vscode.window.showInformationMessage('Workspace has no docs.json in top directory');
            return [];
        }
        const docsJson = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

        return this.scanDocsJson(docsJson);
    }

    private scanDocsJson(docsJson: Object): DocsItem[] {
        var treeItems: DocsItem[] = [];

        scanJsonActual(docsJson, undefined);

        // ** Magic Recurive JSON parse **
        function scanJsonRecur(pos: any, prev: any) {
            if (typeof pos == 'string') 
                treeItems.push(new DocsItem(pos, "", pos, vscode.TreeItemCollapsibleState.None));
            else if (pos) {                
                Object.keys(pos).map(item => {
                    console.log(pos);
                    console.log(typeof pos);
                    
                    treeItems.push(new DocsItem(item, "", pos[item], vscode.TreeItemCollapsibleState.Collapsed));

                    scanJsonRecur(pos[item], pos);
                }) 
            }
        }

        // DONT ASK ME WHY
        function scanJsonActual(pos: any, prev: any) {
            if (typeof pos == 'string') 
                treeItems.push(new DocsItem(pos, "", pos, vscode.TreeItemCollapsibleState.None));
            else if (pos) {                
                Object.keys(pos).map(item => {
                    console.log(pos);
                    console.log(typeof pos);
                    
                    if (typeof pos[item] == 'string' || Object.keys(pos[item]).length == 0)
                        treeItems.push(new DocsItem(item, pos[item], pos[item], vscode.TreeItemCollapsibleState.None));
                    else
                        treeItems.push(new DocsItem(item, "", pos[item], vscode.TreeItemCollapsibleState.Collapsed));
                }) 
            }
        }

        return treeItems;
    }
    

    private pathExists(path: string): boolean {
        try {
            fs.accessSync(path);
        } catch (e) {
            return false;
        }
        return true;
    }
}

/*

class Dependency extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    private version: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    this.tooltip = `${this.label}-${this.version}`;
    this.description = this.version;
  }

  iconPath = {
    light: vscode.Uri.parse(path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg')),
    dark: vscode.Uri.parse(path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg'))
  };
}*/

class DocsItem extends vscode.TreeItem {
    constructor( public readonly label: string, public readonly type: string, public readonly pos: Object, public readonly collapsibleState: vscode.TreeItemCollapsibleState) {
        super(label, collapsibleState);
        this.tooltip = this.label + " " + this.type;
        this.description = this.type;
        this.posInJson = this.pos;
    }
    public posInJson: Object;
}
