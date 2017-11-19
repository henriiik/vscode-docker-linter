"use strict";

import * as path from "path";
import { workspace, Disposable, ExtensionContext, window as Window } from "vscode";
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
		name: "perl",
		language: "perl+mojolicious"
	}, {
		name: "perlcritic",
		language: "perl+mojolicious"
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

	let outputChannel = Window.createOutputChannel("Docker Linter")

	let port = 6008;
	linters.forEach(linter => {
		port += 1;

		let serverModule = context.asAbsolutePath(path.join('server', 'server.js'));
		let debugOptions = { execArgv: ["--nolazy", "--inspect="+port] };

		let serverOptions: ServerOptions = {
			run: { module: serverModule, transport: TransportKind.ipc },
			debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
		};

		let clientOptions: LanguageClientOptions = {
			documentSelector: [linter.language],
			synchronize: {
				configurationSection: [`docker-linter.${linter.name}`, `docker-linter.debug`]
			},
			outputChannel: outputChannel,
		};

		let client = new LanguageClient(`Docker Linter: ${linter.name}`, serverOptions, clientOptions);
		let monitor = new SettingMonitor(client, `docker-linter.${linter.name}.enable`).start();
		context.subscriptions.push(monitor);
	});
}
