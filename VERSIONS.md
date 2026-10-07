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
| v9 | `29275ea` | Full laptop catalogue (100 laptops), configuration picker, MacBook Air/Pro 2019 to M5 | https://claude.ai/artifact/9sizkP5wqunBqaB3iGpmFm |
| v10 | `de8abdf` | Supplied HP, Dell and Mac photos on every matching model | https://claude.ai/artifact/DXtfyuobPi1syq3ttZdtRr |
| v11 | `3e2087a` | Paper grain and warm washes on the cream backgrounds | https://claude.ai/artifact/GC513KaKyyVwr9V17qvvYx |
| v12 | `665bf0c` | Larger About hero photo, aligned to the heading and buttons | https://claude.ai/artifact/RRPJ5BJBTNn9eBeVaDSmAF |
| v13 | `8ca1468` | Bolder hero category pills with model counts and filtered links | https://claude.ai/artifact/31kq73CKsx1XqNZ4GS3m4s |
| v14 | `de9b470` | Client names moved to a cream band between the dark hero and preparation sections | https://claude.ai/artifact/3j8Rzc9wuQdzc2nzsnFkKs |
| v15 | `afaed00` | Bolder client names with red dot separators | https://claude.ai/artifact/NK2u6DT2aw2fcp99G317FW |
| v16 | `ee3c059` | Review fixes: copy matches catalogue, new share image, schema and table tidy-up | https://claude.ai/artifact/H7w8mD3Q65EjfxRRsLpA5W |
| v17 | `fe0bd50` | Redirects for old itrentals.in addresses and LAUNCH-GUIDE.md; looks the same as v16 | same as v16 |
| v18 | `a70e2ea` | Popular models moved directly below the scale selector on the home page | https://claude.ai/artifact/4HbpSdoEzRqVF47a41DPYT |
| v19 | `7b45e89` | Lakhendra Prasad's photo on the About page | https://claude.ai/artifact/FzvuVSEbswWNtTPP9ZF66K |
| v20 | `54471fe` | 'Need 25 or more devices?' section removed from every page | https://claude.ai/artifact/PevpeAvLUfkruFwz6GVJVX |
| v21 | `d6cd7fa` | About: Our footprint moved directly below Leadership | https://claude.ai/artifact/4GiREPGdefbcSx4jHUkYkS |
| v22 | `5d9b8c0` | Scroll-driven home page: cream hero laptop that boots as Apple, HP, Dell, Lenovo then IT Rentals; stacking 'How renting works' cards; office video that opens to full screen; ticking preparation checks | https://claude.ai/artifact/PAjP7KW3EqiZsbBdTWG6xY |
| v23 | `012535c` | Sharper 4K office video (full office floor, 10-second loop, size chosen per screen); fuller icon field around the hero laptop; 'Popular models' became 'Build your team's laptop': brand, processor, memory and storage boxes wired to a laptop that shows the logo and spec, with matching models and a quote link; 'How renting works' moved directly below it | https://claude.ai/artifact/SVtRER7haKRsnx4tJrYAq6 |
| v24 | `f8c7134` | 'Build your team's laptop' and the office video ('A full floor, working on day one') swapped places: the builder now follows the preparation section, the video follows the scale section | https://claude.ai/artifact/BWBKno11NZzN1q7bu1S1YE |
| v25 | `36039e2` | Polish pass: sentence-case labels instead of mono capitals; HP/Dell product shots on warm panels; calmer product cards; header tucks away on scroll down; closing 'Tell us what your team needs' band and large IT Rentals wordmark in the footer; smooth page-to-page transitions; phone layouts for industries (swipe), benefits (two columns) and footer cities | https://claude.ai/artifact/2D2z2xXhJ397jHFT9a9aFu |

## Going back to a version

- Ask Claude: "restore v6" (or "v6 hero with v8 About"). It is applied as a new commit, so later versions stay available.
- Yourself: `git checkout <commit>` then `npm run dev` to look at it; `git checkout claude/youthful-ritchie-9d6qp1` returns to the latest.
