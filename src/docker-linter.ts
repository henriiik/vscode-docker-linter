import { runSingleFileValidator, SingleFileValidator, InitializeResponse, IValidationRequestor, IDocument, Diagnostic, Severity, Position, Files } from "vscode-languageworker";

export interface DockerLinterSettings {
	machine?: string;
	container?: string;
	command?: string;
	problemMatcher?: string;
}

export class DockerLinterValidator {
	defaults: DockerLinterSettings;
	constructor(defaults: DockerLinterSettings) {
		this.defaults = defaults;
	}
}

export function makeValidator() {
	return "hello!";
}