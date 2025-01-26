import * as vscode from 'vscode';
import * as fs from 'fs';
import path from 'path';
import { arrayBuffer } from 'stream/consumers';

interface Dictionary {
	[key: string]: string
  }

interface Module {
	name: string;
	attributes: Dictionary;
	s_attributes: Dictionary;
	methods: Dictionary;
	s_methods: Dictionary;
	functions: Dictionary;
};

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

function parse_modules(dump: Object): Module[] {
	const reserved = [String('EXT_ATTRIBUTES'), String('EXT_STATIC_ATTRIBUTES'), String('EXT_METHODS'), 
		String('EXT_STATIC_METHODS'), 'EXT_FUNCTIONS'];
	let arr : Module[] = [];
	for(let j=0; j < Object.values(dump).length; j++)
	{
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
		}
	}
	return arr;
}

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

export function activate(context: vscode.ExtensionContext) {

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
	// // layer 1: step down from bpy
	// //let types_bpy : Object = Object.values(dump)[0]; etc
	// // layer 2: step down from types: collection of modules usually, different for utils, etc
	// // implicit in function calls
	// // layer 3: modules
	let modules : Module[] = parse_modules(Object.values(Object.values(dump)[0]));
	
	const completion = vscode.languages.registerCompletionItemProvider(
		'python',
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {

				const line = document.lineAt(position).text.slice(0, position.character);
				let token: string = line.substring(line.lastIndexOf(" ")+1, position.character);

				if (token.startsWith('bpy.types.ParticleSystem.')) {
					console.log("completion if");
					let arr: vscode.CompletionItem[] = [];
					Object.keys(modules[0].attributes).forEach(function (child) {
						arr.push(new vscode.CompletionItem(child, vscode.CompletionItemKind.Property));
					});
					Object.keys(modules[0].s_attributes).forEach(function (child) {
						arr.push(new vscode.CompletionItem(child, vscode.CompletionItemKind.Property));
					});
					Object.keys(modules[0].methods).forEach(function (child) {
						arr.push(new vscode.CompletionItem(child, vscode.CompletionItemKind.Method));
					});
					Object.keys(modules[0].s_methods).forEach(function (child) {
						arr.push(new vscode.CompletionItem(child, vscode.CompletionItemKind.Method));
					});
					Object.keys(modules[0].functions).forEach(function (child) {
						arr.push(new vscode.CompletionItem(child, vscode.CompletionItemKind.Method));
					});
					// old from before
					// let node: Struct = trav_children(bpy, token);
					// let arr: vscode.CompletionItem[] = [];
					// if(node !== NULL){
					// 	node.children.forEach(function (child) {
					// 		arr.push(new vscode.CompletionItem(child.name));
					// 	});
					// }
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