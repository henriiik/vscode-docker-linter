# Docker Linter
Lint your stuff in your containers.

## OSX
```
code --extensionDevelopmentPath=/Users/henrik/Development/docker-linter --debugLanguageWorker=henriiik.docker-linter
docker run --rm -it --name=docker-linter --volume=/Users/henrik/Development/playground:/root/hello perl bash
```

## Windows
```
code --extensionDevelopmentPath=C:\GitHub\docker-linter --debugLanguageWorker=henriiik.docker-linter
docker run -it --rm --name=docker-linter --volume=/c/Users/playground:/root/hello perl bash
```

## TODO

- fix no container docker error
