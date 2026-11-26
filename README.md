# claude-config

Personal Claude Code setup: a plugin marketplace (`claude-config`) with a UI mod and personal skills, plus a copy of `~/.claude/settings.json`.

## Contents

| Path | What |
|---|---|
| `mods/usage-row` | Plugin `usage-row`: usage row above the prompt |
| `mods/nathan` | Plugin `nathan`: personal skills (`nathan:timesheet`, `nathan:write-to-client`, `nathan:asd-ste100`, `nathan:backlog-grooming`, `nathan:implement-parallel`) |
| `dotfiles/` | A copy of `settings.json`. `CLAUDE.md` is not stored here (public repo) |
| `scripts/` | `install.sh` and `sync-settings.sh` for the dotfiles |

### mods/usage-row

One row above the prompt, in monospace with fixed-width numbers so nothing shifts as values count down.

Left: `◔ 23% 228k/1M │ 5h 5% │ ↻ 3h36m`: a ring and percent for the chat's context window (an SVG ring on desktop, `○◔◑◕●` on the terminal), its tokens of the window, the 5-hour limit, and time until it resets. Levels are green, amber from 75%, red from 90%. Text uses the app's theme colors, so contrast holds in light and dark.

Right, while background work runs: `◉ 3 npm run dev +2`: the count, the first task's name, and how many more. Shells, monitors and workflows show when they start and leave when their notification says they ended; subagents update every second.

When a tip shows above it (Claude Code's built-in tips), the tip and the row draw as two bordered cards; with no tip the row takes no border rows.

Under the main thread's last reply it adds a dim monospace line, `cache 38:12`: the prompt cache's countdown (`· expiring` under 5 minutes, `cold` once expired). It follows a rewind to the reply that is then last.

### mods/nathan

Skills that were in `~/.claude/skills`. `asd-ste100` is a copy of [danyuchn/asd-ste100-skill](https://github.com/danyuchn/asd-ste100-skill) (MIT, see its LICENSE). Skills find their own files through `${CLAUDE_SKILL_DIR}`.

### dotfiles and scripts

- `scripts/install.sh`: copies `dotfiles/settings.json` to `~/.claude/settings.json` only when that file does not exist.
- `scripts/sync-settings.sh`: copies the live `~/.claude/settings.json` into `dotfiles/settings.json`. Run it, check the diff, then commit.

`settings.json` is a copy, not a link, because Claude Code rewrites the file. Never commit memory, `projects/`, the plugin cache, credentials or session data.

## Install

From a shell:

```bash
claude plugin marketplace add nhanhuynh296/claude-config
claude plugin install usage-row@claude-config
claude plugin install nathan@claude-config
./scripts/install.sh
```

At the prompt of a terminal session: `/plugin marketplace add nhanhuynh296/claude-config`, then `/plugin install nathan@claude-config`.

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `nhanhuynh296/claude-config`, then Add plugin.

This repository is private. Installing needs read access on GitHub and a git credential for github.com on the machine (an SSH key, or `gh auth login` then `gh auth setup-git`).

## Develop

```bash
claude plugin validate .
claude plugin validate mods/nathan
claude plugin test mods/usage-row
```

Bump `version` in the plugin's `.claude-plugin/plugin.json` before pushing, then `claude plugin marketplace update claude-config`, `claude plugin update <plugin>@claude-config` and `/reload-plugins`.
