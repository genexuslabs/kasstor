<p align="center">
  <img src="./kasstor-logo.png" alt="kasstor logo" height="120px"/>
  <br>

  <h1 align="center">Kasstor - The natural builder for the web platform</h1>

</p>

<p align="center">
<em>Kasstor is an ecosystem for building and testing web component libraries based on <a href="https://lit.dev" target="_blank">Lit<a>.</em>
<br>

</p>

<center>

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

</center>

<hr>

## Documentation

### Decorators

- `Component`: Define a Lit custom element with support for setting Shadow Root Options, global styles and more.
- `Event`: An easier way to define and dispatch Custom DOM Events.
- `Observe`: Define a callback to execute when observed properties change, e.g. `@property` or `@state`, but before the component updates.

## Install

```bash
npm i @genexus/kasstor-core
```

## Contributing to Kasstor

Kasstor is open source and we appreciate issue reports and pull requests. See [CONTRIBUTING.md](./CONTRIBUTING.md) for more information.

### Setting up the repo for development

Install Bun

```bash
npm i -g bun
```

Initialize repo:

```bash
git clone https://github.com/genexuslabs/kasstor
cd kasstor
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
