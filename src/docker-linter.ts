import { runSingleFileValidator, SingleFileValidator, InitializeResponse, IValidationRequestor, IDocument, Diagnostic, Severity, Position, Files } from "vscode-languageworker";
import { exec, spawn } from "child_process";

export interface DockerLinterSettings {
	machine: string;
	container: string;
	command: string;
	regexp: string;
	line: number;
	column: number;
	severity: number;
	message: number;
	code: number;
}

function getDebugDiagnostic(message: string): Diagnostic {
	return {
		start: { line: 1, character: 0 },
		end: { line: 1, character: Number.MAX_VALUE },
		severity: Severity.Info,
		message
	};
}

function setMachineEnv(machine: string): Thenable<InitializeResponse> {
	return new Promise<InitializeResponse>((resolve, reject) => {
		exec(`docker-machine env ${machine} --shell bash`, function(error, stdout, stderr) {
			if (error) {
				let errString = stderr.toString();
				resolve({
					success: false,
					message: errString,
					retry: false
				});
			}

			let out = stdout.toString();
			let envRegex = /export (.+)="(.+)"\n/g;

			let match: RegExpExecArray;
			while (match = envRegex.exec(out)) {
				process.env[match[1]] = match[2];
			}

			resolve({ success: true });
		});
	});
}

function isInteger(value: number) {
	return isFinite(value) && Math.floor(value) === value;
}

export class DockerLinterValidator implements SingleFileValidator {
	private settings: DockerLinterSettings;
	private settingsKey: string;

	constructor(defaults: DockerLinterSettings, settingsKey: string) {
		this.settings = defaults;
		this.settingsKey = settingsKey;
	}

	updateSettings = (settings: DockerLinterSettings) => {
		this.settings.machine = settings.machine || this.settings.machine;
		this.settings.container = settings.container || this.settings.container;
		this.settings.command = settings.command || this.settings.command;
		this.settings.regexp = settings.regexp || this.settings.regexp;

		this.settings.line = settings.line || this.settings.line;
		this.settings.message = settings.message || this.settings.message;

		this.settings.code = isInteger(settings.code) ? settings.code : this.settings.code;
		this.settings.column = isInteger(settings.column) ? settings.column : this.settings.column;
		this.settings.severity = isInteger(settings.severity) ? settings.severity : this.settings.severity;
	};

	getDebugString = (extra: string): string => {
		return [this.settings.machine, this.settings.container, this.settings.command, this.settings.regexp, extra].join(" | ");
	};

	getDiagnostic = (match: RegExpExecArray): Diagnostic => {
		let line = parseInt(match[this.settings.line], 10);

		let start = 0;
		let end = Number.MAX_VALUE;
		if (this.settings.column) {
			start = end = parseInt(match[this.settings.column], 10);
		}

		let severity = Severity.Error;
		if (this.settings.severity) {
			switch (match[this.settings.severity]) {
				case "warning":
					severity = Severity.Warning;
					break;
				case "info":
					severity = Severity.Info;
					break;
			}
		}

		let diagnostic: Diagnostic = {
			start: { line, character: start },
			end: { line, character: end },
			severity,
			message: match[this.settings.message]
		};

		if (this.settings.code) {
			diagnostic.code = match[this.settings.code];
		}

		return diagnostic;
	};

	parseBuffer = (buffer: Buffer) => {
		let result: Diagnostic[] = [];
		let out = buffer.toString();
		let problemRegex = new RegExp(this.settings.regexp, "gm");

		let match: RegExpExecArray;
		while (match = problemRegex.exec(out)) {
			result.push(this.getDiagnostic(match));
		}

		return result;
	};

	initialize = (rootFolder: string): Thenable<InitializeResponse> => {
		return setMachineEnv(this.settings.machine);
	};

	onConfigurationChange = (settings: any, requestor: IValidationRequestor): void => {
		if (settings[this.settingsKey]) {
			this.updateSettings(settings[this.settingsKey]);
		}

		setMachineEnv(this.settings.machine);
		requestor.all();
	};

	validate = (document: IDocument): Promise<Diagnostic[]> => {
		let child = spawn("docker", `exec -i ${this.settings.container } ${this.settings.command }`.split(" "));
		child.stdin.write(document.getText());
		child.stdin.end();

		return new Promise<Diagnostic[]>((resolve, reject) => {
			let result: Diagnostic[] = [];
			let debugString = "";

			child.stderr.on("data", (data: Buffer) => {
				debugString += data.toString();
				result = result.concat(this.parseBuffer(data));
			});

			child.stdout.on("data", (data: Buffer) => {
				debugString += data.toString();
				result = result.concat(this.parseBuffer(data));
			});

			child.on("close", (code: string) => {
				result.push(getDebugDiagnostic(code + " | " + this.getDebugString(debugString)));
				resolve(result);
			});
		});
	};
}