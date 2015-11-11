# Functionality

Run linters for perl and python in your containers.

# Linters
- python
	- flake8
- perl
	- perl -c
	- perlcritic

# Installation

Open up VS Code and hit F1 and type ext select install and type docker-linter hit enter and reload window to enable.

You also have to install the specified linter in your container.

# Perl

Enable the linters with the following settings. For a more comprehensive guide, follow the link: https://github.com/henriiik/docker-linter/tree/master/playground-perl

```json
{
	"docker-linter.perl.enable": true,
	"docker-linter.perlcritic.enable": true,
}
```

Enable the linter with the following setting. For a more comprehensive guide, follow the link: https://github.com/henriiik/docker-linter/tree/master/playground-python

# Python

```json
{
	"docker-linter.flake8.enable": true,
}
```