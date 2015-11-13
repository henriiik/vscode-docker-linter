# flake8 playground

This is an example of how to get up and running with the flake8 linter in docker. Based on the docker-compose example of how to get started with flask.

## Running

Start the example with docker compose and open the folder in Code.

```shell
cd /path/to/docker-linter/playground-python
docker-compose up
```

## The important bits

This is what makes the magic happen.

- `Dockerfile`
	- `flake8` is installed via `pip`
- `docker-compose.yml`
	- `container_name` is set to `flask-web`
- `.vscode/settings.json`
	- `docker-linter.flake8.enable` is set to `true`
	- `docker-linter.flake8.container` is set to `flask-web`
