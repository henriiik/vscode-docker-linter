"use strict";

import * as path from "path";
import { workspace, Disposable, ExtensionContext } from "vscode";
import { LanguageClient, LanguageClientOptions, SettingMonitor, RequestType, TransportKind, ServerOptions } from "vscode-languageclient";

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
	}, {
		name: "rubocop",
		language: "ruby"
	}, {
		name: "php",
		language: "php"
	}
];

export function activate(context: ExtensionContext) {
	linters.forEach(linter => {

		let serverModule = context.asAbsolutePath(path.join('server', 'server.js'));
		let debugOptions = { execArgv: ["--nolazy", "--debug=6009"] };

		let serverOptions: ServerOptions = {
			run: { module: serverModule, transport: TransportKind.ipc },
			debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
		};

		let clientOptions: LanguageClientOptions = {
			documentSelector: [linter.language],
			synchronize: {
				configurationSection: `docker-linter.${linter.name}`
			}
		};

		let client = new LanguageClient(`Docker Linter: ${linter.name}`, serverOptions, clientOptions);
		let monitor = new SettingMonitor(client, `docker-linter.${linter.name}.enable`).start();
		context.subscriptions.push(monitor);
	});
}
