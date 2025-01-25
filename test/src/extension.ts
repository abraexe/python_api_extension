import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('test.extension', () => {
		vscode.window.showInformationMessage('test running :3');
	});
	
	const autofill = vscode.languages.registerCompletionItemProvider(
		'python',
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {

				const linePrefix = document.lineAt(position).text.slice(0, position.character);
				if (!linePrefix.endsWith('cat.')) {
					return undefined;
				}

				return [
					new vscode.CompletionItem('meow', vscode.CompletionItemKind.Method),
					new vscode.CompletionItem('miau', vscode.CompletionItemKind.Method),
				];
			}
		},
		'.'
	);
	context.subscriptions.push(disposable, autofill);
}