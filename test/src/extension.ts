import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	const popup = vscode.commands.registerCommand('test.extension', () => {
		vscode.window.showInformationMessage('test running :3');
	});
	
	const completion = vscode.languages.registerCompletionItemProvider(
		'python',
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {

				const linePrefix = document.lineAt(position).text.slice(0, position.character);
				if (!linePrefix.endsWith('sample.')) {
					return undefined;
				}

				return [
					new vscode.CompletionItem('fill', vscode.CompletionItemKind.Method),
					new vscode.CompletionItem('complete', vscode.CompletionItemKind.Method),
				];
			}
		},
		'.'
	);
	const hover = vscode.languages.registerHoverProvider(
		'python', 
		{
			provideHover(document, position, token) {
				const range = document.getWordRangeAtPosition(position);
				const word = document.getText(range);
				const line = document.lineAt(position).text;
				if (word === "join" && line.search("os.path.")!==-1) {
					return new vscode.Hover({
						language: "python",
						value: "hover"
					});
				}
			}
    	}
	);
	context.subscriptions.push(popup, completion);
}