"use strict";

import {
createConnection, IConnection,
ResponseError, RequestType, IRequestHandler, NotificationType, INotificationHandler,
InitializeResult, InitializeError,
Diagnostic, DiagnosticSeverity, Position, Files,
TextDocuments, ITextDocument, TextDocumentSyncKind,
ErrorMessageTracker
} from "vscode-languageserver";

import { exec, spawn } from "child_process";

interface DockerLinterSettings {
	machine: string;
	container: string;
	command: string;
	regexp: string;
	line: number;
	column: number;
	severity: number;
	message: number;
	code: number;
}

let connection: IConnection = createConnection(process.stdin, process.stdout);
let lib: any = null;
let settings: DockerLinterSettings = null;
let options: any = null;
let documents: TextDocuments = new TextDocuments();

function getDebugString(extra: string): string {
	return [settings.machine, settings.container, settings.command, settings.regexp, extra].join(" | ");
};

function getDebugDiagnostic(message: string): Diagnostic {
	return {
		range: {
			start: { line: 0, character: 0 },
			end: { line: 0, character: Number.MAX_VALUE },
		},
		severity: DiagnosticSeverity.Information,
		message
	};
}

function getDiagnostic(match: RegExpExecArray): Diagnostic {
	let line = parseInt(match[settings.line], 10) - 1;

	let start = 0;
	let end = Number.MAX_VALUE;
	if (settings.column) {
		start = end = parseInt(match[settings.column], 10);
	}

	let severity = DiagnosticSeverity.Error;
	if (settings.severity) {
		switch (match[settings.severity]) {
			case "warning":
				severity = DiagnosticSeverity.Warning;
				break;
			case "info":
				severity = DiagnosticSeverity.Information;
				break;
		}
	}

	let diagnostic: Diagnostic = {
		range: {
			start: { line, character: start },
			end: { line, character: end }
		},
		severity,
		message: match[settings.message]
	};

	if (settings.code) {
		diagnostic.code = match[settings.code];
	}

	return diagnostic;
};

function parseBuffer(buffer: Buffer) {
	let result: Diagnostic[] = [];
	let out = buffer.toString();
	let problemRegex = new RegExp(settings.regexp, "gm");

	let match: RegExpExecArray;
	while (match = problemRegex.exec(out)) {
		result.push(getDiagnostic(match));
	}

	return result;
};

function isInteger(value: number) {
	return isFinite(value) && Math.floor(value) === value;
}

function setMachineEnv(machine: string): Thenable<InitializeResult | ResponseError<InitializeError>> {
	return new Promise<InitializeResult | ResponseError<InitializeError>>((resolve, reject) => {
		exec(`docker-machine env ${machine} --shell bash`, function(error, stdout, stderr) {
			if (error) {
				let errString = stderr.toString();
				reject(new ResponseError<InitializeError>(99, errString, { retry: true }));
			}

			let out = stdout.toString();
			let envRegex = /export (.+)="(.+)"\n/g;

			let match: RegExpExecArray;
			while (match = envRegex.exec(out)) {
				process.env[match[1]] = match[2];
			}

			resolve({ capabilities: { textDocumentSync: documents.syncKind } });
		});
	});
}

documents.listen(connection);
documents.onDidChangeContent((event) => {
	validateSingle(event.document);
});

connection.onInitialize((params): Thenable<InitializeResult | ResponseError<InitializeError>> => {
	return setMachineEnv("default");
});

function validate(document: ITextDocument): void {
	let child = spawn("docker", `exec -i ${settings.container } ${settings.command }`.split(" "));
	child.stdin.write(document.getText());
	child.stdin.end();

	let uri = document.uri;
	let diagnostics: Diagnostic[] = [];
	let debugString = "";

	child.stderr.on("data", (data: Buffer) => {
		debugString += data.toString();
		diagnostics = diagnostics.concat(parseBuffer(data));
	});

	child.stdout.on("data", (data: Buffer) => {
		debugString += data.toString();
		diagnostics = diagnostics.concat(parseBuffer(data));
	});

	child.on("close", (code: string) => {
		diagnostics.push(getDebugDiagnostic(code + " | " + getDebugString(debugString)));
		connection.sendDiagnostics({ uri, diagnostics });
	});
}

function getMessage(err: any, document: ITextDocument): string {
	let result: string = null;
	if (typeof err.message === "string" || err.message instanceof String) {
		result = <string>err.message;
		result = result.replace(/\r?\n/g, " ");
		if (/^CLI: /.test(result)) {
			result = result.substr(5);
		}
	} else {
		result = `An unknown error occured while validating file: ${Files.uriToFilePath(document.uri) }`;
	}
	return result;
}

function validateSingle(document: ITextDocument): void {
	try {
		validate(document);
	} catch (err) {
		connection.window.showErrorMessage(getMessage(err, document));
	}
}

