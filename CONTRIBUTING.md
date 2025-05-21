# Contributing to GovAIrn

We love your input! We want to make contributing to GovAIrn as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

### Pull Requests

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

### Code Quality & Standards

- TypeScript is used throughout the project. Make sure your code has proper type declarations.
- Follow the existing code style. We use ESLint and Prettier for linting.
- Components should follow the design language established in the project.
- Keep accessibility in mind when developing UI components.

### Commit Message Guidelines

We use conventional commits to make the commit history more readable and to automatically generate changelogs.

Format: `<type>(<scope>): <subject>`

Types:
- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (formatting, etc)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools

### Reporting Bugs

We use GitHub issues to track public bugs. Report a bug by opening a new issue; it's that easy!

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## Setting Up Development Environment

1. Clone your fork of the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and configure your environment variables
4. Start the development server:
   ```bash
   npm run dev
   ```

## Style Guide

### Code Style

- Use camelCase for variables, functions, and instances
- Use PascalCase for component names and class names
- Use UPPERCASE_SNAKE_CASE for constants
- Use 2 spaces for indentation

### Component Structure

- Keep components focused on a single responsibility
- Extract reusable logic to custom hooks
- Use the shadcn/ui component guidelines for new UI components

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License. 