'use strict';

const { Plugin, ItemView, Notice } = require('obsidian');

const VIEW_TYPE = 'knowledge-tree-view';
const TREE_DIRECTORY = 'KnowledgeTree';
const HTML_PATH = TREE_DIRECTORY + '/index.html';
const TOPICS_DIRECTORY = TREE_DIRECTORY + '/topics';
const TOPICS_PREFIX = TOPICS_DIRECTORY + '/';
const ROOT_ID = 'knowledge-root';
const NEXT_STATUS = new Map([['todo', 'studying'], ['studying', 'known']]);
const STATUSES = new Set(['todo', 'studying', 'known']);
const METADATA_FIELDS = ['id', 'parent', 'title', 'status', 'order'];
const REVIEW_FIELDS = ['learned_on', 'reviewed_on', 'review_interval_days', 'review_exempt'];
const DEFAULT_REVIEW_RULES = Object.freeze({
  first: 7, cap: 365, againMin: 3,
  hardMin: 7, hardMul: 1.2, goodMin: 14, goodMul: 2, easyMin: 21, easyMul: 3
});
const REVIEW_GRADES = new Set(['again', 'hard', 'good', 'easy']);
const REVIEW_DAY_FIELDS = ['first', 'cap', 'againMin', 'hardMin', 'goodMin', 'easyMin'];
const REVIEW_MULTIPLIER_FIELDS = ['hardMul', 'goodMul', 'easyMul'];
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

function validTopicId(id) {
  return typeof id === 'string' && id.length > 0 && id.length <= 256 && !/\s/.test(id);
}

class TopicError extends Error {}
class NoStatusChange extends Error {}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function localDay() {
  const date = new Date();
  const pad = number => String(number).padStart(2, '0');
  return String(date.getFullYear()).padStart(4, '0') + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function calendarDay(value) {
  if (typeof value !== 'string') return undefined;
  const day = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day.startsWith('0000')) return undefined;
  const date = new Date(day + 'T00:00:00Z');
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === day ? day : undefined;
}

function validInterval(value) {
  return Number.isInteger(value) && value >= 1 && value <= 3650;
}

function reviewMetadata(frontmatter, today) {
  const result = {};
  for (const key of ['learned_on', 'reviewed_on']) {
    const day = calendarDay(frontmatter[key]);
    if (day && day <= today) result[key] = day;
  }
  const raw = frontmatter.review_interval_days;
  const days = typeof raw === 'string' && /^\d{1,4}$/.test(raw.trim()) ? Number(raw.trim()) : raw;
  if (validInterval(days)) result.review_interval_days = days;
  const exempt = frontmatter.review_exempt;
  if (exempt === true || typeof exempt === 'string' && exempt.trim().toLowerCase() === 'true') result.review_exempt = true;
  return result;
}

function normalizeRules(input) {
  const rules = {};
  if (!isRecord(input)) throw new TopicError('Проверьте настройки сроков.');
  for (const key of REVIEW_DAY_FIELDS) {
    if (!validInterval(input[key])) throw new TopicError('Сроки должны быть целыми числами от 1 до 3650 дней.');
    rules[key] = input[key];
  }
  for (const key of REVIEW_MULTIPLIER_FIELDS) {
    const value = input[key];
    if (typeof value !== 'number' || value < 1 || value > 10 || value !== Math.round(value * 10) / 10) {
      throw new TopicError('Множитель должен быть от 1 до 10 с шагом 0,1.');
    }
    rules[key] = value;
  }
  if (REVIEW_DAY_FIELDS.some(key => rules[key] > rules.cap)) {
    throw new TopicError('Максимальный срок должен быть не меньше остальных сроков и минимумов.');
  }
  return rules;
}

function currentStatus(frontmatter) {
  const value = frontmatter.status;
  const status = normalizeStatus(value == null ? 'todo' : typeof value === 'string' ? value.trim() || 'todo' : null);
  if (!STATUSES.has(status)) throw new TopicError('Допустимые статусы — todo, studying, known.');
  return status;
}

function normalizeStatus(status) {
  return status === 'repeated' ? 'known' : status;
}

function requestedInterval(rules, grade, previous) {
  if (!REVIEW_GRADES.has(grade)) throw new TopicError('Выберите, как прошёл повтор.');
  if (grade === 'again') return rules.againMin;
  const tenths = Math.round(rules[grade + 'Mul'] * 10);
  return Math.min(rules.cap, Math.max(rules[grade + 'Min'], Math.ceil(previous * tenths / 10)));
}

function validRequestId(value) {
  return Number.isSafeInteger(value) && value >= 0
    || typeof value === 'string' && value.length > 0 && value.length <= 128;
}

