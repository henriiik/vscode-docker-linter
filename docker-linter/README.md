# Functionality

Docker linter lets you run linters in docker containers.

# linters

Currently the following linters are supported

## Perl

- perl -c
- perlcritic

## Pyhon

- flake8

# Installation

Open up VS Code and hit F1 and type ext select install and type docker-linter hit enter and reload window to enable.

You also have to install the specified linter in your container.

# Settings

## Common

```json
{
	"docker-linter.*linter*.enable": true, // Enable a linter
	"docker-linter.*linter*.container": "some-container-name", // Specify in which container the linter should be run
}

```

## Perl

### perl -c

```json
{
	// Add the following setting to your workspace.
	"docker-linter.perl.enable": true,
}
```

### perlcritic

```json
{
	// Add the following setting to your workspace.
	"docker-linter.perlcritic.enable": true,
}
```

# Python

```json
{
	// Add the following settings to your workspace.
	"docker-linter.flake8.enable": true,
}
```