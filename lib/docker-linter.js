var vscode_languageworker_1 = require("vscode-languageworker");
var child_process_1 = require("child_process");
function getDebugDiagnostic(message) {
    return {
        start: { line: 1, character: 0 },
        end: { line: 1, character: Number.MAX_VALUE },
        severity: vscode_languageworker_1.Severity.Info,
        message: message
    };
}
function setMachineEnv(machine) {
    return new Promise(function (resolve, reject) {
        child_process_1.exec("docker-machine env " + machine + " --shell bash", function (error, stdout, stderr) {
            if (error) {
                var errString = stderr.toString();
                resolve({
                    success: false,
                    message: errString,
                    retry: false
                });
            }
            var out = stdout.toString();
            var envRegex = /export (.+)="(.+)"\n/g;
            var match;
            while (match = envRegex.exec(out)) {
                process.env[match[1]] = match[2];
            }
            resolve({ success: true });
        });
    });
}
function isInteger(value) {
    return isFinite(value) && Math.floor(value) === value;
}
var DockerLinterValidator = (function () {
    function DockerLinterValidator(defaults) {
        var _this = this;
        this.updateSettings = function (settings) {
            _this.settings.machine = settings.machine || _this.settings.machine;
            _this.settings.container = settings.container || _this.settings.container;
            _this.settings.command = settings.command || _this.settings.command;
            _this.settings.regexp = settings.regexp || _this.settings.regexp;
            _this.settings.line = settings.line || _this.settings.line;
            _this.settings.message = settings.message || _this.settings.message;
            _this.settings.code = isInteger(settings.code) ? settings.code : _this.settings.code;
            _this.settings.column = isInteger(settings.column) ? settings.column : _this.settings.column;
            _this.settings.severity = isInteger(settings.severity) ? settings.severity : _this.settings.severity;
        };
        this.getDebugString = function (extra) {
            return [_this.settings.machine, _this.settings.container, _this.settings.command, _this.settings.regexp, extra].join(" | ");
        };
        this.getDiagnostic = function (match) {
            var line = parseInt(match[_this.settings.line], 10);
            var start = 0;
            var end = Number.MAX_VALUE;
            if (_this.settings.column) {
                start = end = parseInt(match[_this.settings.column], 10);
            }
            var severity = vscode_languageworker_1.Severity.Error;
            if (_this.settings.severity) {
                switch (match[_this.settings.severity]) {
                    case "warning":
                        severity = vscode_languageworker_1.Severity.Warning;
                        break;
                    case "info":
                        severity = vscode_languageworker_1.Severity.Info;
                        break;
                }
            }
            var diagnostic = {
                start: { line: line, character: start },
                end: { line: line, character: end },
                severity: severity,
                message: match[_this.settings.message]
            };
            if (_this.settings.code) {
                diagnostic.code = match[_this.settings.code];
            }
            return diagnostic;
        };
        this.parseBuffer = function (buffer) {
            var result = [];
            var out = buffer.toString();
            var problemRegex = new RegExp(_this.settings.regexp, "gm");
            var match;
            while (match = problemRegex.exec(out)) {
                result.push(_this.getDiagnostic(match));
            }
            return result;
        };
        this.initialize = function (rootFolder) {
            return setMachineEnv(_this.settings.machine);
        };
        this.onConfigurationChange = function (_settings, requestor) {
            if (_settings["docker-linter"]) {
                _this.updateSettings(_settings["docker-linter"]);
            }
            setMachineEnv(_this.settings.machine);
            requestor.all();
        };
        this.validate = function (document) {
            var child = child_process_1.spawn("docker", ("exec -i " + _this.settings.container + " " + _this.settings.command).split(" "));
            child.stdin.write(document.getText());
            child.stdin.end();
            return new Promise(function (resolve, reject) {
                var result = [];
                var debugString = "";
                child.stderr.on("data", function (data) {
                    debugString += data.toString();
                    result = result.concat(_this.parseBuffer(data));
                });
                child.stdout.on("data", function (data) {
                    debugString += data.toString();
                    result = result.concat(_this.parseBuffer(data));
                });
                child.on("close", function (code) {
                    result.push(getDebugDiagnostic(code + " | " + _this.getDebugString(debugString)));
                    resolve(result);
                });
            });
        };
        this.settings = defaults;
    }
    return DockerLinterValidator;
})();
exports.DockerLinterValidator = DockerLinterValidator;
//# sourceMappingURL=docker-linter.js.map