function validateMany(documents: ITextDocument[]): void {
	let tracker = new ErrorMessageTracker();
	documents.forEach(document => {
		try {
			validate(document);
		} catch (err) {
			tracker.add(getMessage(err, document));
		}
	});
	tracker.sendErrors(connection);
}

connection.onDidChangeConfiguration((params) => {
	let perl = params.settings["docker-linter-perl"];
	if (perl) {
		settings = perl;
	}
	let perlcritic = params.settings["docker-linter-perlcritic"];
	if (perlcritic) {
		settings = perlcritic;
	}
	validateMany(documents.all());
});

connection.onDidChangeWatchedFiles((params) => {
	validateMany(documents.all());
});

connection.listen();

// export class DockerLinterValidator implements SingleFileValidator {
// 	private settings: DockerLinterSettings;
// 	private settingsKey: string;

// 	constructor(defaults: DockerLinterSettings, settingsKey: string) {
// 		this.settings = defaults;
// 		this.settingsKey = settingsKey;
// 	}

// 	updateSettings = (settings: DockerLinterSettings) => {
// 		this.settings.machine = settings.machine || this.settings.machine;
// 		this.settings.container = settings.container || this.settings.container;
// 		this.settings.command = settings.command || this.settings.command;
// 		this.settings.regexp = settings.regexp || this.settings.regexp;

// 		this.settings.line = settings.line || this.settings.line;
// 		this.settings.message = settings.message || this.settings.message;

// 		this.settings.code = isInteger(settings.code) ? settings.code : this.settings.code;
// 		this.settings.column = isInteger(settings.column) ? settings.column : this.settings.column;
// 		this.settings.severity = isInteger(settings.severity) ? settings.severity : this.settings.severity;
// 	};

// 	getDebugString = (extra: string): string => {
// 		return [this.settings.machine, this.settings.container, this.settings.command, this.settings.regexp, extra].join(" | ");
// 	};

// 	getDiagnostic = (match: RegExpExecArray): Diagnostic => {
// 		let line = parseInt(match[this.settings.line], 10);

// 		let start = 0;
// 		let end = Number.MAX_VALUE;
// 		if (this.settings.column) {
// 			start = end = parseInt(match[this.settings.column], 10);
// 		}

// 		let severity = DiagnosticSeverity.Error;
// 		if (this.settings.severity) {
// 			switch (match[this.settings.severity]) {
// 				case "warning":
// 					severity = DiagnosticSeverity.Warning;
// 					break;
// 				case "info":
// 					severity = DiagnosticSeverity.Information;
// 					break;
// 			}
// 		}

// 		let diagnostic: Diagnostic = {
// 			range: {
// 				start: { line, character: start },
// 				end: { line, character: end }
// 			},
// 			severity,
// 			message: match[this.settings.message]
// 		};

// 		if (this.settings.code) {
// 			diagnostic.code = match[this.settings.code];
// 		}

// 		return diagnostic;
// 	};

// 	parseBuffer = (buffer: Buffer) => {
// 		let result: Diagnostic[] = [];
// 		let out = buffer.toString();
// 		let problemRegex = new RegExp(this.settings.regexp, "gm");

// 		let match: RegExpExecArray;
// 		while (match = problemRegex.exec(out)) {
// 			result.push(this.getDiagnostic(match));
// 		}

// 		return result;
// 	};

// 	initialize = (rootFolder: string): Thenable<InitializeResponse> => {
// 		return setMachineEnv(this.settings.machine);
// 	};

// 	onConfigurationChange = (settings: any, requestor: IValidationRequestor): void => {
// 		if (settings[this.settingsKey]) {
// 			this.updateSettings(settings[this.settingsKey]);
// 		}

// 		setMachineEnv(this.settings.machine);
// 		requestor.all();
// 	};

// 	validate = (document: IDocument): Promise<Diagnostic[]> => {
// 		let child = spawn("docker", `exec -i ${this.settings.container } ${this.settings.command }`.split(" "));
// 		child.stdin.write(document.getText());
// 		child.stdin.end();

// 		return new Promise<Diagnostic[]>((resolve, reject) => {
// 			let result: Diagnostic[] = [];
// 			let debugString = "";

// 			child.stderr.on("data", (data: Buffer) => {
// 				debugString += data.toString();
// 				result = result.concat(this.parseBuffer(data));
// 			});

// 			child.stdout.on("data", (data: Buffer) => {
// 				debugString += data.toString();
// 				result = result.concat(this.parseBuffer(data));
// 			});

// 			child.on("close", (code: string) => {
// 				result.push(getDebugDiagnostic(code + " | " + this.getDebugString(debugString)));
// 				resolve(result);
// 			});
// 		});
// 	};
// }