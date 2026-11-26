# Implementer report

Write to `<notes dir>/<ticket-id>.md`, then hand back only that path.

```markdown
# <ticket-id>: <ticket title>

Branch: <branch>
Head: <commit SHA>

## Changed files
- `path/to/file`: <one-line reason>

## Tests created
- `path/to/test`

## Contracts
- <API, schema, migration, or shared type added or changed>: <what changed>

## Conflict risks
- `path/to/file`: <what you changed in a file named in your conflict warnings, and why>
```

Every changed file appears under **Changed files**. A section with nothing to list reads `none`.
