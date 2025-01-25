import * as vscode from 'vscode';

// interface to work with hard coded values until we get non hard coded values to test with
// hard coded values (except two) have been removed from this file before committing
interface Struct
{
    name: string;
    children: Struct[];
	return_type: Struct[];
}
const NULL : Struct = 
{
    name: "",
    children: [],
	return_type: []
};
const bpy : Struct =
{
    name: "bpy",
    children: [],
	return_type: []
};

function trav_children(node: Struct, token: string): Struct {
	let substring: string = node.name;
	while(node.children.length !== 0 && node.return_type.length === 0){
		if(token.endsWith(node.name + "."))
		{
			return node;
		}
		let flag: boolean = false;
		for (let child of node.children)
		{
			if(token.startsWith(substring + "." + child.name + ".")
				|| token.startsWith(substring + "." + child.name + "("))
			{
				flag = true;
				if(child.return_type.length !== 0)
				{
					// gonna code this assuming no functions will be nested in 
					// other functions because that would be mega mean
					let token_end: string = token.substring(substring.length);
					let child_string: string = token_end.substring(token_end.indexOf(child.name), token_end.indexOf(")")+1);
	
					token = token.substring(0,substring.length) + "." + child.return_type[0].name + token.substring(substring.length + child_string.length + 1);
					substring += "." + child.return_type[0].name;
					node = child.return_type[0];

					if(token.endsWith(child.return_type[0].name + "."))
					{
						return child.return_type[0];
					}
				}
				else
				{
					substring += "." + child.name;
					node = child;

					if(token.endsWith(child.name + "."))
					{
						return child;
					}
				}
			}
		}
		if(!flag){
			return NULL;
		}
	}
	return node;
}

export function activate(context: vscode.ExtensionContext) {
	const popup = vscode.commands.registerCommand('test.extension', () => {
		vscode.window.showInformationMessage('test running :3');
	});
	
	const completion = vscode.languages.registerCompletionItemProvider(
		'python',
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {

				const line = document.lineAt(position).text.slice(0, position.character);
				let token: string = line.substring(line.lastIndexOf(" ")+1, position.character);

				if (token.startsWith('bpy.')) {
					let node: Struct = trav_children(bpy, token);
					let arr: vscode.CompletionItem[] = [];
					if(node !== NULL){
						node.children.forEach(function (child) {
							arr.push(new vscode.CompletionItem(child.name));
						});
					}
					return arr;
				}
				return undefined;
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