# Repository Guidelines

## Project Structure & Module Organization

This repository contains a small bank prediction DNN system with JavaScript and Go implementations.

- `index.js` is the Express server and API entry point.
- `dnn.js` contains the JavaScript matrix and DNN implementation.
- `public/index.html` is the browser dashboard.
- `bank_project/` contains the Go implementation (`main.go`, `go.mod`) and generated model artifacts.
- `rag_data.json` holds optional lookup/context data used by API responses.
- `hello/` contains separate Go/PDF/image experiments and should be treated as independent work unless a task explicitly targets it.

Generated files, caches, local environments, and model weights should stay out of Git unless there is a specific reason to version them.

## Build, Test, and Development Commands

- `npm.cmd run build` checks JavaScript syntax for `index.js` and `dnn.js`.
- `npm.cmd start` starts the Express server on `http://localhost:3000` by default.
- `npm.cmd test` currently fails intentionally because no test runner is configured.
- `go run .` from `bank_project/` trains and verifies the Go DNN implementation.

Use `npm.cmd` on Windows PowerShell if `npm.ps1` is blocked by execution policy.

## Coding Style & Naming Conventions

Use CommonJS style in Node files (`require`, `module.exports`) to match the existing project. Prefer `const` and `let`, two-space indentation in JavaScript, and clear camelCase names for functions and variables. Go code should use standard `gofmt` formatting and exported names only when needed outside the package.

Keep comments short and useful. Avoid broad refactors when fixing a narrow API or model issue.

## Testing Guidelines

No formal JavaScript test framework is configured yet. For now, verify changes with:

- `npm.cmd run build`
- API smoke tests against `/api/info`, `/api/predict`, and `/api/learn`
- `go run .` inside `bank_project/` for Go model behavior

If tests are added, place JavaScript tests near the relevant module or in a `test/` directory, and use names like `dnn.test.js`.

## Commit & Pull Request Guidelines

Recent history uses short imperative commit messages, such as `Stop tracking local cache files`. Keep commits focused and avoid mixing generated artifacts with source changes.

Pull requests should include a short summary, verification commands run, and screenshots for dashboard UI changes. Mention any generated files intentionally added or ignored.

## Security & Configuration Tips

Keep `.env`, model weights, caches, and local tooling directories untracked. Do not commit credentials, GitHub tokens, or machine-specific DNS/network settings.
