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
let problemRegex;

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

function getDebugString() {
	let tmp = settings;
	return ["", getSetting("machine"), getSetting("container"), getSetting("command"), getSetting("problemMatcher"), ""].join("|");
}

function setMachineEnv() {
	return new Promise((resolve, reject) => {
		exec(`docker-machine env ${getSetting("machine")} --shell bash`, function(error, stdout, stderr) {
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
		problemRegex = new RegExp(getSetting("problemMatcher"), "g");
		let child = spawn("docker", `exec -i ${getSetting("container")} ${getSetting("command")}`.split(" "));
		child.stdin.write(document.getText());
		child.stdin.end();

		let result: Diagnostic[] = [];
		return new Promise<Diagnostic[]>((resolve, reject) => {
			child.stderr.on("data", (data: Buffer) => {
				let errString = data.toString();
				result.push({
					start: { line: 1, character: 0 },
					end: { line: 1, character: Number.MAX_VALUE },
					severity: Severity.Warning,
					message: "ERR! " + getDebugString() + " " + errString
				});
				let match;
				while (match = problemRegex.exec(errString)) {
					result.push({
						start: { line: parseInt(match[3]), character: 0 },
						end: { line: parseInt(match[3]), character: Number.MAX_VALUE },
						severity: Severity.Error,
						message: match[1]
					});
				}
				resolve(result);
			});
			child.stdout.on("data", (data: Buffer) => {
				let outString = data.toString();
				result.push({
					start: { line: 1, character: 0 },
					end: { line: 1, character: Number.MAX_VALUE },
					severity: Severity.Warning,
					message: "OUT!" + outString
				});
				resolve(result);
			});
		});
	}
};

// Run the single file validator. The protocol is reads form stdin and
// writes to stdout.
runSingleFileValidator(process.stdin, process.stdout, validator);