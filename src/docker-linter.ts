import { runSingleFileValidator, SingleFileValidator, InitializeResponse, IValidationRequestor, IDocument, Diagnostic, Severity, Position, Files } from "vscode-languageworker";
import { exec, spawn } from "child_process";

export interface DockerLinterSettings {
	[index: string]: string;
	machine?: string;
	container?: string;
	command?: string;
	problemMatcher?: string;
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
	private defaults: DockerLinterSettings;
	private settings: DockerLinterSettings;

	constructor(defaults: DockerLinterSettings) {
		this.defaults = defaults;
		this.settings = {};
	}

	getSetting = (name: string): string => {
		return this.settings[name] || this.defaults[name];
	};

	getDebugString = (): string => {
		return [this.getSetting("machine"), this.getSetting("container"), this.getSetting("command"), this.getSetting("problemMatcher"), ""].join(" | ");
	};

	parseBuffer = (buffer: Buffer) => {
		let result: Diagnostic[] = [];
		let out = buffer.toString();
		let problemRegex = new RegExp(this.getSetting("problemMatcher"), "g");

		result.push(getDiagnostic(this.getDebugString() + out, 1, 0, Number.MAX_VALUE, Severity.Info));

		let match: RegExpExecArray;
		while (match = problemRegex.exec(out)) {
			result.push(getDiagnostic(match[1], parseInt(match[3], 10), 0, Number.MAX_VALUE, Severity.Error));
		}

		return result;
	};

	initialize = (rootFolder: string): Thenable<InitializeResponse> => {
		return setMachineEnv(this.getSetting("machine"));
	};

	onConfigurationChange = (_settings: { "docker-linter": DockerLinterSettings }, requestor: IValidationRequestor): void => {
		this.settings = (_settings["docker-linter"] || {});

		setMachineEnv(this.getSetting("machine"));
		requestor.all();
	};

	validate = (document: IDocument): Promise<Diagnostic[]> => {
		let child = spawn("docker", `exec -i ${this.getSetting("container") } ${this.getSetting("command") }`.split(" "));
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