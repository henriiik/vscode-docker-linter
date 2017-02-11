# Docker Linter

Docker linter is an extension for [Visual Studio Code](https://code.visualstudio.com/) that lets you run linters in docker containers.

Docker linter is avaliable on the [Visual Studio Marketplace](https://marketplace.visualstudio.com/#VSCode) and you can install it directly inside Code.

More information is avaliable on the marketplace or in the different subdirectories in the repository.

## Development

To start development of the extension you fist have to compile the server, which you can do from inside code with the build task, or from the commandline with `npm run compile`.

```sh
cd  ./server
npm install
code .
```

Then you have to compile and launch the extension.

```sh
cd  ./client
npm install
code .
```

Start build task, and then launch the extension with F5.