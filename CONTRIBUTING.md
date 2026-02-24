# Contributing

This repository is part of the Kasstor ecosystem (Lit-based web components and tooling). It is licensed under Apache 2.0; contributions should comply with this license.

## Questions

For questions about how this project works or about new functionality, open a [GitHub Discussion](https://github.com/genexuslabs/lit-devkit/discussions) or use the repository’s [Issues](https://github.com/genexuslabs/lit-devkit/issues). Please specify that you are referring to this repository when asking.

## How you can contribute

Contributions are welcome when they:

- Fix a bug or correct erroneous behavior
- Improve extensibility or completeness of the project
- Enhance documentation or developer experience

In general, contributions should not substantially change existing behavior without discussion and should be useful for the project and its users.

Contributions are accepted on the **`main`** branch. All work should be done via GitHub Issues and Pull Requests.

## Before contributing

### 1. Find or open an issue

Every contribution should be tied to a GitHub issue that describes the problem or improvement.

- **Search [existing issues](https://github.com/genexuslabs/lit-devkit/issues)** to avoid duplicates and to see if the topic is already reported or fixed.
- If you find an open issue that matches, you can comment that you want to work on it and reference the issue in your PR later.
- If there is no issue yet, **open a new issue** with a clear description and, when relevant, steps to reproduce or a minimal example.

### 2. Reproduce on `main` (for bug fixes)

If you are fixing a bug, try to reproduce it using the latest `main` branch. If the issue no longer occurs on `main`, mention that in the issue so maintainers can close or update it.

## Reporting an issue

When opening an issue, please include:

- A clear **description** of the problem or proposed improvement
- **Steps to reproduce** (for bugs), or a minimal **code sample** that shows the desired use case
- Any relevant context (e.g. Node/OS version, package versions) if it might matter

Write the issue in **English** so the widest audience can participate.

## Submitting changes (Fork & Pull Request)

1. **Fork** the repository on GitHub.
2. **Create a branch** from `main` and make your changes there.
3. Ensure the project **builds without new errors or warnings** and that **tests pass** (see [Development](README.md#development) in the README).
4. Add **regression tests** that validate your change (see [Requirements for a good PR](#requirements-for-a-good-pr)).
5. Open a **Pull Request** against the `main` branch of this repository.

### PR review

Pull requests are reviewed by the maintainers. The result may be:

- **Approved** — changes are merged into the repository
- **Changes requested** — you will be asked to update the PR
- **Closed** — if the change is out of scope or superseded

### Requirements for a good PR

- **Build and tests:** The project must build and test successfully (e.g. `bun run build` and `bun run test` from the repo root) with no new errors or warnings.
- **Regression tests:** Each PR must include tests that validate the change (e.g. unit or integration tests that would fail without your fix or that cover the new behavior). This helps prevent regressions and documents the intended behavior.
- **Documentation:** Include documentation that describes the change—for example, updates to README, JSDoc, or API docs so that users and future contributors understand what was added or changed.
- **One issue per PR:** Each PR should address a single issue; reference the issue number in the PR description (e.g. “Fixes #123”).
- **PR description (in English):**
  - Use a **title** that clearly describes the change
  - Include the **issue number** (e.g. “Fixes #123” or “Closes #456”)
  - Add a short explanation of what was done and how to verify it, especially if the issue description is brief
- **Code style:** Follow the project’s style and run the formatter (e.g. Prettier) on changed files; see the repo’s documentation and tooling for details.

## Code of conduct

We expect respectful and constructive communication in issues, discussions, and pull requests. Our standards are described in [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
