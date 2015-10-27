'use strict';

import { runSingleFileValidator, SingleFileValidator, InitializeResponse, IValidationRequestor, IDocument, Diagnostic, Severity, Position, Files } from 'vscode-languageworker';
import { exec } from 'child_process';

let envString;
let envObj = {};
let envRegex = /export (.+)="(.+)"\n/g;
let root;

let validator: SingleFileValidator = {
	initialize: (rootFolder: string): Thenable<InitializeResponse> => {
		root = rootFolder;
		return new Promise<InitializeResponse>((resolve, reject) => {
			let child = exec('docker-machine env default --shell bash', function(error, stdout, stderr) {
				envString = stdout.toString();
				resolve(null);
			})
		});
	},
	onConfigurationChange(settings: any, requestor: IValidationRequestor): void {
		// VSCode settings have changed and the requested settings changes
		// have been synced over to the language worker

		// Request re-validation of all open documents
		requestor.all();
	},
	validate: (document: IDocument): Promise<Diagnostic[]> => {
		// Validate a single document for diagnostic messages
		// let match = null;
		// while (match = envRegex.exec(envString)) {
		// 	envObj[match[0]] = match[1];
		// }
		let match;
		while (match = envRegex.exec(envString)) {
			envObj[match[1]] = match[2];
		}
		return new Promise<Diagnostic[]>((resolve, reject) => {
			let child = exec('docker exec perl perl -c -W /root/hello/test.pl', {
				env: envObj
			}, (error, stdout, stderr) => {
				let result: Diagnostic[] = []
				let message: string;
				if (error) {
					error.message.toString().split('\n').forEach(e => {
						let hello = e.split(' at /root/hello/test.pl line ');
						if (hello.length > 1) {
							result.push({
								start: { line: parseInt(hello[1]), character: 0 },
								end: { line: parseInt(hello[1]), character: Number.MAX_VALUE },
								severity: Severity.Error,
								message: hello[0]
							});
						}
					});
				}
				resolve(result)
			})
		});
	}
};

// Run the single file validator. The protocol is reads form stdin and
// writes to stdout.
runSingleFileValidator(process.stdin, process.stdout, validator);