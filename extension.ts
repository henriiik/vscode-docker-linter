'use strict';

import { runSingleFileValidator, SingleFileValidator, InitializeResponse, IValidationRequestor, IDocument, Diagnostic, Severity, Position, Files } from 'vscode-languageworker';
import { exec, spawn } from 'child_process';

let env = {};
let envRegex = /export (.+)="(.+)"\n/g;
let root: string;
let machine: string;

let validator: SingleFileValidator = {
	initialize: (rootFolder: string): Thenable<InitializeResponse> => {
		root = rootFolder;
		machine = "default";
		return new Promise((resolve, reject) => {
			exec(`docker-machine env ${machine} --shell bash`, function(error, stdout, stderr) {
				let envString = stdout.toString();
				let match;
				while (match = envRegex.exec(envString)) {
					env[match[1]] = match[2];
				}
			})
			resolve(null)
		})
	},
	onConfigurationChange(settings: any, requestor: IValidationRequestor): void {
		// VSCode settings have changed and the requested settings changes
		// have been synced over to the language worker
		
		machine = settings["docker-linter"]["perl"]["machine"];
		exec(`docker-machine env ${machine} --shell bash`, function(error, stdout, stderr) {
			let envString = stdout.toString();
			let match;
			while (match = envRegex.exec(envString)) {
				env[match[1]] = match[2];
			}
		})

		// Request re-validation of all open documents
		requestor.all();
	},
	validate: (document: IDocument): Promise<Diagnostic[]> => {
		let child = spawn('docker', 'exec perl perl -c -W /root/hello/test.pl'.split(' '), { env });
		let result: Diagnostic[] = [];
		return new Promise<Diagnostic[]>((resolve, reject) => {
			child.stderr.on('data', (data: Buffer) => {
				let errStr = data.toString()
				errStr.split('\n').forEach(line => {
					let hello = line.split(' line ');
					if (hello.length > 1) {
						result.push({
							start: { line: parseInt(hello[1]), character: 0 },
							end: { line: parseInt(hello[1]), character: Number.MAX_VALUE },
							severity: Severity.Error,
							message: hello[0]
						});
					}
				});
				resolve(result);
			})
			child.on('close', code => {
			})
		});
	}
};

// Run the single file validator. The protocol is reads form stdin and
// writes to stdout.
runSingleFileValidator(process.stdin, process.stdout, validator);