import { runSingleFileValidator, SingleFileValidator, InitializeResponse, IValidationRequestor, IDocument, Diagnostic, Severity, Position, Files } from "vscode-languageworker";
import { exec, spawn } from "child_process";

export interface DockerLinterSettings {
	machine: string;
	container: string;
	command: string;
	regexp: string;
	line?: string;
	column?: string;
	severity?: string;
	message?: string;
	code?: string;
}

function getDiagnostic(message: string, line: number, start: number, end: number, severity: number): Diagnostic {
	return {
		start: { line, character: start },
		end: { line, character: end },
		severity,
		message
	};
}

function setMachineEnv(machine: string): Thenable<InitializeResponse> {
	return new Promise((resolve, reject) => {
		exec(`docker-machine env ${machine} --shell bash`, function(error, stdout, stderr) {
			let outString = stdout.toString();
			let envRegex = /export (.+)="(.+)"\n/g;

			let match: RegExpExecArray;
			while (match = envRegex.exec(outString)) {
				process.env[match[1]] = match[2];
			}

			resolve(null);
		});
	});
}

export class DockerLinterValidator implements SingleFileValidator {
	private settings: DockerLinterSettings;

	constructor(defaults: DockerLinterSettings) {
		this.settings = defaults;
	}

	updateSettings = (settings: DockerLinterSettings) => {
		this.settings.machine = settings.machine || this.settings.machine;
		this.settings.container = settings.container || this.settings.container;
		this.settings.command = settings.command || this.settings.command;
		this.settings.regexp = settings.regexp || this.settings.regexp;
		this.settings.line = settings.line || this.settings.line;
		this.settings.column = settings.column || this.settings.column;
		this.settings.severity = settings.severity || this.settings.severity;
		this.settings.message = settings.message || this.settings.message;
		this.settings.code = settings.code || this.settings.code;
	};

	getDebugString = (): string => {
		return [this.settings.machine, this.settings.container, this.settings.command, this.settings.regexp, ""].join(" | ");
	};

	parseBuffer = (buffer: Buffer) => {
		let result: Diagnostic[] = [];
		let out = buffer.toString();
		let problemRegex = new RegExp(this.settings.regexp, "g");

		result.push(getDiagnostic(this.getDebugString() + out, 1, 0, Number.MAX_VALUE, Severity.Info));

		let match: RegExpExecArray;
		while (match = problemRegex.exec(out)) {
			result.push(getDiagnostic(match[1], parseInt(match[3], 10), 0, Number.MAX_VALUE, Severity.Error));
		}

		return result;
	};

	initialize = (rootFolder: string): Thenable<InitializeResponse> => {
		return setMachineEnv(this.settings.machine);
	};

	onConfigurationChange = (_settings: { "docker-linter": DockerLinterSettings }, requestor: IValidationRequestor): void => {
		if (_settings["docker-linter"]) {
			this.updateSettings(_settings["docker-linter"]);
		}

		setMachineEnv(this.settings.machine);
		requestor.all();
	};

	validate = (document: IDocument): Promise<Diagnostic[]> => {
		let child = spawn("docker", `exec -i ${this.settings.container } ${this.settings.command }`.split(" "));
		child.stdin.write(document.getText());
		child.stdin.end();

		return new Promise<Diagnostic[]>((resolve, reject) => {
			child.stderr.on("data", (data: Buffer) => {
				resolve(this.parseBuffer(data));
			});
			child.stdout.on("data", (data: Buffer) => {
				resolve(this.parseBuffer(data));
			});
		});
	};
}