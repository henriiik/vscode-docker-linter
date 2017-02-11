# Functionality

Run linters for perl, python and/or ruby in your containers.

- perl
	- `perl -c`
	- `perlcritic`
- python
	- `flake8`
- ruby
	- `rubocop`

# Installation

1. Install the linter you want in your development environment.
2. Install docker-linter in VS Code with the "Install Extension" command.
3. Enable the linter of your choise in your workspace settings.

# Perl

For a more comprehensive example, follow the link: https://github.com/henriiik/vscode-docker-linter/tree/master/playground-perl

`perl -c` quickstart:

1. Set `docker-linter.perl.enable` to `true` in your workspace settings.
2. Set `docker-linter.perl.container` to the name the container with your perl environment.

`perlcritic` quickstart:

1. Install `perlcritic` in your perl-environment container (`cpanm Perl::Critic`).
2. Set `docker-linter.perlcritic.enable` to `true` in your workspace settings.
3. Set `docker-linter.perlcritic.container` to the name the container with your perl environment.

# Python

For a more comprehensive example, follow the link: https://github.com/henriiik/vscode-docker-linter/tree/master/playground-python

`flake8` quickstart:

1. Install `flake8` in your python-environment container (`pip install flake8`).
2. Set `docker-linter.flake8.enable` to `true` in your workspace settings.
3. Set `docker-linter.flake8.container` to the name the container with your python environment.

# Ruby

For a more comprehensive example, follow the link: https://github.com/henriiik/vscode-docker-linter/tree/master/playground-ruby

`rubocop` quickstart:

1. Install `rubocop` in your ruby-environment container (`gem install rubocop`).
2. Set `docker-linter.rubocop.enable` to `true` in your workspace settings.
3. Set `docker-linter.rubocop.container` to the name the container with your ruby environment.

# docker-machine

The extension assumes you are running your containers with the docker-machine default setup.

If you have use another name for your docker-machine you can use the setting `docker-linter.**linter**.machine` to specify that name.

Or, if you dont use docker-machine at all, you can specify an empty string.