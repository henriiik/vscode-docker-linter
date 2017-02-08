"use strict";

import {
	IPCMessageReader, IPCMessageWriter,
	createConnection, IConnection, TextDocumentSyncKind,
	ResponseError, RequestType, NotificationType,
	InitializeResult, InitializeError,
	TextDocuments, TextDocument, Diagnostic, DiagnosticSeverity,
	Position, Files, ErrorMessageTracker
} from "vscode-languageserver";

import { exec, spawn } from "child_process";

interface DockerLinterSettings {
	machine: string;
	container: string;
	command: string;
	regexp: string;
	line: number;
	column: number;
	severity: number | string;
	message: number;
	code: number;
}

let connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));
let lib: any = null;
let settings: DockerLinterSettings = null;
let options: any = null;
let documents: TextDocuments = new TextDocuments();
let ready = false;

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

function getDiagnostic(match: RegExpMatchArray): Diagnostic {
	let line = parseInt(match[settings.line], 10) - 1;

	let start = 0;
	let end = Number.MAX_VALUE;
	if (settings.column) {
		start = end = parseInt(match[settings.column], 10) - 1;
	}

	let severity: DiagnosticSeverity = DiagnosticSeverity.Error;
	if (settings.severity) {
		let tmp = settings.severity;
		if (typeof tmp === "number") {
			tmp = match[Number(tmp)];
		}
		switch (tmp) {
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
	let lines = buffer.toString().split("\n");
	let problemRegex = new RegExp(settings.regexp, "m");

	lines.forEach(line => {
		let match = line.match(problemRegex);
		if (match) {
			result.push(getDiagnostic(match));
		}
	});

	return result;
};

function isInteger(value: number) {
	return isFinite(value) && Math.floor(value) === value;
}

function checkDockerVersion(): Thenable<InitializeResult | ResponseError<InitializeError>> {
	return new Promise<InitializeResult | ResponseError<InitializeError>>((resolve, reject) => {
		exec(`docker -v`, function (error, stdout, stderr) {
			if (error) {
				let errString = `Could not find docker: '${stderr.toString()}'`;
				reject(new ResponseError<InitializeError>(99, errString, { retry: true }));
			}

			resolve({ capabilities: { textDocumentSync: documents.syncKind } });
		});
	});
}

function setMachineEnv(machine: string): Thenable<string> {
	return new Promise<string>((resolve, reject) => {
		if (machine.length === 0) {
			resolve(machine);
		} else {
			exec(`docker-machine env ${machine} --shell bash`, function (error, stdout, stderr) {
				if (error) {
					let errString = stderr.toString();
					connection.window.showErrorMessage(`Could not get docker-machine environment: '${errString}'`);
					reject(machine);
				}

				let out = stdout.toString();
				let envRegex = /export (.+)="(.+)"\n/g;

				let match: RegExpExecArray;
				while (match = envRegex.exec(out)) {
					process.env[match[1]] = match[2];
				}

				resolve(machine);
			});
		}
	});
}

documents.listen(connection);
documents.onDidChangeContent((event) => {
	validateSingle(event.document);
});

connection.onInitialize((params): Thenable<InitializeResult | ResponseError<InitializeError>> => {
	return checkDockerVersion();
});

let isValidating: { [index: string]: boolean } = {};
let needsValidating: { [index: string]: TextDocument } = {};

function validate(document: TextDocument): void {
	let uri = document.uri;
	// //connection.console.log(`Wants to validate ${uri}`);

	if (!ready || isValidating[uri]) {
		needsValidating[uri] = document;
		return;
	};

	isValidating[uri] = true;

	let child = spawn("docker", `exec -i ${settings.container} ${settings.command}`.split(" "));
	child.stdin.write(document.getText());
	child.stdin.end();

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
		if (debugString.match(/^Error response from daemon/)) {
			connection.window.showErrorMessage(`Is your container running? Error: ${debugString}`);
		} else if (debugString.match(/^An error occurred trying to connect/)) {
			connection.window.showErrorMessage(`Is your machine correctly configured? Error: ${debugString}`);
		} else {
			//connection.console.log(code + " | " + getDebugString(debugString));
			connection.sendDiagnostics({ uri, diagnostics });
		}

		isValidating[uri] = false;
		let revalidateDocument = needsValidating[uri];

		if (revalidateDocument) {
			//connection.console.log(`Revalidating ${uri}`);
			delete needsValidating[uri];
			validate(revalidateDocument);
		} else {
			//connection.console.log(`Finished validating ${uri}`);
		}
	});
}

function getMessage(err: any, document: TextDocument): string {
	let result: string = null;
	if (typeof err.message === "string" || err.message instanceof String) {
		result = <string>err.message;
		result = result.replace(/\r?\n/g, " ");
		if (/^CLI: /.test(result)) {
			result = result.substr(5);
		}
	} else {
		result = `An unknown error occured while validating file: ${Files.uriToFilePath(document.uri)}`;
	}
	return result;
}

function validateSingle(document: TextDocument): void {
	try {
		validate(document);
	} catch (err) {
		connection.window.showErrorMessage(getMessage(err, document));
	}
}

function validateMany(documents: TextDocument[]): void {
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

let linters = ["perl", "perlcritic", "flake8", "rubocop"];
connection.onDidChangeConfiguration((params) => {
	let dockerLinterSettings = params.settings["docker-linter"];
	linters.forEach(linter => {
		if (dockerLinterSettings[linter]) {
			settings = dockerLinterSettings[linter];
		};
	});
	setMachineEnv(settings.machine)
		.then(response => {
			ready = true;
			validateMany(documents.all());
		});
});

connection.onDidChangeWatchedFiles((params) => {
	validateMany(documents.all());
});

connection.listen();
