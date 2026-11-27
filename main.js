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
const BUNDLED_HTML = "<!doctype html>\n<html lang=\"ru\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\"><meta name=\"theme-color\" content=\"#f7f7f2\"><title>Мои знания</title><style>\n:root{color-scheme:light dark;--bg:light-dark(#f7f7f2,#161d19);--paper:light-dark(#fff,#202a23);--ink:light-dark(#29362e,#e2ebe4);--muted:light-dark(#717a70,#9ead9e);--line:light-dark(#d4dbd0,#3d4c40);--green:light-dark(#387c5b,#8ecba7);--green-bg:light-dark(#e7f1e5,#283f30);--amber:light-dark(#b78639,#dfb469);--amber-bg:light-dark(#f9f0df,#403626);--todo:light-dark(#a2aaa0,#89958a);font:14px/1.4 -apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;color:var(--ink);background:var(--bg)}*{box-sizing:border-box}body{margin:0}button{font:inherit;color:inherit;cursor:pointer;touch-action:manipulation}button:focus-visible{outline:2px solid var(--green);outline-offset:4px}[hidden]{display:none!important}.app{height:100vh;height:100dvh;min-height:370px;display:flex;flex-direction:column;padding-top:env(safe-area-inset-top)}header{padding:16px 24px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;border-bottom:1px solid var(--line)}.eyebrow{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:3px}h1{font-size:20px;line-height:1.2;font-weight:500;letter-spacing:-.4px;margin:0}.next{display:flex;gap:10px;align-items:center;padding:8px 12px;min-height:44px;border:1px solid var(--line);border-radius:9px;background:var(--paper);font-size:12px}.next span:first-child{color:var(--muted)}.next .arrow{color:var(--green)}.board{flex:1;min-height:0;position:relative;overflow:hidden;touch-action:none;user-select:none}.world{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform}svg{position:absolute;left:0;top:0;overflow:visible;pointer-events:none}.edge{fill:none;stroke:var(--line);stroke-width:1.5;vector-effect:non-scaling-stroke}.edge.active{stroke:var(--green)}.node{position:absolute;width:148px;height:82px;background:var(--paper);border:1px solid var(--line);border-radius:9px;text-align:left;padding:9px 10px;display:flex;align-items:center;gap:8px;font-size:14px;line-height:1.22}.node .label{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;overflow-wrap:anywhere;flex:1}.node.branch .label{-webkit-line-clamp:2}.node .symbol{width:13px;min-width:13px;text-align:center;color:var(--muted)}.node.root{background:var(--ink);color:var(--bg);border-color:transparent;font-weight:500}.node.root .symbol{color:inherit}.node.leaf{background:transparent;border-color:transparent;border-radius:8px;padding-left:8px}.node.leaf[data-status=known] .symbol{color:var(--green)}.node.leaf[data-status=studying] .symbol{color:var(--amber)}.node.leaf[data-status=todo] .symbol{color:var(--todo)}.node.leaf .symbol{font-size:17px;width:17px;min-width:17px}.node:hover{border-color:var(--green)}.node.selected{background:var(--amber-bg);border-color:transparent}.crumb{position:absolute;top:10px;left:15px;max-width:calc(100% - 30px);background:var(--bg);color:var(--muted);border:0;border-radius:5px;padding:5px 7px;min-height:38px;font-size:11px;text-align:left}.controls{position:absolute;bottom:14px;right:17px;display:flex;gap:1px;padding:3px;background:var(--paper);border:1px solid var(--line);border-radius:10px}.controls button{height:44px;min-width:44px;border:0;border-radius:6px;background:transparent;font-size:20px}.controls button:last-child{font-size:12px;padding:0 12px}.controls button:hover{background:var(--green-bg)}.hint{position:absolute;bottom:28px;left:22px;font-size:11px;color:var(--muted);pointer-events:none}footer{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:11px 23px calc(11px + env(safe-area-inset-bottom));border-top:1px solid var(--line);font-size:11px;color:var(--muted)}.legend{display:flex;gap:15px}.legend span{display:flex;align-items:center;gap:5px}.dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--todo)}.dot.study{background:var(--amber)}.dot.known{background:var(--green)}.count{font-variant-numeric:tabular-nums}.selection{position:absolute;bottom:72px;right:17px;font-size:11px;background:var(--paper);color:var(--muted);padding:7px 10px;border-radius:6px;max-width:calc(100% - 34px);pointer-events:none}.selection:empty{display:none}@media(max-width:600px){header{padding:13px 16px;align-items:flex-start}.eyebrow{font-size:10px}h1{font-size:18px}.next{font-size:11px;padding:7px 9px;gap:6px}.next span:first-child{display:none}.hint{top:12px;bottom:auto;left:17px}.crumb{top:34px}.controls{right:12px;bottom:12px}footer{padding-left:16px;padding-right:16px;gap:8px}.legend{gap:11px}.count{font-size:10px}}\n\n.node.branch{display:grid;grid-template-columns:13px minmax(0,1fr);grid-template-rows:auto auto 4px;align-content:center;gap:3px 8px;padding:8px 10px}\n.node.branch .symbol{grid-column:1;grid-row:1}\n.node.branch .label{grid-column:2;grid-row:1;min-width:0}\n.branch-counts{grid-column:1 / -1;display:flex;align-items:center;justify-content:space-between;gap:5px;font-size:13px;line-height:1.2;font-weight:400;color:var(--muted);font-variant-numeric:tabular-nums}\n.branch-counts .metric{display:inline-flex;align-items:center;gap:3px;white-space:nowrap}\n.branch-counts .metric-mark{font-size:13px}\n.metric[data-status=known] .metric-mark{color:var(--green)}\n.metric[data-status=studying] .metric-mark{color:var(--amber)}\n.metric[data-status=todo] .metric-mark{color:var(--todo)}\n.branch-progress{grid-column:1 / -1;display:flex;gap:1px;height:4px;overflow:hidden;border-radius:3px}\n.branch-progress .segment{height:4px;min-width:0}\n.branch-progress [data-status=known]{background:var(--green)}\n.branch-progress [data-status=studying]{background:var(--amber)}\n.branch-progress [data-status=todo]{background:var(--todo)}\n.node.root{--green:light-dark(#9ccbac,#286745);--amber:light-dark(#e2ba78,#93631e);--todo:light-dark(#96a397,#7d8a79)}\n.node.root .branch-counts{color:inherit}\n.legend-mark{font-weight:400;font-size:13px;line-height:1}\n.legend-mark.known{color:var(--green)}.legend-mark.study{color:var(--amber)}.legend-mark.todo{color:var(--todo)}\n\nheader{align-items:center}.title-group{min-width:0}.source{font-size:11px;color:var(--muted);margin-top:5px;max-width:460px}.source.error{color:var(--amber)}.actions{display:flex;gap:6px}.action{min-height:42px;border:1px solid var(--line);border-radius:8px;background:var(--paper);padding:7px 12px;font-size:12px}.action.primary{background:var(--green-bg);border-color:transparent}.empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center;background:var(--bg);padding:24px;z-index:3}.empty h2{font-size:22px;font-weight:500;margin:0}.empty p{color:var(--muted);max-width:340px;margin:0;font-size:13px}.text-button{border:0;background:transparent;font-size:12px;color:var(--muted);min-height:44px;text-decoration:underline}.error-panel{position:absolute;top:8px;left:12px;right:12px;z-index:4;background:var(--paper);border:1px solid var(--amber);border-radius:8px;padding:10px 12px;font-size:12px;max-height:40%;overflow:auto}.error-panel summary{cursor:pointer}.error-panel pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;color:var(--muted);margin-bottom:0}.node{width:180px;height:94px}.node .label{-webkit-line-clamp:4}.node.branch .label{-webkit-line-clamp:2}.selection{max-height:78px;overflow:hidden}.node.leaf[data-status=known]{background:var(--green-bg)}.node.leaf[data-status=studying]{background:var(--amber-bg)}.hint{top:auto;bottom:28px}.crumb{top:10px}@media(max-width:600px){header{padding:11px 14px;gap:8px}.source{font-size:10px;max-width:245px}.actions{gap:5px}.action{padding:7px 9px;font-size:11px}.hint{top:auto;bottom:70px;left:16px;max-width:170px}.crumb{top:9px}.legend{gap:9px}.selection{bottom:65px;left:14px;right:14px;max-width:none}.count{width:100%}footer{gap:5px}.empty h2{font-size:20px}}\n.node.deferred{opacity:.6}\n.node.deferred:hover,.node.deferred:focus,.node.deferred.selected{opacity:1}\n.node.has-note .label{padding-right:34px}\n.note-open{position:absolute;z-index:1;width:44px;height:44px;border:0;border-radius:8px;background:transparent;color:var(--muted);padding:0;display:flex;align-items:center;justify-content:center;font-size:18px;line-height:1}\n.note-open:hover,.note-open:focus-visible{color:var(--green);background:var(--green-bg)}\n.note-open.deferred{opacity:.6}\n.note-open.deferred:hover,.note-open.deferred:focus,.note-open.selected{opacity:1}\n.node.leaf.has-note{padding-left:44px}\n.node.leaf.has-note .symbol{display:none}\n.node.branch.has-note{padding-right:44px}\n.node.branch.has-note .label{padding-right:0}\n.status-cycle{position:absolute;z-index:1;width:44px;height:44px;border:0;border-radius:8px;background:transparent;color:var(--muted);padding:0;display:grid;place-items:center;font-size:18px;line-height:1}\n.status-cycle[data-status=studying]{color:var(--amber)}\n.status-cycle[data-status=known]{color:var(--green)}\n.status-cycle:hover,.status-cycle:focus-visible{background:var(--paper);box-shadow:inset 0 0 0 1px var(--line)}\n.status-cycle.deferred{opacity:.6}\n.status-cycle.deferred:hover,.status-cycle.deferred:focus,.status-cycle.selected{opacity:1}\n.action:disabled{opacity:.55;cursor:default}\n.count{max-width:100%;margin-inline-start:auto;text-align:right;color:var(--ink)}\n.workspace{position:relative;display:flex;flex:1;min-height:0;overflow:hidden}\n.workspace>.board,.card-list{flex:1;min-width:0}\n.views,.shortcuts,.filters,.review-actions,.ratings{display:flex;align-items:center;gap:8px;flex-wrap:wrap}\n.action[aria-pressed=true]{background:var(--green-bg);border-color:var(--green)}\n.card-list{display:flex;flex-direction:column;min-height:0;padding:16px 20px}\n.filters label,.review-pane label{display:grid;gap:4px}\n.filters{padding-bottom:10px;border-bottom:1px solid var(--line);align-items:end}\n.filters label,.field-label{color:var(--muted);font-size:12px}\nselect,input{font:inherit;color:var(--ink);background:var(--paper);border:1px solid var(--line);border-radius:7px;min-height:38px;max-width:100%;padding:5px 8px}\n.list-scroll{overflow:auto;min-height:0}\n.card-rows{list-style:none;padding:0;margin:0}\n.card-row{display:grid;grid-template-columns:44px minmax(0,1fr) 44px;align-items:center;gap:8px;border-bottom:1px solid var(--line);padding:8px 0}\n.card-row.selected{background:var(--review-bg,var(--green-bg))}\n.list-status,.list-open,.list-symbol{min-height:44px;min-width:44px;border:0;border-radius:7px;background:transparent}\n.list-symbol{display:grid;place-items:center}\n.card-row button:hover{background:var(--green-bg)}\n.list-title{display:block;text-align:left;border:0;border-radius:6px;background:transparent;padding:5px 6px;max-width:100%;min-height:34px;font-weight:600;overflow-wrap:anywhere}\n.card-label{display:block;padding:0 6px;font-weight:600;overflow-wrap:anywhere}\n.list-path,.list-progress{display:block;margin-left:6px;color:var(--muted);font-size:12px;overflow-wrap:anywhere}\n.list-empty,.list-size{color:var(--muted);font-size:12px}\n.review-pane{flex:0 0 min(370px,45%);min-width:0;overflow:auto;background:var(--paper);border-left:1px solid var(--line);padding:16px}\n.review-pane h2{font-size:16px;line-height:1.35;margin:0 0 8px;overflow-wrap:anywhere}\n.review-pane form,.review-panel{display:grid;gap:10px}\n.review-pane p{margin:0;font-size:12px}\n.review-subtitle{color:var(--muted)}\n.review-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}\n.review-table{width:100%;border-collapse:collapse;font-size:12px;text-align:left}\n.review-table th,.review-table td{padding:5px 4px;border-bottom:1px solid var(--line)}\n.review-table input{width:100%;min-width:0}\n.ratings{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}\n.grade{min-height:44px;border:1px solid transparent;border-radius:7px}\n.grade[aria-pressed=true]{outline:2px solid currentColor;outline-offset:1px}\n.grade[data-grade=again]{background:light-dark(#fae3df,#532f2d);color:light-dark(#892c24,#ffd0ca)}\n.grade[data-grade=hard]{background:light-dark(#faebd8,#533b28);color:light-dark(#79430e,#ffdaa8)}\n.grade[data-grade=good]{background:light-dark(#e0f0e2,#294739);color:light-dark(#215833,#b0e1bc)}\n.grade[data-grade=easy]{background:light-dark(#e0f0f9,#294454);color:light-dark(#195471,#bae7fd)}\n.review-result{color:var(--green);font-weight:600}\n.review-error{color:var(--amber)}\n.review-error:empty,.operation-status:empty{display:none}\n.operation-status{padding:7px 18px;font-size:12px;color:var(--muted);background:var(--paper)}\n.legend{flex-wrap:wrap}\n:root{\n  --review-muted-green:light-dark(#526957,#a3b2a1);\n  --review-muted-green-bg:light-dark(#e9eee7,#303c33);\n  --review-purple:light-dark(#71468e,#e0bef7);\n  --review-purple-bg:light-dark(#f0e7f6,#463651)\n}\n[data-review=overdue]{--review-ink:var(--review-muted-green);--review-bg:var(--review-muted-green-bg)}\n[data-review=exempt]{--review-ink:var(--review-purple);--review-bg:var(--review-purple-bg)}\n.node.leaf[data-status=known]{background:var(--review-bg,var(--green-bg))}\n.node.leaf[data-status=known] .symbol,.status-cycle[data-status=known],.list-status[data-status=known],.list-symbol[data-status=known]{\n  color:var(--review-ink,var(--green))\n}\n.list-status[data-status=known],.list-symbol[data-status=known]{background:var(--review-bg,var(--green-bg))}\n.list-status[data-status=studying],.list-symbol[data-status=studying]{color:var(--amber)}\n.list-status[data-status=todo],.list-symbol[data-status=todo]{color:var(--muted)}\n.card-row[data-review] .list-progress{color:var(--review-ink,var(--green))}\n#review-exempt[aria-pressed=true]{color:var(--review-purple);background:var(--review-purple-bg);border-color:var(--review-purple)}\n.branch-counts{gap:4px;font-size:11px}\n.branch-counts .metric{gap:2px}\n.branch-counts .metric-mark{font-size:11px}\n.node.leaf.scheduled{display:grid;grid-template-columns:17px minmax(0,1fr);align-content:center;gap:4px 8px}\n.node.leaf.scheduled.has-note{grid-template-columns:minmax(0,1fr)}\n.node.leaf.scheduled .label{-webkit-line-clamp:2}\n.node-dates{grid-column:2;font-size:10px;line-height:1.3;color:var(--muted)}\n.node.has-note .node-dates{grid-column:1}\n.node-dates span{display:block}\n.node-dates[data-review]{color:var(--review-ink,var(--muted))}\n@media(max-width:680px){\n  .workspace{flex-direction:column}\n  .card-list{padding:12px}\n  .review-pane{flex:0 0 auto;max-height:52%;border:0;border-top:1px solid var(--line);padding:12px}\n  .filters{gap:6px}\n}\n</style></head><body><main class=\"app\">\n<header>\n  <div class=\"title-group\"><h1>Мои знания</h1><div class=\"source\" id=\"source\" role=\"status\">Источник — Markdown-заметки Obsidian</div></div>\n  <nav class=\"views\" aria-label=\"Вид хранилища\">\n    <button class=\"action\" id=\"view-tree\" type=\"button\" aria-controls=\"board\" aria-pressed=\"true\">Дерево</button>\n    <button class=\"action\" id=\"view-cards\" type=\"button\" aria-controls=\"card-list\" aria-pressed=\"false\" disabled>Карточки</button>\n  </nav>\n  <div class=\"shortcuts\">\n    <button class=\"action\" id=\"list-studying\" type=\"button\" disabled>В работе</button>\n    <button class=\"action\" id=\"list-overdue\" type=\"button\" disabled>Просрочено</button>\n    <button class=\"action\" id=\"open-review-settings\" type=\"button\" hidden>Настройки сроков</button>\n    <button class=\"action\" id=\"folder\" type=\"button\">Папка</button>\n    <button class=\"action\" id=\"refresh\" type=\"button\" aria-label=\"Перечитать заметки\">↻ Обновить</button>\n  </div>\n</header>\n<div class=\"workspace\">\n<section class=\"board\" id=\"board\" aria-label=\"Дерево знаний\"><div class=\"world\" id=\"world\"><svg id=\"edges\" width=\"1\" height=\"1\" aria-hidden=\"true\"></svg><div id=\"nodes\"></div></div><span class=\"hint\" id=\"hint\">Нажмите на ветку · двигайте дерево</span><button class=\"crumb\" id=\"back\" type=\"button\" hidden></button><div class=\"selection\" id=\"selection\" role=\"status\" aria-live=\"polite\"></div><div class=\"controls\" aria-label=\"Вид дерева\"><button id=\"less\" type=\"button\" aria-label=\"Уменьшить\">−</button><button id=\"more\" type=\"button\" aria-label=\"Увеличить\">+</button><button id=\"overview\" type=\"button\">К корню</button></div>\n<div class=\"empty\" id=\"empty\"><h2>Дерево знаний</h2><p id=\"welcome-text\">Откройте папку KnowledgeTree. Дерево прочитает названия, связи и статусы тем из заметок.</p><button class=\"action primary\" id=\"choose\" type=\"button\">Открыть папку</button><button class=\"text-button\" id=\"choose-files\" type=\"button\">Выбрать файлы .md</button></div>\n</section>\n<section class=\"card-list\" id=\"card-list\" aria-label=\"Список карточек\" hidden>\n  <div class=\"filters\">\n    <label>Статус\n      <select id=\"status-filter\">\n        <option value=\"all\">Все</option><option value=\"todo\">Не изучено</option>\n        <option value=\"studying\">В работе</option><option value=\"known\">Изучено</option>\n      </select>\n    </label>\n    <label>Повторение\n      <select id=\"repeat-filter\">\n        <option value=\"all\">Любой срок</option><option value=\"required\">Требуется повторить</option>\n        <option value=\"overdue\">Только просроченные</option>\n      </select>\n    </label>\n    <span class=\"list-size\" id=\"list-size\" role=\"status\"></span>\n  </div>\n  <div class=\"list-scroll\" id=\"list-scroll\">\n    <ul class=\"card-rows\" id=\"card-rows\"></ul>\n    <p class=\"list-empty\" id=\"list-empty\" hidden>Карточек с такими фильтрами нет.</p>\n  </div>\n</section>\n<aside class=\"review-pane\" id=\"review-pane\" aria-label=\"Повторение карточек\" hidden>\n  <div class=\"review-panel\" id=\"review-panel\" hidden>\n    <h2 id=\"review-title\"></h2>\n    <p class=\"review-subtitle\" id=\"review-history\"></p>\n    <button class=\"action\" id=\"review-exempt\" type=\"button\" aria-pressed=\"false\">Повторение не требуется</button>\n    <form id=\"review-form\">\n      <label class=\"field-label\" id=\"review-date-field\">Дата повторения <input id=\"review-date\" type=\"date\" required></label>\n      <div class=\"ratings\" id=\"review-grades\" role=\"group\" aria-label=\"Как прошёл повтор?\">\n        <button class=\"grade\" id=\"grade-again\" data-grade=\"again\" type=\"button\" aria-pressed=\"false\">Забыл</button>\n        <button class=\"grade\" id=\"grade-hard\" data-grade=\"hard\" type=\"button\" aria-pressed=\"false\">Трудно</button>\n        <button class=\"grade\" id=\"grade-good\" data-grade=\"good\" type=\"button\" aria-pressed=\"false\">Помню</button>\n        <button class=\"grade\" id=\"grade-easy\" data-grade=\"easy\" type=\"button\" aria-pressed=\"false\">Легко</button>\n      </div>\n      <p class=\"review-result\" id=\"review-preview\" aria-live=\"polite\"></p>\n      <p class=\"review-error\" id=\"review-error\" role=\"alert\"></p>\n      <div class=\"review-actions\" id=\"review-actions\">\n        <button class=\"action primary\" id=\"review-save\" type=\"button\">Записать повторение</button>\n        <button class=\"action\" id=\"review-correct\" type=\"button\">Исправить дату</button>\n        <button class=\"action\" id=\"review-close\" type=\"button\">Отмена</button>\n      </div>\n      <button class=\"text-button\" id=\"review-reset\" type=\"button\">Сбросить прогресс</button>\n      <div class=\"review-panel\" id=\"reset-confirm\" hidden>\n        <p>Вернуть статус «Не изучено» и удалить расписание этой карточки?</p>\n        <div class=\"review-actions\">\n          <button class=\"action\" id=\"reset-approve\" type=\"button\">Сбросить</button>\n          <button class=\"action\" id=\"reset-cancel\" type=\"button\">Отмена</button>\n        </div>\n      </div>\n    </form>\n  </div>\n  <div class=\"review-panel\" id=\"review-settings\" hidden>\n    <h2>Настройки сроков</h2>\n    <form id=\"review-rules-form\">\n      <div class=\"review-fields\">\n        <label class=\"field-label\">Первый повтор, дней <input id=\"rule-first\" type=\"number\" min=\"1\" max=\"3650\" required></label>\n        <label class=\"field-label\">Максимум, дней <input id=\"rule-cap\" type=\"number\" min=\"1\" max=\"3650\" required></label>\n      </div>\n      <table class=\"review-table\">\n        <thead><tr><th>Оценка</th><th>Дни или минимум</th><th>Множитель</th></tr></thead>\n        <tbody>\n          <tr><th scope=\"row\">Забыл</th><td><input aria-label=\"Забыл, дней\" id=\"rule-againMin\" type=\"number\" min=\"1\" max=\"3650\" required></td><td>Фикс.</td></tr>\n          <tr><th scope=\"row\">Трудно</th><td><input aria-label=\"Трудно, минимум\" id=\"rule-hardMin\" type=\"number\" min=\"1\" max=\"3650\" required></td><td><input aria-label=\"Трудно, множитель\" id=\"rule-hardMul\" type=\"number\" min=\"1\" max=\"10\" step=\".1\" required></td></tr>\n          <tr><th scope=\"row\">Помню</th><td><input aria-label=\"Помню, минимум\" id=\"rule-goodMin\" type=\"number\" min=\"1\" max=\"3650\" required></td><td><input aria-label=\"Помню, множитель\" id=\"rule-goodMul\" type=\"number\" min=\"1\" max=\"10\" step=\".1\" required></td></tr>\n          <tr><th scope=\"row\">Легко</th><td><input aria-label=\"Легко, минимум\" id=\"rule-easyMin\" type=\"number\" min=\"1\" max=\"3650\" required></td><td><input aria-label=\"Легко, множитель\" id=\"rule-easyMul\" type=\"number\" min=\"1\" max=\"10\" step=\".1\" required></td></tr>\n        </tbody>\n      </table>\n      <p class=\"review-subtitle\">Новые правила действуют при следующем назначении срока.</p>\n      <p class=\"review-error\" id=\"settings-error\" role=\"alert\"></p>\n      <div class=\"review-actions\">\n        <button class=\"action primary\" id=\"rules-save\" type=\"button\">Сохранить настройки</button>\n        <button class=\"action\" id=\"rules-close\" type=\"button\">Отмена</button>\n      </div>\n    </form>\n  </div>\n</aside>\n<details class=\"error-panel\" id=\"error\" hidden><summary>Источник недоступен или в свойствах есть ошибка</summary><pre id=\"error-text\"></pre></details>\n</div>\n<div class=\"operation-status\" id=\"operation-status\" role=\"status\"></div>\n<footer><div class=\"legend\"><span><b class=\"legend-mark known\">✓</b>Изучено</span><span><b class=\"legend-mark study\">◐</b>В работе</span><span><b class=\"legend-mark todo\">○</b>Не изучено</span></div><span class=\"count\" id=\"count\" role=\"status\"></span></footer>\n</main><input id=\"folder-input\" type=\"file\" webkitdirectory directory multiple accept=\".md\" hidden><input id=\"files-input\" type=\"file\" multiple accept=\".md,text/markdown\" hidden>\n<script>\n/* Metadata only: note bodies never enter the tree model. */\nconst KnowledgeTreeData = (() => {\n  const ROOT='knowledge-root', fields=new Set(['id','parent','title','status','order','type']);\n  const statuses=['todo','studying','known'];\n  const scheduleFields=['learned_on','reviewed_on','review_interval_days','review_exempt'];\n  const fail=(path,message)=>{throw new Error(path+': '+message);};\n  const numeric=/^[+-]?(?:[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)(?:[eE][+-]?[0-9]+)?$/;\n  function compareText(a,b){const aa=Array.from(a),bb=Array.from(b);for(let i=0;i<Math.min(aa.length,bb.length);i++){const d=aa[i].codePointAt(0)-bb[i].codePointAt(0);if(d)return d;}return aa.length-bb.length;}\n  function scalar(raw,path){\n    let s=raw.trim();if(!s||s.startsWith('#')||/^(null|~)$/i.test(s))return '';\n    if(s[0]==='\"'){\n      const match=s.match(/^\"(?:[^\"\\\\]|\\\\.)*\"/);if(!match)fail(path,'не закрыта строка в кавычках');\n      const rest=s.slice(match[0].length).trim();if(rest&&!rest.startsWith('#'))fail(path,'лишний текст после кавычек');\n      try{return JSON.parse(match[0]);}catch{fail(path,'некорректная строка в кавычках');}\n    }\n    if(s[0]===\"'\"){\n      let out='';for(let i=1;i<s.length;i++){if(s[i]!==\"'\"){out+=s[i];continue;}if(s[i+1]===\"'\"){out+=\"'\";i++;continue;}const rest=s.slice(i+1).trim();if(rest&&!rest.startsWith('#'))fail(path,'лишний текст после кавычек');return out;}fail(path,'не закрыта строка в кавычках');\n    }\n    s=s.replace(/\\s+#.*$/,'').trim();if(/^(null|~)$/i.test(s))return '';\n    if(/^[\\[\\]{|>&*!]/.test(s))fail(path,'свойства дерева должны быть простыми значениями');return s;\n  }\n  function parseHeader(text,path){\n    const lines=text.replace(/^\\uFEFF/,'').split(/\\r?\\n/);if(lines[0]?.trim()!=='---')fail(path,'не найден блок свойств ---');\n    const result={path},seenSchedule=new Set();let closed=false,last='';\n    for(let i=1;i<lines.length;i++){\n      const line=lines[i],t=line.trim();if(t==='---'||t==='...'){closed=true;break;}if(!t||t.startsWith('#'))continue;\n      if(/^\\s/.test(line)||(scheduleFields.includes(last)&&/^-(?:\\s|$)/.test(t))){\n        if(fields.has(last))fail(path,'свойство дерева должно быть в одну строку');\n        if(scheduleFields.includes(last))delete result[last];\n        continue;\n      }\n      const m=line.match(/^([A-Za-z_][\\w-]*)\\s*:\\s*(.*?)\\s*$/);if(!m)fail(path,'ожидается имя: значение');last=m[1];\n      if(scheduleFields.includes(last)){\n        if(seenSchedule.has(last)){delete result[last];continue;}\n        seenSchedule.add(last);\n        try{result[last]=scalar(m[2],path);}catch{}\n        continue;\n      }\n      if(!fields.has(last))continue;\n      if(Object.hasOwn(result,last))fail(path,'повтор свойства '+last);result[last]=scalar(m[2],path);\n    }\n    if(!closed)fail(path,'не найден конец свойств --- (лимит 64 КБ)');return result;\n  }\n  function buildTree(records){\n    const nodes=new Map([[ROOT,{id:ROOT,title:'Мои знания',status:'todo'}]]), errors=[],clean=[];\n    for(const raw of records){try{\n      const path=String(raw.path||'заметка');\n      for(const key of ['id','parent','title','status','order'])if(raw[key]!=null&&!['string','number'].includes(typeof raw[key]))fail(path,'свойство '+key+' должно быть простым значением');\n      const id=String(raw.id||'').trim();if(!id||id.length>256||/\\s/.test(id))fail(path,'нужен уникальный id без пробелов');if(nodes.has(id))fail(path,'повторяющийся или зарезервированный id '+id);\n      const parent=String(raw.parent||ROOT).trim()||ROOT,status=normalizeStatus(String(raw.status||'todo').trim()),title=String(raw.title||path.split('/').pop().replace(/\\.md$/i,'')).trim(),orderText=String(raw.order??'').trim();\n      if(orderText&&!numeric.test(orderText))fail(path,'order должен быть десятичным числом');const order=Number(orderText||0);\n      if(!statuses.includes(status))fail(path,'status: todo, studying или known');if(!title)fail(path,'пустое название');if(!Number.isFinite(order))fail(path,'order должен быть числом');\n      const n={id,title,status,path,...readSchedule(raw)};nodes.set(id,n);clean.push({n,parent,order,path});\n    }catch(e){errors.push(e.message);}}\n    for(const item of clean)if(!nodes.has(item.parent))errors.push(item.path+': не найден parent '+item.parent);\n    const parents=new Map(clean.map(x=>[x.n.id,x.parent])),done=new Set();\n    for(const item of clean){let id=item.n.id;const chain=new Set();while(id!==ROOT&&parents.has(id)&&!done.has(id)){if(chain.has(id)){errors.push(item.path+': цикл родительских связей');break;}chain.add(id);id=parents.get(id);}chain.forEach(x=>done.add(x));}\n    if(errors.length)throw new Error(errors.join('\\n'));\n    const groups=new Map();for(const item of clean){if(!groups.has(item.parent))groups.set(item.parent,[]);groups.get(item.parent).push(item);}\n    for(const [id,list]of groups){list.sort((a,b)=>a.order-b.order||compareText(a.n.title.toLowerCase(),b.n.title.toLowerCase())||compareText(a.n.id,b.n.id));nodes.get(id).children=list.map(x=>x.n);}\n    return nodes.get(ROOT);\n  }\n  function dateOnly(value){\n    if(typeof value!=='string'||!/^\\d{4}-\\d{2}-\\d{2}$/.test(value)||value.startsWith('0000'))return '';\n    const date=new Date(value+'T00:00:00Z');\n    return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value?value:'';\n  }\n  function localDay(date=new Date()){\n    const pad=n=>String(n).padStart(2,'0');\n    return String(date.getFullYear()).padStart(4,'0')+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate());\n  }\n  function addDays(day,count){\n    const date=new Date(day+'T00:00:00Z');\n    date.setUTCDate(date.getUTCDate()+count);\n    return date.toISOString().split('T')[0];\n  }\n  function readSchedule(record){\n    const fields={};\n    for(const key of ['learned_on','reviewed_on']){\n      const day=dateOnly(typeof record[key]==='string'?record[key].trim():'');\n      if(day)fields[key]=day;\n    }\n    const raw=record.review_interval_days;\n    const interval=typeof raw==='string'&&/^[0-9]{1,4}$/.test(raw.trim())?Number(raw):raw;\n    if(Number.isInteger(interval)&&interval>=1&&interval<=3650)fields.review_interval_days=interval;\n    const exempt=record.review_exempt;\n    if(exempt===true||(typeof exempt==='string'&&exempt.trim().toLowerCase()==='true'))fields.review_exempt=true;\n    return fields;\n  }\n  function normalizeStatus(status){return status==='repeated'?'known':status;}\n  function eligible(n){return n.status==='known';}\n  function dueOn(n,today=localDay()){\n    if(!eligible(n)||n.review_exempt)return '';\n    const day=n.reviewed_on&&n.reviewed_on<=today?n.reviewed_on:n.learned_on;\n    return day&&day<=today&&n.review_interval_days?addDays(day,n.review_interval_days):'';\n  }\n  function aggregate(n){\n    const result={known:0,studying:0,todo:0,total:0};\n    if(!n.children?.length){\n      if(n.id!==ROOT){result[n.status||'todo']=1;result.total=1;}\n      return result;\n    }\n    for(const child of n.children){\n      const counts=aggregate(child);\n      for(const key of Object.keys(result))result[key]+=counts[key];\n    }\n    return result;\n  }\n  return {parseHeader,buildTree,aggregate,statuses,dateOnly,localDay,addDays,readSchedule,eligible,dueOn,normalizeStatus};\n})();\n\n(()=>{'use strict';const $=id=>document.getElementById(id),board=$('board'),world=$('world');let tree=null;const W=180,H=94,X=218,Y=110;const byId=new Map();\nconst {aggregate,dateOnly,localDay,addDays,eligible,dueOn,readSchedule,normalizeStatus}=KnowledgeTreeData;\nfunction index(n,path=[]){\n  n.status=normalizeStatus(n.status);\n  byId.set(n.id,{n,path});\n  (n.children||[]).forEach(c=>index(c,path.concat(n.id)));\n}\nconst labels={todo:'Не изучено',studying:'В работе',known:'Изучено'};\nconst symbols={todo:'○',studying:'◐',known:'✓'};\nconst nextStatus={todo:'studying',studying:'known'},metrics=['known','studying','todo'];\nlet opened=new Set(['knowledge-root']),positions=new Map(),visible=[],edges=[],camera={x:0,y:0,z:1},selected=null,focus='knowledge-root',size=null;\nlet pointers=new Map(),drag=null,pinch=null,moved=false,lastPointer=0;\nconst mobile=()=>board.clientWidth<620;\nfunction layout(){positions=new Map();visible=[];edges=[];function visit(n,depth,dir,counter){const kids=opened.has(n.id)?n.children||[]:[];let y;if(kids.length){const yy=kids.map(c=>visit(c,depth+1,dir,counter));y=(yy[0]+yy[yy.length-1])/2;}else{y=counter.y;counter.y+=Y;}positions.set(n.id,{x:depth*X*dir,y});visible.push(n);kids.forEach(c=>edges.push({p:n.id,c:c.id}));return y;}if(mobile()){visit(tree,0,1,{y:0});return;}const children=opened.has(tree.id)?tree.children||[]:[],sides=[[],[]],weights=[0,0];for(const n of children){const side=weights[0]<=weights[1]?0:1;sides[side].push(n);weights[side]+=aggregate(n).total||1;}for(const[list,dir]of [[sides[0],1],[sides[1],-1]]){const cursor={y:0},start=visible.length;list.forEach(n=>{visit(n,1,dir,cursor);edges.push({p:tree.id,c:n.id});});const shift=(cursor.y-Y)/2;visible.slice(start).forEach(n=>positions.get(n.id).y-=shift);}positions.set(tree.id,{x:0,y:0});visible.push(tree);}\nfunction transform(){world.style.transform='translate('+camera.x+'px,'+camera.y+'px) scale('+camera.z+')';}function zoomAt(x,y,k){const z=Math.max(.06,Math.min(2.5,camera.z*k)),wx=(x-camera.x)/camera.z,wy=(y-camera.y)/camera.z;camera={x:x-wx*z,y:y-wy*z,z};transform();}function frame(ids,minZoom=0){const pp=ids.map(id=>positions.get(id)).filter(Boolean);if(!pp.length)return;const x1=Math.min(...pp.map(p=>p.x)),x2=Math.max(...pp.map(p=>p.x+W)),y1=Math.min(...pp.map(p=>p.y-H/2)),y2=Math.max(...pp.map(p=>p.y+H/2)),bw=board.clientWidth,bh=board.clientHeight;camera.z=Math.max(minZoom,.06,Math.min(1.05,(bw-28)/(x2-x1),(bh-140)/(y2-y1)));camera.x=(bw-(x1+x2)*camera.z)/2;camera.y=54+((bh-140)-(y1+y2)*camera.z)/2;transform();}function updateBack(){if(!tree)return;const info=byId.get(focus)||byId.get(tree.id),p=info.path[info.path.length-1];$('back').hidden=!p;$('back').textContent=p?'← '+byId.get(p).n.title:'';$('back').dataset.parent=p||'';$('hint').hidden=!!p;}\nfunction render(){\n  if(!tree)return;\n  const activeStatusId=document.activeElement?.dataset?.statusId;\n  layout();\n  $('nodes').replaceChildren();\n  $('edges').replaceChildren();\n  const ancestors=new Set(selected?byId.get(selected).path.concat(selected):[]);\n  for(const e of edges){\n    const p=positions.get(e.p),c=positions.get(e.c),left=c.x<p.x;\n    const a=left?p.x:p.x+W,b=left?c.x+W:c.x,m=(a+b)/2;\n    const path=document.createElementNS('http://www.w3.org/2000/svg','path');\n    path.setAttribute('class','edge'+(ancestors.has(e.p)&&ancestors.has(e.c)?' active':''));\n    path.setAttribute('d','M '+a+' '+p.y+' C '+m+' '+p.y+' '+m+' '+c.y+' '+b+' '+c.y);\n    $('edges').append(path);\n  }\n  for(const n of visible){\n    const p=positions.get(n.id),branch=!!n.children?.length;\n    const deferred=/^\\(und\\)/i.test(n.title.trimStart());\n    const hasNote=sourceMode==='obsidian'&&!!n.path;\n    const stateClasses=(selected===n.id?' selected':'')+(deferred?' deferred':'');\n    const dates=!branch&&eligible(n)?reviewDates(n):[];\n    const appearance=eligible(n)?reviewAppearance(n):null;\n    const b=document.createElement('button');\n    b.type='button';\n    b.title=n.title;\n    b.className='node '+(branch?'branch':'leaf')+(n.id===tree.id?' root':'')+stateClasses+(hasNote?' has-note':'')+(dates.length?' scheduled':'');\n    b.dataset.id=n.id;\n    b.dataset.status=n.status||'';\n    if(appearance)b.dataset.review=appearance;\n    b.dataset.deferred=String(deferred);\n    b.style.left=p.x+'px';\n    b.style.top=(p.y-H/2)+'px';\n    const mark=document.createElement('span');\n    mark.className='symbol';\n    mark.textContent=branch?(opened.has(n.id)?'−':'+'):symbols[n.status]||'○';\n    mark.setAttribute('aria-hidden','true');\n    const name=document.createElement('span');\n    name.className='label';\n    name.textContent=n.title;\n    b.append(mark,name);\n    if(branch){\n      const counts=aggregate(n);\n      for(const key of [...metrics,'total'])b.dataset[key]=String(counts[key]);\n      const summary=document.createElement('span');\n      summary.className='branch-counts';\n      summary.setAttribute('aria-hidden','true');\n      const bar=document.createElement('span');\n      bar.className='branch-progress';\n      bar.setAttribute('aria-hidden','true');\n      for(const key of metrics){\n        const metric=document.createElement('span');\n        metric.className='metric';\n        metric.dataset.status=key;\n        const icon=document.createElement('span');\n        icon.className='metric-mark';\n        icon.textContent=symbols[key];\n        const number=document.createElement('span');\n        number.textContent=String(counts[key]);\n        metric.append(icon,number);\n        summary.append(metric);\n        if(counts[key]){\n          const segment=document.createElement('span');\n          segment.className='segment';\n          segment.dataset.status=key;\n          segment.style.flex=String(counts[key]);\n          bar.append(segment);\n        }\n      }\n      b.append(summary,bar);\n      b.setAttribute('aria-expanded',String(opened.has(n.id)));\n      b.setAttribute('aria-label',[n.title,...metrics.map(key=>labels[key]+' '+counts[key]),'Всего тем '+counts.total].join('. '));\n    }else{\n      b.setAttribute('aria-pressed',String(selected===n.id));\n      b.setAttribute('aria-label',[n.title,labels[n.status],...dates].join('. '));\n      if(dates.length){\n        const info=document.createElement('span');\n        info.className='node-dates';\n        info.dataset.review=appearance;\n        for(const date of dates){\n          const line=document.createElement('span');\n          line.textContent=date;\n          info.append(line);\n        }\n        b.append(info);\n      }\n    }\n    $('nodes').append(b);\n    if(!hasNote)continue;\n\n    const note=document.createElement('button');\n    note.type='button';\n    note.className='note-open'+stateClasses;\n    note.dataset.noteId=n.id;\n    note.title='Открыть заметку в Obsidian';\n    note.setAttribute('aria-label','Открыть заметку: '+n.title);\n    note.style.left=(p.x+W-44)+'px';\n    note.style.top=(p.y-H/2+1)+'px';\n    const icon=document.createElement('span');\n    icon.textContent='↗';\n    icon.setAttribute('aria-hidden','true');\n    note.append(icon);\n\n    const status=document.createElement('button');\n    status.type='button';\n    status.className='status-cycle'+stateClasses;\n    status.dataset.statusId=n.id;\n    status.dataset.status=n.status;\n    if(appearance)status.dataset.review=appearance;\n    status.title=statusAction(n);\n    status.setAttribute('aria-label',n.title+'. '+statusAction(n));\n    status.textContent=symbols[n.status];\n    status.style.left=(p.x+(branch?W-44:0))+'px';\n    status.style.top=(p.y+(branch?2:-22))+'px';\n    $('nodes').append(status,note);\n    if(activeStatusId===n.id)status.focus?.({preventScroll:true});\n  }\n  updateBack();\n  transform();\n}\nfunction focusBranch(id){const n=byId.get(id)?.n;if(!n)return;focus=id;frame([id,...(opened.has(id)?n.children||[]:[]).map(n=>n.id)],mobile()?.78:.86);updateBack();}function activate(id){const n=byId.get(id)?.n;if(!n)return;if(n.children?.length){const old=positions.get(id),point=old?{x:camera.x+old.x*camera.z,y:camera.y+old.y*camera.z}:null,expand=!opened.has(id);expand?opened.add(id):opened.delete(id);render();if(expand)focusBranch(id);else if(point){const p=positions.get(id);camera.x=point.x-p.x*camera.z;camera.y=point.y-p.y*camera.z;transform();}$('selection').textContent=n.title;}else{selected=selected===id?null:id;render();$('selection').textContent=selected?labels[n.status]+' · '+n.title:'';}}\nfunction openNote(id){if(sourceMode!=='obsidian'||!byId.get(id)?.n.path)return;window.parent.postMessage({type:'knowledge-tree-open-note',id},'*');}\nfunction cycleStatus(id){\n  const note=byId.get(id)?.n;\n  if(sourceMode!=='obsidian'||!note?.path||pendingEdit)return;\n  if(eligible(note)){\n    openReview(note);\n    return;\n  }\n  window.parent.postMessage({type:'knowledge-tree-cycle-status',id},'*');\n}\nlet viewMode='tree',cardEntries=[],today=localDay(),midnightTimer=null;\nconst dateFormat=new Intl.DateTimeFormat('ru',{day:'numeric',month:'short',timeZone:'UTC'});\nconst yearFormat=new Intl.DateTimeFormat('ru',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});\nfunction displayDate(day){\n  const format=day.slice(0,4)===today.slice(0,4)?dateFormat:yearFormat;\n  return format.format(new Date(day+'T00:00:00Z'));\n}\nfunction dueDate(n){return dueOn(n,today);}\nfunction isOverdue(n){\n  const day=dueDate(n);\n  return Boolean(day&&day<today);\n}\nfunction reviewAppearance(n){\n  if(n.review_exempt)return 'exempt';\n  return isOverdue(n)?'overdue':'regular';\n}\nfunction reviewDates(n){\n  if(!eligible(n))return [];\n  const day=dueDate(n),output=[];\n  if(dateOnly(n.reviewed_on)&&n.reviewed_on<=today)output.push('Повтор '+displayDate(n.reviewed_on));\n  if(n.review_exempt)output.push('Повтор не требуется');\n  else if(day)output.push((day<today?'Просрочено ':day===today?'Срок сегодня · ':'Срок ')+displayDate(day));\n  else output.push('Без срока · пора повторить');\n  return output;\n}\nfunction statusAction(n){\n  if(n.status==='known')return labels[n.status]+' · '+(n.review_exempt?'Настроить повторение':'Отметить повторение');\n  return labels[n.status]+' · '+labels[nextStatus[n.status]];\n}\nfunction updateShortcuts(){\n  const studying=cardEntries.filter(entry=>entry.n.status==='studying').length;\n  const overdue=cardEntries.filter(entry=>isOverdue(entry.n)).length;\n  $('list-studying').textContent='В работе · '+studying;\n  $('list-overdue').textContent='Просрочено · '+overdue;\n}\nfunction renderList(){\n  if(viewMode!=='cards')return;\n  const status=$('status-filter').value||'all';\n  const scope=$('repeat-filter');\n  scope.disabled=status==='todo'||status==='studying';\n  if(scope.disabled)scope.value='all';\n  const repeat=scope.value||'all';\n  const matches=[];\n  for(const {n,path} of cardEntries){\n    if(status!=='all'&&n.status!==status)continue;\n    const day=dueDate(n);\n    if(repeat==='overdue'&&(!day||day>=today))continue;\n    if(repeat==='required'&&(!eligible(n)||n.review_exempt||day>today))continue;\n    matches.push({n,path,day});\n  }\n  // The sort is stable, so equal dates preserve curriculum order.\n  if(repeat!=='all')matches.sort((a,b)=>{\n    const first=a.day||'\\uffff',second=b.day||'\\uffff';\n    return first<second?-1:first>second?1:0;\n  });\n  const scroll=$('list-scroll'),top=scroll.scrollTop;\n  const active=document.activeElement;\n  let restore;\n  const rows=matches.map(({n,path})=>{\n    const row=document.createElement('li');\n    row.className='card-row'+(reviewDraft?.id===n.id?' selected':'');\n    row.dataset.cardId=n.id;\n    if(eligible(n))row.dataset.review=reviewAppearance(n);\n    const canEdit=sourceMode==='obsidian'&&!!n.path;\n    const mark=document.createElement(canEdit?'button':'span');\n    mark.className=canEdit?'list-status':'list-symbol';\n    mark.dataset.status=n.status;\n    mark.textContent=symbols[n.status];\n    if(canEdit){\n      mark.type='button';\n      mark.dataset.statusId=n.id;\n      mark.title=statusAction(n);\n      mark.setAttribute('aria-label',n.title+'. '+mark.title);\n      mark.addEventListener('click',()=>cycleStatus(n.id));\n      if(active?.className==='list-status'&&active.dataset.statusId===n.id)restore=mark;\n    }else mark.setAttribute('aria-hidden','true');\n    const detail=document.createElement('div'),title=document.createElement(canEdit?'button':'span');\n    title.className=canEdit?'list-title':'card-label';\n    title.textContent=n.title;\n    if(canEdit){\n      title.type='button';\n      title.dataset.noteId=n.id;\n      title.addEventListener('click',()=>openNote(n.id));\n      if(active?.className==='list-title'&&active.dataset.noteId===n.id)restore=title;\n    }\n    const parents=document.createElement('span');\n    parents.className='list-path';\n    parents.textContent=path.filter(id=>id!==tree.id).map(id=>byId.get(id).n.title).join(' › ');\n    const progress=document.createElement('span');\n    progress.className='list-progress';\n    progress.textContent=[labels[n.status],...reviewDates(n)].join(' · ');\n    detail.append(title,parents,progress);\n    row.append(mark,detail);\n    if(canEdit){\n      const arrow=document.createElement('button');\n      arrow.type='button';\n      arrow.className='list-open';\n      arrow.dataset.noteId=n.id;\n      arrow.textContent='↗';\n      arrow.setAttribute('aria-label','Открыть заметку: '+n.title);\n      arrow.addEventListener('click',()=>openNote(n.id));\n      if(active?.className==='list-open'&&active.dataset.noteId===n.id)restore=arrow;\n      row.append(arrow);\n    }\n    return row;\n  });\n  $('card-rows').replaceChildren(...rows);\n  if(typeof top==='number')scroll.scrollTop=top;\n  if(restore)restore.focus?.({preventScroll:true});\n  else if(active?.className?.startsWith('list-')&&(active.dataset.noteId||active.dataset.statusId)){\n    $('status-filter').focus?.({preventScroll:true});\n  }\n  $('list-empty').hidden=rows.length!==0;\n  $('list-size').textContent='Карточек '+rows.length;\n}\nfunction switchView(mode){\n  if(!tree)return;\n  viewMode=mode;\n  board.hidden=mode!=='tree';\n  $('card-list').hidden=mode!=='cards';\n  $('view-tree').setAttribute('aria-pressed',String(mode==='tree'));\n  $('view-cards').setAttribute('aria-pressed',String(mode==='cards'));\n  if(mode==='tree')render();\n  else renderList();\n}\nfunction openFiltered(status,repeat){\n  $('status-filter').value=status;\n  $('repeat-filter').value=repeat;\n  $('list-scroll').scrollTop=0;\n  switchView('cards');\n}\n$('view-tree').addEventListener('click',()=>switchView('tree'));\n$('view-cards').addEventListener('click',()=>switchView('cards'));\n$('list-studying').addEventListener('click',()=>openFiltered('studying','all'));\n$('list-overdue').addEventListener('click',()=>openFiltered('all','overdue'));\nfor(const id of ['status-filter','repeat-filter']){\n  $(id).addEventListener('change',()=>{\n    $('list-scroll').scrollTop=0;\n    renderList();\n  });\n}\n\nconst defaultRules={first:7,cap:365,againMin:3,hardMin:7,hardMul:1.2,goodMin:14,goodMul:2,easyMin:21,easyMul:3};\nconst ruleFields=Object.keys(defaultRules);\nconst gradeKeys=['again','hard','good','easy'];\nlet reviewRules=defaultRules,reviewDraft=null,pendingEdit=null,requestCounter=0;\nlet returnFocus=null;\nfunction showPane(pane){\n  $('review-pane').hidden=!pane;\n  $('review-panel').hidden=pane!=='review';\n  $('review-settings').hidden=pane!=='settings';\n}\nfunction closePane(){\n  if(pendingEdit)return;\n  const noteId=reviewDraft?.id;\n  showPane('');\n  reviewDraft=null;\n  renderList();\n  let control;\n  if(noteId){\n    if(viewMode==='cards'){\n      const row=Array.from($('card-rows').children).find(item=>item.dataset.cardId===noteId);\n      control=row?.children[0]||$('status-filter');\n    }else{\n      control=Array.from($('nodes').children).find(item=>item.dataset.statusId===noteId)||$('view-tree');\n    }\n  }else if(returnFocus?.isConnected)control=returnFocus;\n  control?.focus?.({preventScroll:true});\n  returnFocus=null;\n}\nfunction openReview(note){\n  $('operation-status').textContent='';\n  reviewDraft={id:note.id,expected:{status:note.status,...currentSchedule(note)},grade:'',action:'record'};\n  $('review-title').textContent=note.title;\n  $('review-date').max=today;\n  $('review-date').value=today;\n  $('review-error').textContent='';\n  $('reset-confirm').hidden=true;\n  $('review-grades').hidden=false;\n  $('review-save').textContent='Записать повторение';\n  showPane('review');\n  updateReview();\n  renderList();\n  $(note.review_exempt?'review-exempt':'review-date').focus?.({preventScroll:true});\n}\nfunction currentSchedule(note){\n  const schedule=readSchedule(note);\n  for(const key of ['learned_on','reviewed_on'])if(schedule[key]>today)delete schedule[key];\n  return schedule;\n}\nfunction calculateInterval(note,grade){\n  if(grade==='again')return reviewRules.againMin;\n  const previous=note.review_interval_days||reviewRules.first;\n  const tenths=Math.round(reviewRules[grade+'Mul']*10);\n  return Math.min(reviewRules.cap,Math.max(reviewRules[grade+'Min'],Math.ceil(previous*tenths/10)));\n}\nfunction previewReview(note){\n  const day=dateOnly($('review-date').value);\n  if(!day||day>today)return {error:'Укажите фактическую дату, не позже сегодняшнего дня.'};\n  if(reviewDraft.action==='correct')return {day,interval:note.review_interval_days};\n  if(note.reviewed_on&&note.reviewed_on<=today&&day<note.reviewed_on){\n    return {error:'Для более ранней даты используйте «Исправить дату».'};\n  }\n  if(!reviewDraft.grade)return {error:'Выберите, как прошёл повтор.'};\n  return {day,interval:calculateInterval(note,reviewDraft.grade)};\n}\nfunction updateReview(){\n  if(!reviewDraft)return;\n  const n=byId.get(reviewDraft.id)?.n;\n  const correcting=reviewDraft.action==='correct';\n  const exempt=Boolean(n?.review_exempt);\n  if(n&&reviewDraft.awaitingExemption===exempt)delete reviewDraft.awaitingExemption;\n  const waiting=reviewDraft.awaitingExemption!==undefined;\n  const liveSchedule=n?{status:n.status,...currentSchedule(n)}:null;\n  const stale=!n||JSON.stringify(liveSchedule)!==JSON.stringify(reviewDraft.expected);\n  const preview=waiting?{error:'Обновляю карточку…'}\n    :stale?{error:'Карточка изменилась. Откройте её снова.'}\n    :exempt?{error:''}:previewReview(n);\n  const disabled=Boolean(pendingEdit)||waiting||stale;\n  $('review-history').textContent=n?[labels[n.status],...reviewDates(n)].join(' · '):'';\n  $('review-exempt').setAttribute('aria-pressed',String(exempt));\n  $('review-exempt').disabled=disabled;\n  $('review-date-field').hidden=exempt;\n  $('review-grades').hidden=exempt||correcting;\n  $('review-date').disabled=disabled||exempt;\n  $('review-date').max=today;\n  $('review-correct').hidden=exempt||correcting||!n?.review_interval_days||!n?.reviewed_on||n.reviewed_on>today;\n  $('review-correct').disabled=disabled||exempt;\n  $('review-reset').disabled=disabled;\n  $('reset-approve').disabled=disabled;\n  $('review-close').disabled=Boolean(pendingEdit);\n  $('review-save').hidden=exempt;\n  $('review-save').disabled=disabled||exempt||!preview.interval;\n  $('review-preview').hidden=exempt&&!waiting&&!stale;\n  $('review-preview').textContent=preview.interval\n    ? 'Следующий повтор — '+displayDate(addDays(preview.day,preview.interval))+' · '+preview.interval+' дн.'\n    : preview.error;\n  for(const key of gradeKeys){\n    $('grade-'+key).disabled=disabled||exempt;\n    $('grade-'+key).setAttribute('aria-pressed',String(key===reviewDraft.grade&&!correcting));\n  }\n}\nfunction postEdit(type,data){\n  const requestId=++requestCounter;\n  pendingEdit={requestId,action:data.action||'rules',exempt:data.exempt};\n  window.parent.postMessage({type,requestId,...data},'*');\n  updateReview();\n  $('rules-save').disabled=true;\n  $('rules-close').disabled=true;\n  for(const key of ruleFields)$('rule-'+key).disabled=true;\n}\nfunction submitReview(action){\n  if(sourceMode!=='obsidian'||pendingEdit||!reviewDraft)return;\n  const {id,grade,expected}=reviewDraft, n=byId.get(id)?.n;\n  if(!n||!eligible(n)||(action!=='reset'&&n.review_exempt))return;\n  const payload={id,action,expected};\n  if(action!=='reset'){\n    const {day,interval}=previewReview(n);\n    if(!interval)return;\n    payload.day=day;\n    if(action==='record'){\n      payload.grade=grade;\n      payload.previewInterval=interval;\n    }\n  }\n  $('review-error').textContent='';\n  postEdit('knowledge-tree-review',payload);\n}\nfunction handleEditResult(data){\n  if(!pendingEdit||data.requestId!==pendingEdit.requestId)return;\n  const {action,exempt}=pendingEdit;\n  pendingEdit=null;\n  $('rules-save').disabled=false;\n  $('rules-close').disabled=false;\n  for(const key of ruleFields)$('rule-'+key).disabled=false;\n  if(!data.ok){\n    $(action==='rules'?'settings-error':'review-error').textContent=data.message||'Не удалось сохранить изменения.';\n    updateReview();\n    return;\n  }\n  if(action==='set-exempt'&&reviewDraft){\n    if(exempt)reviewDraft.expected.review_exempt=true;\n    else delete reviewDraft.expected.review_exempt;\n    reviewDraft.awaitingExemption=exempt;\n    reviewDraft.action='record';\n    reviewDraft.grade='';\n    $('review-date').value=today;\n    $('review-save').textContent='Записать повторение';\n    $('reset-confirm').hidden=true;\n    $('operation-status').textContent=exempt?'Повторение больше не требуется.':'Повторение снова включено.';\n    updateReview();\n    return;\n  }\n  closePane();\n  $('operation-status').textContent=action==='rules'?'Настройки сроков сохранены.'\n    :action==='reset'?'Прогресс сброшен.'\n    :action==='correct'?'Дата повторения исправлена.':'Повторение записано.';\n}\nfor(const key of gradeKeys){\n  $('grade-'+key).addEventListener('click',()=>{\n    if(!reviewDraft||pendingEdit)return;\n    reviewDraft.grade=key;\n    updateReview();\n  });\n}\n$('review-date').addEventListener('input',updateReview);\n$('review-close').addEventListener('click',closePane);\n$('review-exempt').addEventListener('click',()=>{\n  if(!reviewDraft||pendingEdit||$('review-exempt').disabled)return;\n  const {id,expected}=reviewDraft, note=byId.get(id)?.n;\n  if(!note||!eligible(note))return;\n  $('review-error').textContent='';\n  postEdit('knowledge-tree-review',{id,expected,action:'set-exempt',exempt:!note.review_exempt});\n});\nfunction bindSave(formId,buttonId,action){\n  const form=$(formId),button=$(buttonId);\n  const save=()=>{\n    if(!button.disabled&&form.reportValidity?.()!==false)action();\n  };\n  // The sandboxed viewer handles saves through its bridge without native form submission.\n  button.addEventListener('click',save);\n  form.addEventListener('submit',event=>event.preventDefault());\n  form.addEventListener('keydown',event=>{\n    if(event.key!=='Enter'||event.target?.tagName!=='INPUT')return;\n    event.preventDefault();\n    save();\n  });\n}\nbindSave('review-form','review-save',()=>{\n  if(reviewDraft)submitReview(reviewDraft.action);\n});\n$('review-correct').addEventListener('click',()=>{\n  if(!reviewDraft||pendingEdit)return;\n  const n=byId.get(reviewDraft.id)?.n;\n  if(!n?.reviewed_on||!n.review_interval_days)return;\n  reviewDraft.action='correct';\n  $('review-date').value=n.reviewed_on;\n  $('review-grades').hidden=true;\n  $('review-save').textContent='Сохранить дату';\n  $('review-error').textContent='';\n  updateReview();\n});\n$('review-reset').addEventListener('click',()=>{\n  $('reset-confirm').hidden=false;\n  $('reset-approve').focus?.();\n});\n$('reset-cancel').addEventListener('click',()=>{\n  $('reset-confirm').hidden=true;\n  $('review-reset').focus?.();\n});\n$('reset-approve').addEventListener('click',()=>submitReview('reset'));\n$('open-review-settings').addEventListener('click',()=>{\n  if(sourceMode!=='obsidian'||pendingEdit)return;\n  $('operation-status').textContent='';\n  returnFocus=document.activeElement;\n  reviewDraft=null;\n  for(const key of ruleFields)$('rule-'+key).value=String(reviewRules[key]);\n  $('settings-error').textContent='';\n  showPane('settings');\n  renderList();\n  $('rule-first').focus?.({preventScroll:true});\n});\n$('rules-close').addEventListener('click',closePane);\nbindSave('review-rules-form','rules-save',()=>{\n  if(pendingEdit||sourceMode!=='obsidian')return;\n  const rules={};\n  for(const key of ruleFields)rules[key]=Number($('rule-'+key).value);\n  if(ruleFields.some(key=>!key.endsWith('Mul')&&rules[key]>rules.cap)){\n    $('settings-error').textContent='Максимум должен быть не меньше остальных сроков и минимумов.';\n    return;\n  }\n  $('settings-error').textContent='';\n  postEdit('knowledge-tree-review-rules',{rules});\n});\n\nfunction refreshCalendar(){\n  const day=localDay();\n  if(day===today)return;\n  today=day;\n  updateShortcuts();\n  if(viewMode==='cards')renderList();\n  else render();\n  updateReview();\n  if(sourceMode==='obsidian')refresh();\n}\nfunction scheduleMidnight(){\n  clearTimeout(midnightTimer);\n  const midnight=new Date();\n  midnight.setHours(24,0,0,100);\n  midnightTimer=setTimeout(()=>{\n    refreshCalendar();\n    scheduleMidnight();\n  },Math.max(100,midnight.getTime()-Date.now()));\n}\nfunction cardAction(target){\n  const status=target.closest('.status-cycle');\n  if(status)return {run:cycleStatus,id:status.dataset.statusId};\n  const note=target.closest('.note-open');\n  if(note)return {run:openNote,id:note.dataset.noteId};\n  const card=target.closest('[data-id]');\n  if(card)return {run:activate,id:card.dataset.id};\n  return null;\n}\nfunction startView(){if(!tree)return;focusBranch(tree.id);}$('back').addEventListener('click',()=>focusBranch($('back').dataset.parent));$('overview').addEventListener('click',()=>{if(!tree)return;opened=new Set([tree.id]);focus=tree.id;selected=null;$('selection').textContent='';render();focusBranch(tree.id);});$('more').addEventListener('click',()=>zoomAt(board.clientWidth/2,board.clientHeight/2,1.22));$('less').addEventListener('click',()=>zoomAt(board.clientWidth/2,board.clientHeight/2,1/1.22));$('nodes').addEventListener('click',e=>{if(e.detail!==0&&Date.now()-lastPointer<=450)return;const action=cardAction(e.target);if(action)action.run(action.id);});function point(e){const r=board.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}function startPinch(){const[a,b]=[...pointers.values()],m={x:(a.x+b.x)/2,y:(a.y+b.y)/2};pinch={distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),z:camera.z,wx:(m.x-camera.x)/camera.z,wy:(m.y-camera.y)/camera.z};moved=true;if(drag)drag.action=null;}\nboard.addEventListener('pointerdown',e=>{if(e.target.closest('.controls')||e.target.closest('.crumb')||e.button>0)return;const p=point(e);pointers.set(e.pointerId,p);board.setPointerCapture(e.pointerId);if(pointers.size===1){drag={p,camera:{...camera},action:cardAction(e.target)};moved=false;}else if(pointers.size===2)startPinch();});board.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const p=point(e);pointers.set(e.pointerId,p);if(pointers.size>=2&&pinch){const[a,b]=[...pointers.values()],m={x:(a.x+b.x)/2,y:(a.y+b.y)/2},z=Math.max(.06,Math.min(2.5,pinch.z*Math.hypot(a.x-b.x,a.y-b.y)/pinch.distance));camera={x:m.x-pinch.wx*z,y:m.y-pinch.wy*z,z};transform();}else if(drag){const dx=p.x-drag.p.x,dy=p.y-drag.p.y;if(Math.hypot(dx,dy)>7)moved=true;if(moved){camera.x=drag.camera.x+dx;camera.y=drag.camera.y+dy;transform();}}});function end(e,cancel){if(!pointers.has(e.pointerId))return;const single=pointers.size===1,action=drag?.action;pointers.delete(e.pointerId);lastPointer=Date.now();if(!pointers.size){drag=null;pinch=null;if(single&&!moved&&!cancel&&action)action.run(action.id);}else if(pointers.size===1){drag={p:[...pointers.values()][0],camera:{...camera},action:null};pinch=null;moved=true;}else startPinch();}board.addEventListener('pointerup',e=>end(e,false));board.addEventListener('pointercancel',e=>end(e,true));board.addEventListener('wheel',e=>{if(e.target.closest('.controls'))return;e.preventDefault();const p=point(e);zoomAt(p.x,p.y,Math.exp(-e.deltaY*.0015));},{passive:false});new ResizeObserver(()=>{const w=board.clientWidth,h=board.clientHeight;if(!w||!h)return;if(!size){size={w,h};startView();}else if((size.w<620)!==(w<620)){size={w,h};render();if(tree)focusBranch(positions.has(focus)?focus:tree.id);}else{const wx=(size.w/2-camera.x)/camera.z,wy=(size.h/2-camera.y)/camera.z;size={w,h};camera.x=w/2-wx*camera.z;camera.y=h/2-wy*camera.z;transform();}}).observe(board);\nlet sourceMode='none',directoryHandle=null,loading=false,apiRevision='',sourceLabel='',apiFailures=0,lastFilePicker='folder-input';\nconst inObsidian=window.parent!==window&&location.protocol==='about:';\nfunction sourceStatus(text,error=false){$('source').textContent=text;$('source').classList.toggle('error',error);}\nfunction showError(error){$('error').hidden=false;$('error-text').textContent=String(error?.message||error);sourceStatus(tree?'Не обновлено · показана предыдущая версия':'Не удалось прочитать темы',true);}\nfunction clearError(){$('error').hidden=true;$('error-text').textContent='';}\nfunction applyTree(next,label){\n  const first=!tree;tree=next;byId.clear();index(tree);for(const id of opened)if(!byId.has(id))opened.delete(id);opened.add(tree.id);\n  if(!byId.has(focus))focus=tree.id;if(selected&&!byId.has(selected))selected=null;\n  sourceLabel=label;\n  today=localDay();\n  cardEntries=[...byId.values()].filter(({n})=>n.id!==tree.id&&!n.children?.length);\n  const {total,todo,studying,known}=aggregate(tree);\n  $('count').textContent=`Всего карточек ${total} · Не изучено ${todo} · В работе ${studying} · Изучено ${known}`;\n  $('empty').hidden=true;\n  for(const id of ['view-cards','list-studying','list-overdue'])$(id).disabled=false;\n  $('open-review-settings').disabled=false;\n  clearError();\n  sourceStatus(label+' · '+(byId.size-1)+' заметок');\n  updateShortcuts();\n  if(viewMode==='cards')renderList();\n  else render();\n  if(first)startView();\n  $('selection').textContent=selected?labels[byId.get(selected).n.status]+' · '+byId.get(selected).n.title:'';\n  updateReview();\n}\nasync function recordsFromFiles(files){\n  const records=[],errors=[];for(let i=0;i<files.length;i+=24){await Promise.all(files.slice(i,i+24).map(async({file,path})=>{try{const header=await file.slice(0,65536).text();records.push(KnowledgeTreeData.parseHeader(header,path));}catch(e){errors.push(e.message);}}));}\n  if(errors.length)throw new Error(errors.join('\\n'));return records;\n}\nasync function walkHandle(handle,prefix=''){\n  const files=[];for await(const[name,entry]of handle.entries()){if(name.startsWith('.'))continue;const path=prefix+name;if(entry.kind==='directory')files.push(...await walkHandle(entry,path+'/'));else if(/\\.md$/i.test(name))files.push({file:await entry.getFile(),path});}return files;\n}\nasync function readDirectory(){\n  let topics;try{topics=await directoryHandle.getDirectoryHandle('topics');}catch(e){if(directoryHandle.name==='topics')topics=directoryHandle;else throw new Error('Выберите папку KnowledgeTree или её папку topics.');}\n  const files=await walkHandle(topics);if(!files.length)throw new Error('В папке topics не найдены Markdown-заметки.');return KnowledgeTreeData.buildTree(await recordsFromFiles(files));\n}\nasync function chooseFolder(){\n  if(loading)return;if(typeof window.showDirectoryPicker!=='function'){$('folder-input').click();return;}\n  try{const handle=await window.showDirectoryPicker({mode:'read'});directoryHandle=handle;loading=true;sourceStatus('Читаю свойства заметок…');const next=await readDirectory();sourceMode='directory';applyTree(next,'Папка · обновление вручную');}\n  catch(e){if(e.name==='AbortError')return;if(e.name==='SecurityError'||e.name==='NotSupportedError'){$('folder-input').click();return;}showError(e);}finally{loading=false;}\n}\nasync function pickedFiles(event,directory){\n  if(loading)return;const selectedFiles=[...event.target.files];if(!selectedFiles.length)return;loading=true;sourceStatus('Читаю свойства заметок…');\n  try{\n    const files=selectedFiles.filter(f=>/\\.md$/i.test(f.name)).map(file=>{const parts=(file.webkitRelativePath||file.name).split('/'),t=parts.indexOf('topics');return{file,path:directory?(t<0?'':parts.slice(t+1).join('/')):file.name};}).filter(x=>x.path&&!x.path.split('/').some(s=>s.startsWith('.')));\n    if(!files.length)throw new Error('Выберите KnowledgeTree или topics. Если браузер не умеет выбирать папки, используйте «Выбрать файлы .md».');\n    const next=KnowledgeTreeData.buildTree(await recordsFromFiles(files));sourceMode='files';directoryHandle=null;lastFilePicker=directory?'folder-input':'files-input';applyTree(next,'Выбранные файлы · для обновления выберите заново');\n  }catch(e){showError(e);}finally{loading=false;event.target.value='';}\n}\nasync function loadAPI(){\n  if(loading)return;loading=true;try{const response=await fetch('/api/tree',{cache:'no-store',signal:AbortSignal.timeout(10000)}),payload=await response.json();\n    if(!response.ok||!payload.tree)throw new Error((payload.errors||[]).map(e=>(e.path?e.path+': ':'')+e.message).join('\\n')||'Сервер не вернул дерево.');\n    if(sourceMode!=='api')return;apiFailures=0;if(payload.revision!==apiRevision){applyTree(payload.tree,'Заметки · автообновление');apiRevision=payload.revision;}else{clearError();sourceStatus('Заметки · автообновление · '+(byId.size-1)+' заметок');}\n  }catch(e){if(sourceMode==='api'){apiFailures++;showError(new Error(e.message+'\\nПроверьте, запущен ли tools/start-tree.sh.'));}}finally{loading=false;}\n}\nasync function refresh(){\n  if(loading)return;if(sourceMode==='obsidian'){window.parent.postMessage({type:'knowledge-tree-refresh'},'*');return;}if(sourceMode==='api'){await loadAPI();return;}\n  if(sourceMode==='directory'){loading=true;try{applyTree(await readDirectory(),'Папка · обновление вручную');}catch(e){showError(e);}finally{loading=false;}return;}\n  if(sourceMode==='files'){$(lastFilePicker).click();return;}await chooseFolder();\n}\n$('folder').addEventListener('click',chooseFolder);$('choose').addEventListener('click',chooseFolder);$('refresh').addEventListener('click',refresh);\n$('choose-files').addEventListener('click',()=>$('files-input').click());$('folder-input').addEventListener('change',e=>pickedFiles(e,true));$('files-input').addEventListener('change',e=>pickedFiles(e,false));\nif(inObsidian){\n  sourceMode='obsidian';sourceStatus('Подключаю Obsidian…');$('folder').hidden=true;$('choose').hidden=true;$('choose-files').hidden=true;$('welcome-text').textContent='Читаю свойства заметок из Obsidian…';\n  $('open-review-settings').hidden=false;\n  $('open-review-settings').disabled=true;\n  window.addEventListener('message',event=>{\n    if(event.source!==window.parent)return;\n    const data=event.data;\n    if(data?.type==='knowledge-tree-data'){\n      try{\n        const next=KnowledgeTreeData.buildTree(data.payload.notes);\n        reviewRules=data.payload.reviewRules||defaultRules;\n        applyTree(next,'Obsidian · автообновление');\n      }catch(e){showError(e);}\n    }else if(data?.type==='knowledge-tree-review-result')handleEditResult(data);\n    else if(data?.type==='knowledge-tree-error')showError(new Error(data.message));\n  });\n  window.parent.postMessage({type:'knowledge-tree-ready'},'*');\n}else if(/^https?:$/.test(location.protocol)){\n  sourceMode='api';loadAPI();setInterval(()=>{if(sourceMode==='api'&&!document.hidden)loadAPI();},4000);\n}\ndocument.addEventListener('visibilitychange',()=>{\n  if(document.hidden)return;\n  refreshCalendar();\n  scheduleMidnight();\n  if(sourceMode==='api')loadAPI();\n});\nscheduleMidnight();\n\n})();\n\n</script></body></html>\n"; // @bundle-html

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
