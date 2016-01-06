# perl/perlcritic playground

This is a minimal example of how to get up and running with the perl linters in docker.
## Running

Start the example with docker compose and open the folder in Code.

```shell
cd /path/to/docker-linter/playground-perl
docker-compose up
```

## The important bits

This is what makes the magic happen.

- `Dockerfile`
	- `perlcritic` is installed
- `docker-compose.yml`
	- `container_name` is set to `dancer-web`
- `.vscode/settings.json`
	- `docker-linter.perl.enable` is set to `true`
	- `docker-linter.perl.container` is set to `dancer-web`
	- `docker-linter.perl.severity` is set to `error`
	- `docker-linter.perlcritic.enable` is set to `true`
	- `docker-linter.perlcritic.container` is set to `dancer-web`
	- `docker-linter.perlcritic.severity` is set to `warning`
