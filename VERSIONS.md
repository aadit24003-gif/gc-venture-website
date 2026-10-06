# Design versions

Every design iteration is a commit on this branch, so any version can be rebuilt or restored.
Frozen preview links never change after they are published; the main preview link always shows the latest version.

- **Latest (always current):** https://claude.ai/artifact/UXmc6MUGqpbxa1iZFVqy4J

| Version | Commit | What changed | Frozen preview |
|---|---|---|---|
| v1 | `8091a30` | First build | (rebuild on request) |
| v2 | `d50bde5` | Laptop hero, new menu | (rebuild on request) |
| v3 | `f969d4d` | Preparation section, 10-laptop minimum, no switches/firewalls | (rebuild on request) |
| v4 | `d27dced` | Brand photos on every product | (rebuild on request) |
| v5 | `b6d1c00` | Library icons around the hero laptop | (rebuild on request) |
| v6 | `2f0b154` | Serif type, restrained palette, dark hero stage | (rebuild on request) |
| v7 | `42dc259` | About page expanded (team, two partners, how we work) | (rebuild on request) |
| v8 | `64e575c` | About with real photos, story below leadership | https://claude.ai/artifact/2phjS8Tk6wsS8wxbfMvFMi |
| v9 | (this commit) | Full laptop catalogue (100 laptops), configuration picker, MacBook Air/Pro 2019 to M5 | (see below once published) |

## Going back to a version

- Ask Claude: "restore v6" (or "v6 hero with v8 About"). It is applied as a new commit, so later versions stay available.
- Yourself: `git checkout <commit>` then `npm run dev` to look at it; `git checkout claude/youthful-ritchie-9d6qp1` returns to the latest.
