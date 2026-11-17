# Knowledge Tree View

A read-only Obsidian view of a personal knowledge tree. The viewer is bundled
inside `main.js`; there is no separate HTML file, server, build tool or runtime
dependency to install on a user's computer or phone.

Repository: [i2seys/knowledge-tree-view](https://github.com/i2seys/knowledge-tree-view).
This plugin is distributed through GitHub Releases and BRAT. Personal notes,
progress snapshots, vault settings, cloud credentials and absolute device paths
are not included in the plugin.

## Install with BRAT

1. Install and enable **BRAT** from Obsidian's Community plugins on each device.
2. In **BRAT → Add beta plugin**, enter **`i2seys/knowledge-tree-view`** or paste
   the [repository URL](https://github.com/i2seys/knowledge-tree-view).
3. Select **1.3.0** or **Latest**, install, and enable **Knowledge Tree View**.
4. Run **Knowledge Tree View: Открыть дерево знаний** from the command palette.

Release files: [version 1.3.0](https://github.com/i2seys/knowledge-tree-view/releases/tag/1.3.0).

BRAT chooses the vault's actual configuration directory, including custom
configuration folder names. Windows, macOS, Linux, Android and iOS do not need
different filesystem paths. BRAT installs GitHub release assets; it does not
install an arbitrary ZIP URL. Use an Obsidian version supported by BRAT.

The prepared ZIP can alternatively be used for manual installation: copy only
`main.js` and `manifest.json` into the vault configuration folder's
`plugins/knowledge-tree-view/` directory, then enable the plugin.

## Notes and everyday use

Keep topic notes inside `KnowledgeTree/topics/` relative to the vault root.
The folder itself is not a separate vault. Example **format**, not bundled data:

```yaml
---
id: topic-id
parent:
status: todo
order: 0
---
```

Each note needs a unique string `id`. `parent` references another topic ID;
blank means the tree root. Status values are `todo`, `studying`, and `known`.
`title` is optional and defaults to the filename. `order` is an optional finite
decimal number. Change properties and write explanations in Obsidian notes;
the tree updates when Obsidian's metadata cache updates. The UI is read-only.

Each topic card has a **↗** button that opens its Markdown note in a new Obsidian
tab. The tree stays open in its own tab. Clicking the card itself still expands
a branch or selects a leaf; dragging or pinching does not open a note. The action
is available on both branches and leaves, except the synthetic root. Standalone
browser mode does not show this Obsidian-specific control.

The viewer requests a topic ID. The plugin resolves its current file from vault
metadata before opening it, so renaming a note does not break the action. Deleted
notes and duplicate IDs are reported instead of creating a replacement file.

Titles beginning with **`(und)`** are shown at reduced opacity. Matching ignores
leading whitespace and letter case; no space is required after the prefix.
The prefix stays visible, and hovering, focusing or selecting restores opacity.
These branches and leaves remain clickable and included in all progress counts;
the prefix does not change their status or remove topics from the tree.

Only `id`, `parent`, `title`, `status`, `order` and a relative note path enter
the viewer. Bodies, positions and unrelated properties are never copied.
The plugin uses `metadataCache`, not reads of note contents. It never writes
notes or statuses. The release also does not read an external HTML file.

Viewing works offline once installed. A separate tool such as Remotely Save
can sync your notes; this plugin has no cloud keys or sync implementation.
Installing a plugin and syncing notes are separate steps on every device.
The manifest allows mobile use and the code avoids Node/Electron APIs.
Mock contract tests have passed; real-device mobile QA is still pending.

On mobile use the command palette, a Quick Action, or Obsidian's menu actions
to open the tree. There is no need to inspect hidden folders when using BRAT.

## Source and local build

`src/main.js` contains the bridge source. `src/viewer.html` is the empty viewer
code, with no topic snapshot. `python3 build.py` reproduces the root `main.js`.
Python is only a developer build tool; it is not required to use the plugin.
`manifest.json` and `versions.json` declare plugin and compatibility versions.
The unbundled bridge's HTML fallback exists only for local development.

## Releasing updates

1. Edit the code-only sources, update `manifest.json` and `versions.json`, and
   rebuild `main.js` with `python3 build.py`.
2. Check `node --check main.js` and commit the source and generated assets.
   Topic notes, curricula, vault configuration and credentials do not belong
   in this repository.
3. Create a version tag matching `manifest.json` exactly, without a `v` prefix.
   For the current version, use **`1.3.0`**.
4. GitHub Releases must include **`main.js`** and **`manifest.json`** as individual
   assets. `styles.css` is unnecessary because this viewer has inline styles.

The included `.github/workflows/release.yml` can publish those two assets when
the matching version tag is pushed. It first checks a reproducible build and JS
syntax. Merely creating these local files does not run that workflow.

Users install released versions through BRAT. Obsidian's ordinary **Browse**
list additionally requires a Community directory listing and its review process.

## References

- [BRAT](https://github.com/TfTHacker/obsidian42-brat)
- [BRAT release requirements](https://github.com/TfTHacker/obsidian42-brat/blob/main/BRAT-DEVELOPER-GUIDE.md)
- [Obsidian release and submission guide](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin)
- [Manifest schema](https://docs.obsidian.md/Reference/Manifest)
- [Mobile API restrictions](https://docs.obsidian.md/Plugins/Getting%20started/Mobile%20development)
- [Official Workspace and WorkspaceLeaf API](https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts)

## License

MIT. See `LICENSE`.
