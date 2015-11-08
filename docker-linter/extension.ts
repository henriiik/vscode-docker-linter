"use strict";
import * as path from "path";
import { workspace, Disposable, ExtensionContext } from "vscode";
import { LanguageClient, LanguageClientOptions, SettingMonitor, RequestType } from "vscode-languageclient";

interface DockerLinter {
	name: string;
	language: string;
}

let linters: DockerLinter[] = [
	{
		name: "perl",
		language: "perl"
	}, {
		name: "perlcritic",
		language: "perl"
	}, {
		name: "flake8",
		language: "python"
	}
];

export function activate(context: ExtensionContext) {
	linters.forEach(linter => {

		// We need to go one level up since an extension compile the js code into
		// the output folder.
		let serverModule = path.join(__dirname, "..", "server", "server.js");
		let debugOptions = { execArgv: ["--nolazy", "--debug=6004"] };
		let serverOptions = {
			run: { module: serverModule },
			debug: { module: serverModule, options: debugOptions }
		};

		let clientOptions: LanguageClientOptions = {
			documentSelector: [linter.language],
			synchronize: {
				configurationSection: `docker-linter.${linter.name}`
			}
		};

		let client = new LanguageClient(`Docker Linter: ${linter.name}`, serverOptions, clientOptions);
		context.subscriptions.push(new SettingMonitor(client, `docker-linter.${linter.name}.enable`).start());
	});
}