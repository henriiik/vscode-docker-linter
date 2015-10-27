'use strict';

import { runSingleFileValidator, SingleFileValidator, InitializeResponse, IValidationRequestor, IDocument, Diagnostic, Severity, Position, Files } from 'vscode-languageworker';
import { exec } from 'child_process';

let env = {};
let envRegex = /export (.+)="(.+)"\n/g;
let root: string;
let machine: string;

let validator: SingleFileValidator = {
	initialize: (rootFolder: string): Thenable<InitializeResponse> => {
		root = rootFolder;
		return Promise.resolve(null);
	},
	onConfigurationChange(settings: any, requestor: IValidationRequestor): void {
		// VSCode settings have changed and the requested settings changes
		// have been synced over to the language worker
		
		machine = settings["docker-linter"]["perl"]["machine"];
		let child = exec(`docker-machine env ${machine} --shell bash`, function(error, stdout, stderr) {
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
		return new Promise<Diagnostic[]>((resolve, reject) => {
			let child = exec('docker exec perl perl -c -W /root/hello/test.pl',
				{ env },
				(error, stdout, stderr) => {
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