import * as vscode from 'vscode';
import { fileFetch} from './fileFetch';
import { DocumentationTreeProvider } from './documentationTreeProvider';
import * as fs from 'fs';
import path from 'path';

interface Dictionary {
	[key: string]: string
}

interface Dictionary_Module {
	[key: string]: Module
}

interface Layer {
	module: Module;
	children: Dictionary_Module;
}

interface Module {
	name: string;
	attributes: Dictionary;
	s_attributes: Dictionary;
	methods: Dictionary;
	s_methods: Dictionary;
	functions: Dictionary;
};

function importTextFileSync(filePath: string): string {
	return fs.readFileSync(fs.realpathSync(filePath), 'utf-8');
}

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
			children: {}
		};
		let arr : Dictionary_Module = {};
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
				arr[m.name] = m;
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

	const findreference = vscode.commands.registerCommand('blendev.find', () => {
		const editor = vscode.window.activeTextEditor;
		const position = editor?.selection.active;
		const document = editor?.document;
		if (editor && position && document) {
			var clausePos = position;
			var clause = document.getText(document.getWordRangeAtPosition(position));
			var oldClause = clause;
			let clauses = [clause];
			var fileAddress = "";
			var pyName = "";

			while (clause !== "bpy") {
				clausePos = clausePos.translate(0, -1);
				clause = document.getText(document.getWordRangeAtPosition(clausePos));
				if (clause != oldClause) {
					oldClause = clause;
					clauses.unshift(clause);
				}
			}

			if (clauses.length == 3) {
				fileAddress = clauses.join('.');
				pyName = clauses[2];
			}
			if (clauses.length == 4) {
				fileAddress = clauses.join('.');
				pyName = clauses[3];
			}

			fileFetch.openFile(fileFetch.findDocsFile(clauses.join('.'), context), context);
		}
	})

	// ===== TREE VIEW =======
	const rootPath = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
	? vscode.workspace.workspaceFolders[0].uri.fsPath
	: undefined;

	if (rootPath === undefined) {
	 	vscode.window.showErrorMessage("There is no open workspace to search. Open a folder to begin.");
	} 
	else {
	 	let treeProvider = new DocumentationTreeProvider(rootPath);
	 	vscode.window.registerTreeDataProvider(
	 		'bpyModules',
	 		treeProvider
	 	);
	 	context.subscriptions.push(vscode.window.createTreeView('bpyModules', {
	 		treeDataProvider: treeProvider
	 	}));
	}

	
	// ======= OPEN A FILE IN TEXT EDITOR =======
	// context.subscriptions.push(vscode.commands.registerCommand('test.disassemble', async () => {
	// 	// This function is a mess
	// 	let result;
	// 	await vscode.window.showOpenDialog(fileFetch.dialogOptions).then(m => result = m);
	// 	if (result === undefined) {
	// 		vscode.window.showErrorMessage("File not found!");
	// 	}
	// 	else {
	// 		let uri: vscode.Uri = result;
	// 		fileFetch.openFile(uri.toString().substring(7), context);
	// 	}
		
	// }));
	const popup = vscode.commands.registerCommand('blendev.go', () => {
		vscode.window.showInformationMessage('blendev started successfully');
	});

	let raw_data : string = "";
	try {
		raw_data = fs.readFileSync(path.join(__dirname, '../../resources/docs.json'), 'utf8');
	} catch (err) {
		console.error(err);
	}

	let dump : Object = JSON.parse(raw_data);
	let data : Layer[] = parse_modules(Object.values(Object.values(dump)[0]));
	// comment statement for aaron
	//console.log(data[0].children['ParticleSystem']);
	
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
							arr.push(new vscode.CompletionItem(child.module.name, vscode.CompletionItemKind.Module));
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
								Object.keys(child.children).forEach(function (gchild) {
									arr.push(new vscode.CompletionItem(gchild, vscode.CompletionItemKind.Property));
								});
								return;
							}
							else{
								Object.values(child.children).forEach(function (gchild) {
									if(token.endsWith('bpy.' + child.module.name + "." + gchild.name + ".")){
										Object.keys(gchild.attributes).forEach(function (ggchild) {
											arr.push(new vscode.CompletionItem(ggchild, vscode.CompletionItemKind.Property));
										});
										Object.keys(gchild.s_attributes).forEach(function (ggchild) {
											arr.push(new vscode.CompletionItem(ggchild, vscode.CompletionItemKind.Property));
										});
										Object.keys(gchild.methods).forEach(function (ggchild) {
											arr.push(new vscode.CompletionItem(ggchild, vscode.CompletionItemKind.Method));
										});
										Object.keys(gchild.s_methods).forEach(function (ggchild) {
											arr.push(new vscode.CompletionItem(ggchild, vscode.CompletionItemKind.Method));
										});
										Object.keys(gchild.functions).forEach(function (ggchild) {
											arr.push(new vscode.CompletionItem(ggchild, vscode.CompletionItemKind.Method));
										});
									}
								});
								return;
								
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
	// const hover = vscode.languages.registerHoverProvider(
	// 	'python', 
	// 	{
	// 		provideHover(document, position, token) {
	// 			const range = document.getWordRangeAtPosition(position);
	// 			const word = document.getText(range);
	// 			const line = document.lineAt(position).text;
	// 			if (word === "join" && line.search("os.path.")!==-1) {
	// 				return new vscode.Hover({
	// 					language: "python",
	// 					value: "hover"
	// 				});
	// 			}
	// 		}
    // 	}
	// );
	// const popup = vscode.commands.registerCommand('blendev.hover', () => {
	// 		vscode.window.showInformationMessage('hover running');
	// 	});
		
		/*
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
		);*/
		/*
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
	*/
	let disposable2 = vscode.languages.registerHoverProvider('python', {
	  provideHover(document, position) {
	
			
			
			// console.log('\nbegin data\n');
			// console.log(data);
			// console.log('\nend data\n');
	
			var clausePos = position;
			var clause = document.getText(document.getWordRangeAtPosition(position));
			var oldClause = clause;
			let clauses = [clause];
			var fileAddress = "";
			var pyName = "";
	
			console.log(clause);
	
			while (clause !== "bpy") {
				clausePos = clausePos.translate(0, -1);
				clause = document.getText(document.getWordRangeAtPosition(clausePos));
				if (clause != oldClause) {
					oldClause = clause;
					clauses.unshift(clause);
				}
			}
	
			if (clauses.length == 3) {
				fileAddress = clauses.join('.');
				pyName = clauses[2];
			}
			if (clauses.length == 4) {
				fileAddress = clauses.join('.');
				pyName = clauses[3];
			}
			console.log(clauses);
	
	
			
	
	
			// const foundItem = false;
	
			// while(!foundItem) {
	
			// }
	
			// const item = 
	
			// const path = require('path');
	
			// const html = vscode.Uri.file(path.join(context.extensionPath,item,path.sep)).split('_static').join('.._static');
			
	
		const htmlUri = vscode.Uri.file(path.join(context.extensionPath,path.sep,'media',path.sep,'blender_python_reference_4_3',path.sep)).path + fileAddress + '.html';
		console.log(htmlUri);
		const htmlFull = importTextFileSync(htmlUri);
		// console.log(htmlFull.replaceAll("\n\n","\n"));
		
	// For 'beginningTarget<thing>
	var begTarFunc = (htmlFull.indexOf('py function') < 0)? 999995 : htmlFull.substring(0,htmlFull.indexOf('py function')).split('\n').length-1;
	var begTarMthd = (htmlFull.indexOf('py method') < 0)? 999996 : htmlFull.substring(0,htmlFull.indexOf('py method')).split('\n').length-1;
	var begTarClss = (htmlFull.indexOf('py class') < 0)? 999997 : htmlFull.substring(0,htmlFull.indexOf('py class')).split('\n').length-1;
	var begTarAttr = (htmlFull.indexOf('py attribute') < 0)? 999998 : htmlFull.substring(0,htmlFull.indexOf('py attribute')).split('\n').length-1;
	var begTarData = (htmlFull.indexOf('py data') < 0)? 999999 : htmlFull.substring(0,htmlFull.indexOf('py data')).split('\n').length-1;
	var endTarDocs = (htmlFull.indexOf('\n</dd></dl>\n\n</section>') < 0)? htmlFull.substring(0,htmlFull.indexOf('\n</dd></dl>\n\n<section')).split('\n').length-1 : htmlFull.substring(0,htmlFull.indexOf('\n</dd></dl>\n\n</section>')).split('\n').length-1;
	
	console.log(Math.min(begTarFunc,begTarMthd,begTarClss,begTarAttr,begTarData));
	console.log(endTarDocs)
	console.log(htmlFull.split('\n')[endTarDocs])
	
	const htmlShort = htmlFull.split('\n').slice(0,6-1).join('\n') + '\n' + htmlFull.split('\n').slice(11,46-1).join('\n') + '\n' + htmlFull.split('\n').slice(Math.min(begTarFunc,begTarMthd,begTarClss,begTarAttr,begTarData), endTarDocs-1).join('\n');
	console.log("short");
	console.log(htmlShort);
	const begPyName = (htmlShort.indexOf(pyName) < 0)? 999993 : htmlShort.substring(0,htmlShort.indexOf(pyName)).split('\n').length-2;
	
	begTarFunc = (htmlShort.indexOf('py function') < 0)? 999995 : htmlShort.substring(0,htmlShort.indexOf('py function')).split('\n').length-1;
	begTarMthd = (htmlShort.indexOf('py method') < 0)? 999996 : htmlShort.substring(0,htmlShort.indexOf('py method')).split('\n').length-1;
	begTarClss = (htmlShort.indexOf('py class') < 0)? 999997 : htmlShort.substring(0,htmlShort.indexOf('py class')).split('\n').length-1;
	begTarAttr = (htmlShort.indexOf('py attribute') < 0)? 999998 : htmlShort.substring(0,htmlShort.indexOf('py attribute')).split('\n').length-1;
	begTarData = (htmlShort.indexOf('py data') < 0)? 999999 : htmlShort.substring(0,htmlShort.indexOf('py data')).split('\n').length-1;
	endTarDocs = (htmlShort.indexOf('\n</dd></dl>\n') < 0)? htmlFull.substring(0,htmlFull.indexOf('\n</dd></dl>\n')).split('\n').length-1 : htmlShort.substring(0,htmlFull.indexOf('\n</dd></dl>\n')).split('\n').length-1;
	
	console.log("shorter");
	console.log(endTarDocs);
	
	const htmlShorter = htmlShort.split('\n').slice(0,Math.min(begTarFunc,begTarMthd,begTarClss,begTarAttr,begTarData)).join('\n') + htmlShort.split('\n').slice(begPyName).join('\n');
	console.log(htmlShorter);
	
	endTarDocs = (htmlShorter.indexOf('\n</dd></dl>\n') < 0)? 999999 : htmlShorter.substring(0,htmlFull.indexOf('\n</dd></dl>\n')).split('\n').length-1;
	console.log("shortest");
	console.log(endTarDocs);
	const htmlShortest = htmlShorter.split('\n').slice(0,endTarDocs).join('\n');
	console.log(htmlShortest);
	
	const htmlFinal = (htmlShortest + "\n</dd></dl>\n\n</section>\n\n</html>").replaceAll("\n\n","\n").replaceAll("#","");
	console.log("FINAL");
	console.log(htmlFinal);
	
	const content = new vscode.MarkdownString(htmlFinal);
	
		content.supportHtml = true;
	
		content.isTrusted = true;
	
			content.supportThemeIcons = true;
	
		return new vscode.Hover(content, new vscode.Range(position, position));
		}
		});
		context.subscriptions.push(disposable2);

	context.subscriptions.push(popup, completion,);
}