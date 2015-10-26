'use strict';

import { exec } from 'child_process';

// The module vscode-languageworker contains all the necessary code and typings
// to implement a language worker for node.
import { runSingleFileValidator, SingleFileValidator, InitializeResponse, IValidationRequestor, IDocument, Diagnostic, Severity, Position, Files } from 'vscode-languageworker';

let validator: SingleFileValidator = {
	initialize: (rootFolder: string): Thenable<InitializeResponse> => {
		return Promise.resolve(null);
	},
	onConfigurationChange(settings: any, requestor: IValidationRequestor): void {
		// VSCode settings have changed and the requested settings changes
		// have been synced over to the language worker

		// Request re-validation of all open documents
		requestor.all();
	},
	validate: (document: IDocument): Promise<Diagnostic[]> => {
		// Validate a single document for diagnostic messages
		return new Promise<Diagnostic[]>((resolve, reject) => {
			let child = exec('docker exec perl perl -c -W /root/hello/test.pl', {
				env: {
					'DOCKER_TLS_VERIFY': '1',
					'DOCKER_HOST': 'tcp://192.168.99.100:2376',
					'DOCKER_CERT_PATH': '/Users/henrik/.docker/machine/machines/default',
					'DOCKER_MACHINE_NAME': 'default'
				}
			}, (error, stdout, stderr) => {
				let result: Diagnostic[] = []
				let message: string;
				if (error) {
					error.message.toString().split('\n').forEach(e => {
						let hello = e.split(' line ');
						result.push({
							start: { line: parseInt(hello[1]), character: 0 },
							end: { line: parseInt(hello[1]), character: 0 },
							severity: Severity.Error,
							message: hello[0]
						});
					});
				} else {
					stdout.toString().split('\n').forEach(e => {
						let hello = e.split(' line ');
						result.push({
							start: { line: parseInt(hello[1]), character: 0 },
							end: { line: parseInt(hello[1]), character: 0 },
							severity: Severity.Error,
							message: hello[0]
						});
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