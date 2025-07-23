<center>

# Lit DevKit

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![GitHub Release](https://img.shields.io/github/release/genexuslabs/lit-devkit.svg?style=flat)]()

A set of utilities to build and test Lit applications and libraries.

</center>

## Features

- Decorators:
  - `Component`: Define a Lit custom element with support for setting Shadow Root Options, global styles and more.
  - `Event`: An easier way to define and dispatch Custom DOM Events.
  - `Watch`: Define a callback to execute when observed properties change, e.g. `@property` or `@state`, but before the component updates.

## Install

```bash
npm i @genexus/lit-devkit
```

## Contributing to Lit DevKit

Lit DevKit is open source and we appreciate issue reports and pull requests. See [CONTRIBUTING.md](./CONTRIBUTING.md) for more information.

### Setting up the repo for development

Install Bun

```bash
npm i -g bun
```

Initialize repo:

```bash
git clone https://github.com/genexuslabs/lit-devkit
cd lit-devkit
bun i
```

Build the repo:

```bash
bun run build
```

Test the repo:

```bash
bun run test
```