function findTopic(app, id) {
  const matches = topicFiles(app).filter(file => {
    const value = app.metadataCache.getFileCache(file)?.frontmatter?.id;
    return typeof value === 'string' && value.trim() === id;
  });
  if (!matches.length) throw new TopicError('Заметка темы не найдена. Дождитесь синхронизации и обновите дерево.');
  if (matches.length !== 1) throw new TopicError('У нескольких заметок одинаковый id. Исправьте свойства тем и обновите дерево.');
  return matches[0];
}

function collectNotes(app) {
  const files = topicFiles(app).sort((a, b) => a.path.localeCompare(b.path));
  const today = localDay();

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
    // Send only named, normalized fields. Note content and arbitrary properties
    // must not cross the sandbox bridge.
    const get = field => Object.prototype.hasOwnProperty.call(frontmatter, field) ? frontmatter[field] : undefined;
    const id = textProperty(get('id'), 'id', path, '');
    if (!validTopicId(id)) throw new Error(path + ': добавьте id без пробелов, длиной до 256 символов.');
    const parent = textProperty(get('parent'), 'parent', path, '');
    const basename = typeof file.basename === 'string' ? file.basename : file.path.split('/').pop().replace(/\.md$/i, '');
    const title = textProperty(get('title'), 'title', path, basename);
    const status = normalizeStatus(textProperty(get('status'), 'status', path, 'todo'));
    if (!STATUSES.has(status)) throw new Error(path + ': допустимые статусы — todo, studying, known.');
    const rawOrder = get('order');
    if (typeof rawOrder === 'boolean') throw new Error(path + ': order должен быть конечным числом.');
    const normalizedOrder = typeof rawOrder === 'string' ? rawOrder.trim() : rawOrder;
    if (typeof normalizedOrder === 'string' && normalizedOrder !== '' && !DECIMAL_NUMBER.test(normalizedOrder)) {
      throw new Error(path + ': order должен быть конечным десятичным числом.');
    }
    const order = normalizedOrder === undefined || normalizedOrder === null || normalizedOrder === '' ? 0 : Number(normalizedOrder);
    if (!Number.isFinite(order)) throw new Error(path + ': order должен быть конечным числом.');
    return { path, id, parent, title, status, order, ...reviewMetadata(frontmatter, today) };
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
      if (event.data.type === 'knowledge-tree-cycle-status') {
        void this.cycleStatus(event.data.id);
        return;
      }
      if (event.data.type === 'knowledge-tree-review' || event.data.type === 'knowledge-tree-review-rules') {
        void this.applyReviewRequest(event.data);
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
    if (this.closed || this.openingNote || !validTopicId(id)) return;
    this.openingNote = true;
    const generation = this.openGeneration;
    try {
      // Resolve the topic again so renames since the last render are supported.
      const file = findTopic(this.app, id);
      const leaf = this.app.workspace.getLeaf('tab');
      await leaf.openFile(file, { active: true });
      if (!this.closed && generation === this.openGeneration) await this.app.workspace.revealLeaf(leaf);
    } catch (error) {
      if (!this.closed && generation === this.openGeneration) {
        new Notice(error instanceof TopicError ? error.message : 'Не удалось открыть заметку темы. Попробуйте ещё раз.');
      }
    } finally {
      if (generation === this.openGeneration) this.openingNote = false;
    }
  }

  async cycleStatus(id) {
    if (this.closed || !this.frameReady || !validTopicId(id) || id === ROOT_ID) return;
    const generation = this.openGeneration;
    try {
      await this.plugin.advanceTopicStatus(id);
      if (!this.closed && generation === this.openGeneration) this.queueRefresh(false);
    } catch (error) {
      if (!this.closed && generation === this.openGeneration) {
        const detail = error instanceof TopicError ? error.message : 'Попробуйте ещё раз.';
        new Notice('Не удалось изменить статус. ' + detail);
      }
    }
  }

  async applyReviewRequest(request) {
    if (!this.frameReady || !validRequestId(request.requestId)) return;
    const generation = this.openGeneration;
    const frame = this.frame;
    const result = { type: 'knowledge-tree-review-result', requestId: request.requestId, ok: true };
    try {
      if (request.type === 'knowledge-tree-review-rules') {
        await this.plugin.updateReviewRules(request.rules);
      } else {
        await this.plugin.updateReview(request);
      }
    } catch (error) {
      result.ok = false;
      result.message = error instanceof TopicError ? error.message : 'Не удалось сохранить изменения. Попробуйте ещё раз.';
    }
    if (this.closed || generation !== this.openGeneration || frame !== this.frame) return;
    frame.contentWindow.postMessage(result, '*');
    this.queueRefresh(false);
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
      const payload = { source: 'obsidian', notes: collectNotes(this.app), reviewRules: this.plugin.reviewRules };
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
  statusWrites = new Map();
  rulesWrite = Promise.resolve();
  reviewRules = DEFAULT_REVIEW_RULES;

  async onload() {
    try {
      const data = await this.loadData();
      if (data?.reviewRules !== undefined) this.reviewRules = normalizeRules(data.reviewRules);
    } catch {
      this.reviewRules = DEFAULT_REVIEW_RULES;
    }
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

  async writeTopic(id, edit) {
    if (!validTopicId(id) || id === ROOT_ID) throw new TopicError('Не найдена карточка для записи.');
    // Serialize operations for this note, including changes from another view.
    const previous = this.statusWrites.get(id) ?? Promise.resolve();
    const write = previous.catch(() => {}).then(async () => {
      const file = findTopic(this.app, id);
      await this.app.fileManager.processFrontMatter(file, frontmatter => {
        if (typeof frontmatter.id !== 'string' || frontmatter.id.trim() !== id) {
          throw new TopicError('Заметка изменилась. Обновите дерево.');
        }
        edit(frontmatter, currentStatus(frontmatter));
      });
    });
    this.statusWrites.set(id, write);
    try {
      await write;
    } finally {
      if (this.statusWrites.get(id) === write) this.statusWrites.delete(id);
    }
  }

  async advanceTopicStatus(id) {
    try {
      await this.writeTopic(id, (frontmatter, status) => {
        const next = NEXT_STATUS.get(status);
        // Abort the frontmatter transaction as well as the status change.
        if (!next) throw new NoStatusChange();
        frontmatter.status = next;
        if (next === 'known') {
          frontmatter.learned_on = localDay();
          frontmatter.review_interval_days = this.reviewRules.first;
          delete frontmatter.reviewed_on;
        }
      });
    } catch (error) {
      if (!(error instanceof NoStatusChange)) throw error;
    }
  }

  async updateReview({ id, action, day, grade, exempt, expected, previewInterval }) {
    if (!['record', 'correct', 'reset', 'set-exempt'].includes(action) || !isRecord(expected)
      || action === 'set-exempt' && typeof exempt !== 'boolean') {
      throw new TopicError('Не удалось распознать действие с карточкой. Откройте её заново.');
    }
    await this.writeTopic(id, (frontmatter, status) => {
      const today = localDay();
      const review = reviewMetadata(frontmatter, today);
      if (status !== normalizeStatus(expected.status) || REVIEW_FIELDS.some(key => review[key] !== expected[key])) {
        throw new TopicError('Карточка изменилась. Откройте её заново.');
      }
      if (status !== 'known') {
        throw new TopicError('Повторение доступно для изученной карточки.');
      }
      if (action === 'reset') {
        frontmatter.status = 'todo';
        for (const key of REVIEW_FIELDS) delete frontmatter[key];
        return;
      }
      if (action === 'set-exempt') {
        frontmatter.status = 'known';
        if (exempt) frontmatter.review_exempt = true;
        else delete frontmatter.review_exempt;
        return;
      }
      if (review.review_exempt) throw new TopicError('Сначала верните карточку в расписание повторений.');
      const actualDay = calendarDay(day);
      if (!actualDay || actualDay > today) throw new TopicError('Укажите действительную дату повторения не позже сегодняшнего дня.');
      if (action === 'correct') {
        if (!review.reviewed_on || !review.review_interval_days) {
          throw new TopicError('Сначала запишите повторение, чтобы задать интервал.');
        }
        frontmatter.status = 'known';
        frontmatter.reviewed_on = actualDay;
        return;
      }
      if (review.reviewed_on && actualDay < review.reviewed_on) {
        throw new TopicError('Дата нового повтора не может быть раньше последнего. Для изменения используйте «Исправить дату».');
      }
      const interval = requestedInterval(this.reviewRules, grade, review.review_interval_days ?? this.reviewRules.first);
      if (previewInterval !== undefined && previewInterval !== interval) {
        throw new TopicError('Настройки изменили срок повторения. Проверьте новый срок и сохраните ещё раз.');
      }
      frontmatter.status = 'known';
      frontmatter.reviewed_on = actualDay;
      frontmatter.review_interval_days = interval;
    });
  }

  async updateReviewRules(input) {
    const rules = normalizeRules(input);
    const write = this.rulesWrite.catch(() => {}).then(async () => {
      const previous = await this.loadData();
      await this.saveData({ ...(isRecord(previous) ? previous : {}), reviewRules: rules });
      this.reviewRules = rules;
      for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
        if (leaf.view instanceof KnowledgeTreeView) leaf.view.queueRefresh(false);
      }
    });
    this.rulesWrite = write;
    await write;
  }

  onunload() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      if (leaf.view instanceof KnowledgeTreeView) leaf.view.dispose();
      leaf.detach();
    }
  }
};
