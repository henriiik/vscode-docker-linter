# Welcome to your first VS Code Language Worker Extension

## What's in the folder

This folder contains all of the files necessary for your language worker extension.

* *package.json* - this is the manifest file in which you declare your langauge worker extension. 
  The sample language worker is registered for JavaScript and adds an enablement setting to VSCode's
  setting infrastructure. If the enablement setting is set to true and a Javascript file is opened
  VSCode will activate the language worker and will ask the worker to validate JavaScript files.
* *extension.ts* - this is the main file where you will provide the implementation of your language worker.

## How to Run your Language Worker

First you need to compile the language worker. To do so simply press Ctrl+Shift+B 
(Cmd+Shift+B under Mac) to start the incremental Typescript compiler. To run your
language worker open a command prompt and switch to a test worker space folder
(e.g. c:\MyPlaygrouds\testLanguageWorker). Now start code and tell it to load your 
test language worker as well. Assuming the language worker got generated into 
C:\MyProject\MyFileLanguageWorker type the following into the command prompt:

``` 
code --extensionDevelopmentPath=C:\MyProject\MyFileLanguageWorker
```

and open your test work space folder using VSCode's Open Folder action. Now open the workspace 
settings and enable the test worker using:

```json
{
	"${extensionName}.enable": true
}
```

where `${extensionName}` is the extension's name you used when creating the extension. If you 
forgot the name open the package.json file and check the name property. In the example below
it is testWorker:

```json
{
	"name": "testWorker",
	"version": "0.0.1",
	"publisher": "vscode",
	...
}
``` 

Since the test worker is registered on JavaScritp files create one and open it. This will
start the test worker and the worker will validate Javascript files from now on.

# How to Debug your Language Worker

Compile your language worker as described above, open a command prompt, change directory
to your test workspace folder (e.g. c:\MyPlaygrouds\testLanguageWorker) and then execute 
the following command in the command prompt: 

``` 
code . --extensionDevelopmentPath=C:\MyProject\MyFileLanguageWorker --debugLanguageWorker:${publisher}.${extensionName}
```

where `${publisher}` is the publisher you used when creating the extension. If you forgot the
publisher look it up in the package.json of your extension.

Now attached VSCode's node debugger to your language worker by executing the launch config
`Attach to Language Worker`.

## Explore the API
You can explore the full set of our API when you open the file node_modules/vscode-languageWorker/lib/index.d.ts
