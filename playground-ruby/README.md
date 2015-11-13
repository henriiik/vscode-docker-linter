# rubocop playground

This is an example of how to get up and running with the rubocop linter and the sinatra web framework in docker.

## Running

Start the example with docker compose and open the folder in Code.

```shell
cd /path/to/docker-linter/playground-ruby
docker-compose up
```

## The important bits

This is what makes the magic happen.

- `Dockerfile`
	- `rubocop` is installed with `gem`
- `docker-compose.yml`
	- `container_name` is set to `sinatra-web`
- `.vscode/settings.json`
	- `docker-linter.rubocop.enable` is set to `true`.
	- `docker-linter.rubocop.container` is set to `sinatra-web` (same as in `docker-compose.yml`).
