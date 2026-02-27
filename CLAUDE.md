# CLAUDE.md — AI Assistant Guide for `aiaiai`

## Project Overview

This is the `aiaiai` repository (`marron1984/aiaiai`). It is currently in its initial setup phase with no source code committed yet.

This file serves as the primary reference for AI assistants working on this codebase. Update it as the project evolves.

## Repository Structure

```
aiaiai/
├── CLAUDE.md          # This file — AI assistant guidelines
└── (project files)    # To be added as the project develops
```

**Update this section** as directories and files are added to the project.

## Development Setup

### Prerequisites

<!-- Update with actual requirements once the tech stack is chosen -->
- Git

### Getting Started

```bash
git clone <repo-url>
cd aiaiai
# Add setup steps here as the project develops
```

## Development Workflow

### Branching Strategy

- Feature branches should follow the pattern: `claude/<description>-<id>` or `feature/<description>`
- Always create pull requests for code review before merging to the main branch

### Commit Messages

- Use clear, descriptive commit messages
- Start with an imperative verb (e.g., "Add", "Fix", "Update", "Remove")
- Keep the first line under 72 characters

### Code Style

<!-- Update with linting/formatting configuration once established -->
- Follow consistent formatting throughout the project
- Configure linters and formatters as the project grows

## Testing

<!-- Update with test framework and commands once established -->
```bash
# Add test commands here
```

## Building / Running

<!-- Update with build and run commands once established -->
```bash
# Add build/run commands here
```

## Key Conventions for AI Assistants

1. **Read before editing** — Always read a file before modifying it
2. **Minimal changes** — Only make changes that are directly requested; avoid over-engineering
3. **No secrets** — Never commit `.env` files, credentials, API keys, or other sensitive data
4. **Update this file** — When adding new tooling, frameworks, or conventions, update this CLAUDE.md accordingly
5. **Run tests** — Always run the test suite after making changes (once tests exist)
6. **Follow existing patterns** — Match the style and conventions already present in the codebase
