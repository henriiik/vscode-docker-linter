'use strict';

// The module vscode-languageworker contains all the necessary code and typings
// to implement a language worker for node.
import { runSingleFileValidator, SingleFileValidator, InitializeResponse, IValidationRequestor, IDocument, Diagnostic, Severity, Position, Files } from 'vscode-languageworker';

let validator : SingleFileValidator = {
	initialize: (rootFolder: string): Thenable<InitializeResponse> => {
		return Promise.resolve(null);
	},
	onConfigurationChange(settings: any, requestor: IValidationRequestor): void {
		// VSCode settings have changed and the requested settings changes
		// have been synced over to the language worker

		// Request re-validation of all open documents
		requestor.all();
	},
	validate: (document: IDocument): Diagnostic[] => {
		// Validate a single document for diagnostic messages
		return [];
	}
};

// Run the single file validator. The protocol is reads form stdin and
// writes to stdout.
runSingleFileValidator(process.stdin, process.stdout, validator);