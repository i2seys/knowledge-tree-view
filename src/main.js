'use strict';

const { Plugin, ItemView, Notice } = require('obsidian');

const VIEW_TYPE = 'knowledge-tree-view';
const TREE_DIRECTORY = 'KnowledgeTree';
const HTML_PATH = TREE_DIRECTORY + '/index.html';
const TOPICS_DIRECTORY = TREE_DIRECTORY + '/topics';
const TOPICS_PREFIX = TOPICS_DIRECTORY + '/';
const STATUSES = new Set(['todo', 'studying', 'known']);
const METADATA_FIELDS = ['id', 'parent', 'title', 'status', 'order'];
const DECIMAL_NUMBER = /^[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?$/;
// Development reads the local viewer. The release builder replaces this value.
const BUNDLED_HTML = null; // @bundle-html

function relevantPath(path) {
  return typeof path === 'string' && (path === TREE_DIRECTORY || path === TOPICS_DIRECTORY || path.startsWith(TOPICS_PREFIX));
}

function topicFiles(app) {
  return app.vault.getMarkdownFiles().filter(file => {
    if (typeof file.path !== 'string' || !file.path.startsWith(TOPICS_PREFIX)) return false;
    const segments = file.path.slice(TOPICS_PREFIX.length).split('/');
    return segments.every(part => part && !part.startsWith('.') && part !== '..');
  });
}

function textProperty(value, field, path, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string') throw new Error(path + ': свойство ' + field + ' должно быть строкой.');
  return value.trim() || fallback;
}

function collectNotes(app) {
  const files = topicFiles(app).sort((a, b) => a.path.localeCompare(b.path));

  return files.map(file => {
    const path = file.path.slice(TREE_DIRECTORY.length + 1);
    const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
    if (!frontmatter || typeof frontmatter !== 'object' || Array.isArray(frontmatter)) {
      throw new Error(path + ': свойства ещё не проиндексированы Obsidian или отсутствует YAML-блок.');
    }
    for (const field of METADATA_FIELDS) {
      const value = Object.prototype.hasOwnProperty.call(frontmatter, field) ? frontmatter[field] : undefined;
      if (value !== undefined && value !== null && !['string', 'number', 'boolean'].includes(typeof value)) {
        throw new Error(path + ': свойство ' + field + ' должно быть простым значением, без списков и объектов.');
      }
    }
    // Copy only the five named scalar fields. In particular, never send the
    // frontmatter object itself, its positions, other properties, or note text.
    const get = field => Object.prototype.hasOwnProperty.call(frontmatter, field) ? frontmatter[field] : undefined;
    const id = textProperty(get('id'), 'id', path, '');
    if (!id || /\s/.test(id) || id.length > 256) throw new Error(path + ': добавьте id без пробелов, длиной до 256 символов.');
    const parent = textProperty(get('parent'), 'parent', path, '');
    const basename = typeof file.basename === 'string' ? file.basename : file.path.split('/').pop().replace(/\.md$/i, '');
    const title = textProperty(get('title'), 'title', path, basename);
    const status = textProperty(get('status'), 'status', path, 'todo');
    if (!STATUSES.has(status)) throw new Error(path + ': допустимые статусы — todo, studying, known.');
    const rawOrder = get('order');
    if (typeof rawOrder === 'boolean') throw new Error(path + ': order должен быть конечным числом.');
    const normalizedOrder = typeof rawOrder === 'string' ? rawOrder.trim() : rawOrder;
    if (typeof normalizedOrder === 'string' && normalizedOrder !== '' && !DECIMAL_NUMBER.test(normalizedOrder)) {
      throw new Error(path + ': order должен быть конечным десятичным числом.');
    }
    const order = normalizedOrder === undefined || normalizedOrder === null || normalizedOrder === '' ? 0 : Number(normalizedOrder);
    if (!Number.isFinite(order)) throw new Error(path + ': order должен быть конечным числом.');
    return { path, id, parent, title, status, order };
  });
}

class KnowledgeTreeView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.frame = null;
    this.frameReady = false;
    this.timer = null;
    this.forceRefresh = false;
    this.lastPayload = null;
    this.lastError = null;
    this.closed = true;
    this.eventRefs = [];
    this.hostWindow = null;
    this.messageListener = null;
    this.openGeneration = 0;
    this.openingNote = false;
  }

  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return 'Дерево знаний'; }
  getIcon() { return 'git-fork'; }

  watch(owner, event, callback) {
    const reference = owner.on(event, callback);
    this.registerEvent(reference);
    this.eventRefs.push({ owner, reference });
  }

  async onOpen() {
    this.dispose();
    this.closed = false;
    const generation = ++this.openGeneration;
    this.contentEl.replaceChildren();
    Object.assign(this.contentEl.style, { padding: '0', overflow: 'hidden', height: '100%', minHeight: '0' });
    this.hostWindow = this.contentEl.ownerDocument.defaultView;
    this.messageListener = event => {
      if (this.closed || !this.frame || event.source !== this.frame.contentWindow) return;
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'knowledge-tree-open-note') {
        void this.openNote(event.data.id);
        return;
      }
      if (event.data.type !== 'knowledge-tree-ready' && event.data.type !== 'knowledge-tree-refresh') return;
      this.frameReady = true;
      this.queueRefresh(true);
    };
    this.hostWindow.addEventListener('message', this.messageListener);

    this.watch(this.app.metadataCache, 'changed', file => {
      if (relevantPath(file?.path)) this.queueRefresh(false);
    });
    this.watch(this.app.metadataCache, 'resolved', () => this.queueRefresh(false));
    this.watch(this.app.vault, 'create', file => {
      if (relevantPath(file?.path)) this.queueRefresh(false);
    });
    this.watch(this.app.vault, 'delete', file => {
      if (relevantPath(file?.path)) this.queueRefresh(false);
    });
    this.watch(this.app.vault, 'rename', (file, oldPath) => {
      if (relevantPath(file?.path) || relevantPath(oldPath)) this.queueRefresh(false);
    });

    try {
      // Releases carry their own viewer. Only unbundled development builds read
      // index.html from the vault; notes always use metadataCache, never bodies.
      const html = typeof BUNDLED_HTML === 'string' && BUNDLED_HTML.trim()
        ? BUNDLED_HTML
        : await this.app.vault.adapter.read(HTML_PATH);
      if (this.closed || generation !== this.openGeneration) return;
      if (typeof html !== 'string' || !html.trim()) throw new Error('Empty HTML');
      const frame = this.contentEl.ownerDocument.createElement('iframe');
      frame.setAttribute('title', 'Дерево знаний');
      frame.setAttribute('sandbox', 'allow-scripts');
      frame.setAttribute('referrerpolicy', 'no-referrer');
      Object.assign(frame.style, { width: '100%', height: '100%', border: '0', display: 'block', background: 'transparent' });
      this.frame = frame;
      frame.srcdoc = html;
      this.contentEl.append(frame);
    } catch (_error) {
      if (this.closed || generation !== this.openGeneration) return;
      const message = 'Не удалось открыть ' + HTML_PATH + '. Проверьте, что файл есть в этом хранилище.';
      this.contentEl.textContent = message;
      new Notice(message);
    }
  }

  async openNote(id) {
    if (this.closed || this.openingNote || typeof id !== 'string' || !id || id.length > 256 || /\s/.test(id)) return;
    this.openingNote = true;
    const generation = this.openGeneration;
    try {
      // Resolve a stable topic ID against current vault metadata, including
      // renames since the last render. The iframe cannot supply a file path.
      const matches = topicFiles(this.app).filter(file => {
        const value = this.app.metadataCache.getFileCache(file)?.frontmatter?.id;
        return typeof value === 'string' && value.trim() === id;
      });
      if (!matches.length) {
        new Notice('Заметка темы не найдена. Дождитесь синхронизации и обновите дерево.');
        return;
      }
      if (matches.length !== 1) {
        new Notice('У нескольких заметок одинаковый id. Исправьте свойства тем и обновите дерево.');
        return;
      }
      const leaf = this.app.workspace.getLeaf('tab');
      await leaf.openFile(matches[0], { active: true });
      if (!this.closed && generation === this.openGeneration) await this.app.workspace.revealLeaf(leaf);
    } catch (_error) {
      if (!this.closed && generation === this.openGeneration) {
        new Notice('Не удалось открыть заметку темы. Попробуйте ещё раз.');
      }
    } finally {
      if (generation === this.openGeneration) this.openingNote = false;
    }
  }

  queueRefresh(force) {
    if (this.closed) return;
    this.forceRefresh = this.forceRefresh || force;
    if (this.timer !== null) this.hostWindow.clearTimeout(this.timer);
    this.timer = this.hostWindow.setTimeout(() => {
      this.timer = null;
      const shouldForce = this.forceRefresh;
      this.forceRefresh = false;
      this.sendNotes(shouldForce);
    }, 250);
  }

  sendNotes(force = false) {
    if (this.closed || !this.frameReady || !this.frame?.contentWindow) return;
    try {
      const payload = { source: 'obsidian', notes: collectNotes(this.app) };
      const signature = JSON.stringify(payload);
      if (force || signature !== this.lastPayload || this.lastError !== null) {
        // A sandbox without allow-same-origin has an opaque origin. The exact
        // destination window is retained and incoming event.source is checked.
        this.frame.contentWindow.postMessage({ type: 'knowledge-tree-data', payload }, '*');
        this.lastPayload = signature;
      }
      this.lastError = null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось прочитать свойства тем.';
      if (force || message !== this.lastError) {
        this.frame.contentWindow.postMessage({ type: 'knowledge-tree-error', message }, '*');
        this.lastError = message;
      }
    }
  }

  dispose() {
    this.closed = true;
    ++this.openGeneration;
    if (this.timer !== null && this.hostWindow) this.hostWindow.clearTimeout(this.timer);
    this.timer = null;
    this.forceRefresh = false;
    this.openingNote = false;
    if (this.hostWindow && this.messageListener) this.hostWindow.removeEventListener('message', this.messageListener);
    this.messageListener = null;
    for (const { owner, reference } of this.eventRefs) owner.offref(reference);
    this.eventRefs = [];
    if (this.frame) {
      this.frame.remove();
      this.frame = null;
    }
    this.frameReady = false;
    this.lastPayload = null;
    this.lastError = null;
    this.hostWindow = null;
  }

  async onClose() { this.dispose(); }
}

module.exports = class KnowledgeTreePlugin extends Plugin {
  async onload() {
    this.registerView(VIEW_TYPE, leaf => new KnowledgeTreeView(leaf, this));
    const open = () => { void this.openTree(); };
    this.addRibbonIcon('git-fork', 'Открыть дерево знаний', open);
    this.addCommand({ id: 'open-knowledge-tree', name: 'Открыть дерево знаний', callback: open });
  }

  async openTree() {
    try {
      let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
      if (!leaf) {
        leaf = this.app.workspace.getLeaf('tab');
        await leaf.setViewState({ type: VIEW_TYPE, active: true });
      }
      await this.app.workspace.revealLeaf(leaf);
    } catch (_error) {
      new Notice('Не удалось открыть дерево знаний. Попробуйте включить плагин заново.');
    }
  }

  onunload() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      if (leaf.view instanceof KnowledgeTreeView) leaf.view.dispose();
      leaf.detach();
    }
  }
};
