import * as vscode from 'vscode';
import * as fs from 'fs';

export class fileFetch {

    public static webPanel : vscode.WebviewPanel | undefined;

    // USE THIS WHEN USING "showOpenDialog()" TO PROMPT USER FOR FILE
    public static dialogOptions: vscode.OpenDialogOptions = {
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
            'HTML': ['html'],
            'Python': ['py', 'pyc']
        }
    }

    public static findDocsFile(typeAddress: string, context : vscode.ExtensionContext) : string {
        const pathDir = vscode.Uri.file(fs.realpathSync(vscode.Uri.joinPath(context.extensionUri, 'media/blender_python_reference_4_3/').path));
        let retValue;

        const files = fs.readdirSync(pathDir.path);
        files.forEach(function (file) {
            if (file.match(/bpy\..*\.html/)) {
                if (file.replace(/\.html/, "") == typeAddress) {
                    retValue = file;
                }
            }
        });
        if (retValue) {
            return retValue;
        }
        else if (typeAddress == "bpy") {
            throw new DOMException("could not find file for type.");
        } else {
            return fileFetch.findDocsFile(typeAddress.replace(/\.(?!.*\.).*/, ""), context);
        }
    }

    public static openFile(filepath: string, context : vscode.ExtensionContext) {
        // vscode.workspace.openTextDocument(path).then( document => vscode.window.showTextDocument(document, { preview: false }));
        const pathDir = vscode.Uri.file(fs.realpathSync(vscode.Uri.joinPath(context.extensionUri, 'media/blender_python_reference_4_3/').path));
        if (fileFetch.webPanel == undefined) {
            fileFetch.webPanel = vscode.window.createWebviewPanel("docExplorer","View Documentation", 
                {
                    viewColumn: vscode.ViewColumn.Active,
                    preserveFocus: true
                },
                {
                    enableScripts: false,
                    localResourceRoots:  [vscode.Uri.joinPath(context.extensionUri, '../'), 
                                        vscode.Uri.joinPath(context.extensionUri, 'media'),
                                        vscode.Uri.joinPath(context.extensionUri, 'media/blender_python_reference_4_3/'),
                                        vscode.Uri.file(fs.realpathSync(pathDir.path))]
                }
            )
            fileFetch.webPanel.onDidDispose(() => { fileFetch.webPanel = undefined; }); 
        }
        // var dat = fs.readFileSync(filepath, 'utf8')
        var dat = fs.readFileSync(vscode.Uri.joinPath(pathDir, filepath).with({scheme: 'vscode-resource'}).fsPath, "utf-8");
        dat = dat
            .replace(/(?<=\/css\" href=\")(.*?)(?=\")/g, 
                fileFetch.webPanel.webview.asWebviewUri(vscode.Uri.file(fs.realpathSync(pathDir.path)))+"/$1");

        dat = dat
            .replace(/<body>(.*?)(?=<h1>)/s, "<body>")
            .replace(/(<\/dl>(?!.*<\/dl>))(.*?)<\/html>/s, "</dl></html>");
        fileFetch.webPanel.webview.html = dat;
    }
}