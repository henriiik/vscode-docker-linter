"use strict";
var vscode_languageworker_1 = require("vscode-languageworker");
var docker_linter_1 = require("./docker-linter");
var perlDefaults = {
    machine: "default",
    container: "docker-linter",
    command: "perl -c",
    regexp: "(.*) at ([^ ]*) line (\\d+)[.,]",
    message: 1,
    line: 3,
    column: 0,
    severity: 0,
    code: 0
};
var perlValidator = new docker_linter_1.DockerLinterValidator(perlDefaults);
vscode_languageworker_1.runSingleFileValidator(process.stdin, process.stdout, perlValidator);
//# sourceMappingURL=extension.js.map