import * as vscode from 'vscode';
export class fileFetch {

    // USE THIS WHEN USING "showOpenDialog()" TO PROMPT USER FOR FILE
    public static dialogOptions: vscode.OpenDialogOptions = {
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
            'Python': ['py', 'pyc'],
            'HTML': ['html']
        }
    }

    public static openFile(path: string, context : vscode.ExtensionContext) {
        // vscode.workspace.openTextDocument(path).then( document => vscode.window.showTextDocument(document, { preview: false }));
        vscode.window.createWebviewPanel("docExplorer","View Documentation", 
            {
                viewColumn: vscode.ViewColumn.Active,
                preserveFocus: true
            },
            {
                enableScripts: false,
                localResourceRoots:  [vscode.Uri.joinPath(context.extensionUri, '../'), vscode.Uri.joinPath(context.extensionUri, '../media')]
            }
        )
    }
}