"use strict";

import { runSingleFileValidator } from "vscode-languageworker";
import { DockerLinterSettings, DockerLinterValidator } from "./docker-linter";

let perlDefaults: DockerLinterSettings = {
	machine: "default",
	container: "docker-linter",
	command: "perl -c",
	problemMatcher: "(.*) at ([^ ]*) line (\\d+)[.,]"
};

let perlValidator = new DockerLinterValidator(perlDefaults);

runSingleFileValidator(process.stdin, process.stdout, perlValidator);
