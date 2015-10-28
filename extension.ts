'use strict';

import { runSingleFileValidator, SingleFileValidator, InitializeResponse, IValidationRequestor, IDocument, Diagnostic, Severity, Position, Files } from 'vscode-languageworker';
import { exec, spawn } from 'child_process';

interface Settings {
	'docker-linter': {
		perl: {
			enable: boolean;
			machine: string;
		}
	}
}

let env = {};
let envRegex = /export (.+)="(.+)"\n/g;
let root: string;
let machine = "default";
let settings: Settings;

function setMachineEnv() {
	return new Promise((resolve, reject) => {
		exec(`docker-machine env ${machine} --shell bash`, function(error, stdout, stderr) {
			let envString = stdout.toString();
			let match;
			env = {};
			while (match = envRegex.exec(envString)) {
				env[match[1]] = match[2];
			}
			resolve()
		})
	})
}

let validator: SingleFileValidator = {
	initialize: (rootFolder: string): Thenable<InitializeResponse> => {
		root = rootFolder;
		return setMachineEnv();
	},
	onConfigurationChange(_settings: Settings, requestor: IValidationRequestor): void {
		machine = _settings['docker-linter'].perl.machine;
		setMachineEnv();

		// Request re-validation of all open documents
		requestor.all();
	},
	validate: (document: IDocument): Promise<Diagnostic[]> => {
		let child = spawn('docker', 'exec -i perl perl -c -W'.split(' '), { env });
		child.stdin.write(document.getText());
		child.stdin.end();

		let result: Diagnostic[] = [];
		return new Promise<Diagnostic[]>((resolve, reject) => {
			child.stderr.on('data', (data: Buffer) => {
				let errStr = data.toString()
				errStr.split('\n').forEach(line => {
					let match = line.split(' at - line ');
					if (match.length > 1) {
						result.push({
							start: { line: parseInt(match[1]), character: 0 },
							end: { line: parseInt(match[1]), character: Number.MAX_VALUE },
							severity: Severity.Error,
							message: match[0]
						});
					}
				});
				resolve(result);
			})
		});
	}
};

// Run the single file validator. The protocol is reads form stdin and
// writes to stdout.
runSingleFileValidator(process.stdin, process.stdout, validator);