"use strict";

import { runSingleFileValidator, SingleFileValidator, InitializeResponse, IValidationRequestor, IDocument, Diagnostic, Severity, Position, Files } from "vscode-languageworker";
import { exec, spawn } from "child_process";

interface Settings {
	machine?: string;
	container?: string;
	command?: string;
	problemMatcher?: string;
}

// Evironment
let envRegex = /export (.+)="(.+)"\n/g;

// Defaults
let machine = "default";
let container = "docker-linter";
let command = "perl -c";
let problemMatcher = "(.*) at ([^ ]*) line (\\d+)[.,]";

// Settings
let defaults: Settings = {
	machine,
	container,
	command,
	problemMatcher
};

let settings: Settings = {};

// Helpers
function getSetting(name: string) {
	return settings[name] || defaults[name];
}

function getDebugString(out: string) {
	return [getSetting("machine"), getSetting("container"), getSetting("command"), getSetting("problemMatcher"), out].join(" | ");
}

function getDiagnostic(message: string, line: number, start: number, end: number, severity: number): Diagnostic {
	return {
		start: { line, character: start },
		end: { line, character: end },
		severity,
		message
	};
}

function parseBuffer(buffer: Buffer): Diagnostic[] {
	let result: Diagnostic[] = [];
	let errString = buffer.toString();
	let problemRegex = new RegExp(getSetting("problemMatcher"), "g");

	result.push(getDiagnostic(getDebugString(errString), 1, 0, Number.MAX_VALUE, Severity.Warning));

	let match;
	while (match = problemRegex.exec(errString)) {
		result.push(getDiagnostic(match[1], match[3], 0, Number.MAX_VALUE, Severity.Error));
	}

	return result;
}

function setMachineEnv() {
	return new Promise((resolve, reject) => {
		exec(`docker-machine env ${getSetting("machine") } --shell bash`, function(error, stdout, stderr) {
			let outString = stdout.toString();
			let match;
			while (match = envRegex.exec(outString)) {
				process.env[match[1]] = match[2];
			}
			resolve(null);
		});
	});
}

// Validator
let validator: SingleFileValidator = {
	initialize: (rootFolder: string): Thenable<InitializeResponse> => {
		return setMachineEnv();
	},
	onConfigurationChange(_settings: { "docker-linter": Settings }, requestor: IValidationRequestor): void {
		settings = (_settings["docker-linter"] || {});

		setMachineEnv();
		requestor.all();
	},
	validate: (document: IDocument): Promise<Diagnostic[]> => {
		let child = spawn("docker", `exec -i ${getSetting("container") } ${getSetting("command") }`.split(" "));
		child.stdin.write(document.getText());
		child.stdin.end();

		return new Promise<Diagnostic[]>((resolve, reject) => {
			child.stderr.on("data", (data: Buffer) => {
				resolve(parseBuffer(data));
			});
			child.stdout.on("data", (data: Buffer) => {
				resolve(parseBuffer(data));
			});
		});
	}
};

// Run the single file validator. The protocol is reads form stdin and
// writes to stdout.
runSingleFileValidator(process.stdin, process.stdout, validator);