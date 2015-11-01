import { SingleFileValidator, InitializeResponse, IValidationRequestor, IDocument, Diagnostic } from "vscode-languageworker";
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
export declare class DockerLinterValidator implements SingleFileValidator {
    private settings;
    constructor(defaults: DockerLinterSettings);
    updateSettings: (settings: DockerLinterSettings) => void;
    getDebugString: (extra: string) => string;
    getDiagnostic: (match: RegExpExecArray) => Diagnostic;
    parseBuffer: (buffer: Buffer) => Diagnostic[];
    initialize: (rootFolder: string) => Thenable<InitializeResponse>;
    onConfigurationChange: (_settings: {
        "docker-linter": DockerLinterSettings;
    }, requestor: IValidationRequestor) => void;
    validate: (document: IDocument) => Promise<Diagnostic[]>;
}
