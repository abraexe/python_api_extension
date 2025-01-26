// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { fileFetch } from './fileFetch';
import { NodeDependenciesProvider } from './documentationTreeProvider';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// ===== TREE VIEW =======
	const rootPath = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
    ? vscode.workspace.workspaceFolders[0].uri.fsPath
    : undefined;

	if (rootPath === undefined) {
		vscode.window.showErrorMessage("There is no open workspace to search. Open a folder to begin.");
	} else {
		let treeProvider = new NodeDependenciesProvider(rootPath);
		vscode.window.registerTreeDataProvider(
			'nodeDependencies',
			treeProvider
		  );
		context.subscriptions.push(vscode.window.createTreeView('nodeDependencies', {
			treeDataProvider: treeProvider
		  }));
	}

	
	// ======= OPEN A FILE IN TEXT EDITOR =======
	context.subscriptions.push(vscode.commands.registerCommand('test.disassemble', async () => {
		// This function is a mess
		let result;
		await vscode.window.showOpenDialog(fileFetch.dialogOptions).then(m => result = m);
		if (result === undefined) {
			vscode.window.showErrorMessage("File not found!");
		}
		else {
			let uri: vscode.Uri = result;
			fileFetch.openFile(uri.toString().substring(7));
		}
		
	}));
}

// This method is called when your extension is deactivated
export function deactivate() {}
