/* =========================================================
 * 简单题库 · APK 版 · Part 1/4：数据层 / 工具 / 路由 / 首页
 * localStorage 本地存储，离线可用
 * 数据模型：
 *   questions: [{ id, chapter, q, options:[4], answer, explain, createdAt }]
 *   wrong:     [{ qid, wrongCount, lastWrongAt }]
 *   stats:     { answered, right, wrong }
 * =======================================================*/
const KEYS = {
  questions: 'qb.questions',
  wrong:     'qb.wrong',
  stats:     'qb.stats',
};
const SAMPLE = [
  { chapter: '第一章 基础概念', q: '中华人民共和国成立于哪一年？', options: ['1949年','1950年','1945年','1956年'], answer: 'A', explain: '1949年10月1日新中国成立。' },
  { chapter: '第一章 基础概念', q: '一个字节（byte）等于多少位（bit）？', options: ['4','8','16','32'], answer: 'B', explain: '1 byte = 8 bit。' },
  { chapter: '第二章 Web 开发', q: '下列哪个不是 JavaScript 的基本数据类型？', options: ['string','number','class','boolean'], answer: 'C', explain: 'class 是 ES6 引入的关键字，不是基本类型。' },
  { chapter: '第二章 Web 开发', q: 'HTML 中用于定义超链接的标签是？', options: ['<a>','<link>','<href>','<url>'], answer: 'A', explain: '<a> 标签通过 href 属性定义超链接。' },
  { chapter: '第二章 Web 开发', q: '下列哪个是 CSS 中用于设置圆角的属性？', options: ['border-radius','corner-radius','round','radius'], answer: 'A', explain: 'border-radius 设置元素圆角半径。' },
  { chapter: '第二章 Web 开发', q: 'HTTP 状态码 404 表示？', options: ['服务器错误','未找到资源','未授权','请求超时'], answer: 'B', explain: '404 Not Found 表示服务器无法找到请求的资源。' },
  { chapter: '第三章 工具与数据库', q: '在 Git 中，把修改放入暂存区的命令是？', options: ['git commit','git push','git add','git stash'], answer: 'C', explain: 'git add 把改动放入暂存区。' },
  { chapter: '第三章 工具与数据库', q: '下列哪个不是常见的关系型数据库？', options: ['MySQL','PostgreSQL','MongoDB','SQLite'], answer: 'C', explain: 'MongoDB 是文档型 NoSQL 数据库。' },
];

const $ = (s, p=document) => p.querySelector(s);
const $$ = (s, p=document) => [...p.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);

const Store = {
  get(k, d){ try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)); }
};

const State = {
  get questions(){ return Store.get(KEYS.questions, []); },
  set questions(v){ Store.set(KEYS.questions, v); renderAll(); },
  get wrong(){ return Store.get(KEYS.wrong, []); },
  set wrong(v){ Store.set(KEYS.wrong, v); renderAll(); },
  get stats(){ return Store.get(KEYS.stats, { answered:0, right:0, wrong:0 }); },
  set stats(v){ Store.set(KEYS.stats, v); renderAll(); },
};

const getChapter = q => (q.chapter || '').trim() || '未分类';
function escapeHtml(s){ return (s ?? '').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeAttr(s){ return escapeHtml(s); }

function toast(msg){
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(()=> el.classList.remove('show'), 1500);
}

/* ---------------- 路由 ---------------- */
function go(name){
  $$('.page').forEach(p => p.classList.remove('active'));
  $('#page-' + name).classList.add('active');
  $$('.tabbar .tab').forEach(t => t.classList.toggle('active', t.dataset.go === name));
  $('#page-' + name + ' .scroll')?.scrollTo({ top: 0 });
  if (name === 'home') renderHome();
  if (name === 'input') renderInput();
  if (name === 'quiz') renderQuizSetup();
  if (name === 'wrong') renderWrong();
}

document.addEventListener('click', e => {
  const t = e.target.closest('[data-go], [data-back]');
  if (!t) return;
  if (t.dataset.go) go(t.dataset.go);
  else if (t.dataset.back !== undefined) go('home');
});

/* ---------------- 首页 ---------------- */
function renderHome(){
  $('#stat-total').textContent = State.questions.length;
  $('#stat-answered').textContent = State.stats.answered;
  $('#stat-right').textContent = State.stats.right;
  $('#stat-wrong').textContent = State.stats.wrong;
}
