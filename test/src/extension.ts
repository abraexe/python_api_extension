import * as vscode from 'vscode';
import { fileFetch } from './fileFetch';
import { NodeDependenciesProvider } from './documentationTreeProvider';
import * as fs from 'fs';
import path from 'path';

interface Dictionary {
	[key: string]: string
  }

interface Layer {
	module: Module;
	children: Module[];
}

interface Module {
	name: string;
	attributes: Dictionary;
	s_attributes: Dictionary;
	methods: Dictionary;
	s_methods: Dictionary;
	functions: Dictionary;
};

function parse_modules(dump: Object): Layer[] {
	let parsed : Layer[] = [];
	const reserved = [String('EXT_ATTRIBUTES'), String('EXT_STATIC_ATTRIBUTES'), String('EXT_METHODS'), 
		String('EXT_STATIC_METHODS'), 'EXT_FUNCTIONS'];
	const layers = ['types', 'ops', 'context', 'app', 'msgbus', 'utils', 'path', 'props', 'data'];
	for(let j=0; j < Object.values(dump).length; j++)
	{
		let l : Layer = {
			module : {
				name: layers[j],
				attributes: Object.values(dump)[j],
				s_attributes: Object.values(dump)[j],
				methods: Object.values(dump)[j],
				s_methods: Object.values(dump)[j],
				functions: Object.values(dump)[j],
			},
			children: []
		};
		let arr : Module[] = [];
		for(let i=0; i<Object.values(Object.values(dump)[j]).length; i++)
		{
			let key : string = Object.keys(Object.values(dump)[j])[i];
	 		let value : Object = Object(Object.values(Object.values(dump)[j])[i]);
	 		if(reserved.indexOf(key)===-1){
				let m : Module = {
					name: key,
					attributes: Object.values(value)[0] as Dictionary,
					s_attributes: Object.values(value)[1] as Dictionary,
					methods: Object.values(value)[2] as Dictionary,
					s_methods: Object.values(value)[3] as Dictionary,
					functions: Object.values(value)[4] as Dictionary,
				};
				arr.push(m);
	 		}
			else{
				if(key==="EXT_ATTRIBUTES"&&value!==null)
				{
					l.module.attributes = Object((value)) as Dictionary;
				}
				else if(key==="EXT_STATIC_ATTRIBUTES")
				{
					l.module.s_attributes = Object((value)) as Dictionary;
				}
				else if(key==="EXT_METHODS")
				{
					l.module.methods = Object((value)) as Dictionary;
				}
				else if(key==="EXT_STATIC_METHODS")
				{
					l.module.s_methods = Object((value)) as Dictionary;
				}
				else if(key==="EXT_FUNCTIONS")
				{
					l.module.functions = Object((value)) as Dictionary;
				}
			}
		}
		l.children = arr;
		parsed.push(l);
	}
	return parsed;
}

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
			fileFetch.openFile(uri.toString().substring(7), context);
		}
		
	}));
	const popup = vscode.commands.registerCommand('test.extension', () => {
		vscode.window.showInformationMessage('test running :3');
	});

	let raw_data : string = "";
	try {
		raw_data = fs.readFileSync(path.join(__dirname, '../data.json'), 'utf8');
	} catch (err) {
		console.error(err);
	}

	let dump : Object = JSON.parse(raw_data);
	let data : Layer[] = parse_modules(Object.values(Object.values(dump)[0]));
	console.log(data);
	
	const completion = vscode.languages.registerCompletionItemProvider(
		'python',
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {

				const line = document.lineAt(position).text.slice(0, position.character);
				let token: string = line.substring(line.lastIndexOf(" ")+1, position.character);
				let arr: vscode.CompletionItem[] = [];

				// to do : add some flags if found stuff since returning doesn't short circuit anymore,
				// will make stuff faster
				if (token.startsWith('bpy.')) {
					if(token.endsWith('bpy.')){
						data.forEach(function (child) {
							arr.push(new vscode.CompletionItem(child.module.name, vscode.CompletionItemKind.Property));
						});
					}
					else{
						data.forEach(function (child) {
						if(token.startsWith('bpy.' + child.module.name + ".")){
							if(token.endsWith('bpy.' + child.module.name + ".")){
								Object.keys(child.module.attributes).forEach(function (gchild) {
									arr.push(new vscode.CompletionItem(gchild, vscode.CompletionItemKind.Property));
								});
								Object.keys(child.module.s_attributes).forEach(function (gchild) {
									arr.push(new vscode.CompletionItem(gchild, vscode.CompletionItemKind.Property));
								});
								Object.keys(child.module.methods).forEach(function (gchild) {
									arr.push(new vscode.CompletionItem(gchild, vscode.CompletionItemKind.Method));
								});
								Object.keys(child.module.s_methods).forEach(function (gchild) {
									arr.push(new vscode.CompletionItem(gchild, vscode.CompletionItemKind.Method));
								});
								Object.keys(child.module.functions).forEach(function (gchild) {
									arr.push(new vscode.CompletionItem(gchild, vscode.CompletionItemKind.Method));
								});
								child.children.forEach(function (gchild) {
									arr.push(new vscode.CompletionItem(gchild.name, vscode.CompletionItemKind.Property));
								});
							}
							else{
								// this is probably a task for morning abra
							}
						}
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

// interfaces to work with hard coded values from before we got hardcoded values to test with
// interface Struct
// {
//     name: string;
//     children: Struct[];
// 	return_type: Struct[];
// }
// const NULL : Struct = 
// {
//     name: "",
//     children: [],
// 	return_type: []
// };
// const bpy : Struct =
// {
//     name: "bpy",
//     children: [],
// 	return_type: []
// };
// old from before
// function trav_children(node: Struct, token: string): Struct {
// 	let substring: string = node.name;
// 	while(node.children.length !== 0 && node.return_type.length === 0){
// 		if(token.endsWith(node.name + "."))
// 		{
// 			return node;
// 		}
// 		let flag: boolean = false;
// 		for (let child of node.children)
// 		{
// 			if(token.startsWith(substring + "." + child.name + ".")
// 				|| token.startsWith(substring + "." + child.name + "("))
// 			{
// 				flag = true;
// 				if(child.return_type.length !== 0)
// 				{
// 					// to do : make this work if functions are nested in one another
// 					let token_end: string = token.substring(substring.length);
// 					let child_string: string = token_end.substring(token_end.indexOf(child.name), token_end.indexOf(")")+1);
	
// 					token = token.substring(0,substring.length) + "." + child.return_type[0].name + token.substring(substring.length + child_string.length + 1);
// 					substring += "." + child.return_type[0].name;
// 					node = child.return_type[0];

// 					if(token.endsWith(child.return_type[0].name + "."))
// 					{
// 						return child.return_type[0];
// 					}
// 				}
// 				else
// 				{
// 					substring += "." + child.name;
// 					node = child;

// 					if(token.endsWith(child.name + "."))
// 					{
// 						return child;
// 					}
// 				}
// 			}
// 		}
// 		if(!flag){
// 			return NULL;
// 		}
// 	}
// 	return node;
// }