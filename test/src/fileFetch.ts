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

    public static openFile(path: string) {
        vscode.workspace.openTextDocument(path).then( document => vscode.window.showTextDocument(document, { preview: false }));
    }
}