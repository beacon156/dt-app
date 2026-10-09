/* =========================================================
 * 简单题库 · APK 版 · Part 2/4：录入页（手动 / 批量导入 / 分组列表 / 编辑）
 * =======================================================*/
let inputTab = 'manual';
let editAnswer = null;

function renderInput(){
  $$('#page-input [data-tab]').forEach(b => {
    const active = b.dataset.tab === inputTab;
    b.classList.toggle('bg-wechat-green', active);
    b.classList.toggle('text-white', active);
    b.classList.toggle('text-wechat-sub', !active);
  });
  $('#tab-manual').classList.toggle('hidden', inputTab !== 'manual');
  $('#tab-batch').classList.toggle('hidden', inputTab !== 'batch');
  $('#tab-list').classList.toggle('hidden', inputTab !== 'list');
  if (inputTab === 'list') renderQuestionList();
  refreshAnswerButtons();
}

$$('#page-input [data-tab]').forEach(b => b.addEventListener('click', () => {
  inputTab = b.dataset.tab;
  renderInput();
}));

function refreshAnswerButtons(){
  $$('#f-answer [data-val]').forEach(b => {
    const sel = editAnswer === b.dataset.val;
    b.classList.toggle('btn-primary', sel);
    b.classList.toggle('btn-ghost', !sel);
  });
}

$$('#f-answer [data-val]').forEach(b => b.addEventListener('click', () => {
  editAnswer = b.dataset.val;
  refreshAnswerButtons();
}));

$('#btn-clear').addEventListener('click', () => {
  ['f-chapter','f-q','f-a','f-b','f-c','f-d','f-exp'].forEach(id => $('#'+id).value = '');
  editAnswer = null; refreshAnswerButtons();
});

$('#btn-save').addEventListener('click', () => {
  const q = $('#f-q').value.trim();
  const opts = ['f-a','f-b','f-c','f-d'].map(id => $('#'+id).value.trim());
  if (!q){ toast('请填写题干'); return; }
  if (opts.some(o => !o)){ toast('请填写四个选项'); return; }
  if (!editAnswer){ toast('请选择正确答案'); return; }
  const item = { id: uid(), chapter: $('#f-chapter').value.trim(), q, options: opts, answer: editAnswer, explain: $('#f-exp').value.trim(), createdAt: Date.now() };
  const list = State.questions;
  list.push(item);
  State.questions = list;
  toast('已保存');
  $('#btn-clear').click();
});

$('#btn-batch-template').addEventListener('click', () => {
  $('#batch-text').value = JSON.stringify([
    { chapter: '示例章节', q: '题干示例', options: ['A 选项', 'B 选项', 'C 选项', 'D 选项'], answer: 'A', explain: '可选解析' }
  ], null, 2);
});

$('#btn-batch-import').addEventListener('click', () => {
  const txt = $('#batch-text').value.trim();
  if (!txt){ toast('请粘贴 JSON 内容'); return; }
  let data;
  try { data = JSON.parse(txt); } catch { toast('JSON 解析失败'); return; }
  const arr = Array.isArray(data) ? data : data.questions;
  if (!Array.isArray(arr)){ toast('需要 JSON 数组或 {questions:[...]}'); return; }
  let added = 0;
  const list = State.questions;
  for (const it of arr){
    const q = (it.q ?? it.question ?? '').toString().trim();
    const opts = (it.options ?? [it.A, it.B, it.C, it.D].filter(Boolean)).map(x => String(x ?? '').trim());
    const ans = (it.answer ?? it.correct ?? '').toString().toUpperCase();
    if (!q || opts.length !== 4 || !['A','B','C','D'].includes(ans)) continue;
    list.push({ id: uid(), chapter: (it.chapter ?? '').toString().trim(), q, options: opts, answer: ans, explain: (it.explain ?? '').toString(), createdAt: Date.now() });
    added++;
  }
  State.questions = list;
  toast('成功导入 ' + added + ' 题');
  $('#batch-text').value = '';
});

/* ---------------- 题目列表（按章节分组） ---------------- */
function renderQuestionList(){
  const list = State.questions;
  $('#list-count').textContent = list.length;
  const wrap = $('#q-list');
  const empty = $('#q-empty');
  if (!list.length){ wrap.innerHTML = ''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  const map = new Map();
  list.forEach((it, i) => {
    const ch = getChapter(it);
    if (!map.has(ch)) map.set(ch, []);
    map.get(ch).push({ ...it, _idx: i + 1 });
  });
  wrap.innerHTML = [...map.entries()].map(([ch, items]) => `
    <div>
      <div class="flex items-center justify-between bg-white rounded-lg px-3 py-2 shadow-card sticky-top">
        <div class="text-sm font-semibold text-wechat-text flex items-center gap-2">
          <span class="w-1-5 h-4 rounded-full bg-wechat-green"></span>${escapeHtml(ch)}
          <span class="text-xs text-wechat-sub font-medium">（${items.length} 题）</span>
        </div>
        <button class="text-xs text-wechat-danger shrink-0" data-del-chapter="${escapeAttr(ch)}">删除本章</button>
      </div>
      <div class="space-y-2 my-2">
        ${items.map(it => `
        <div class="bg-white rounded-lg p-3 shadow-card">
          <div class="flex justify-between items-start gap-2">
            <div class="text-sm font-medium text-wechat-text flex-1"><span class="text-wechat-sub"> ${it._idx}. </span>${escapeHtml(it.q)}</div>
            <span class="badge badge-right">${it.answer}</span>
          </div>
          <div class="text-xs text-wechat-sub mt-2 space-y-0-5">
            ${it.options.map((o,k)=>`<div>${'ABCD'[k]}. ${escapeHtml(o)}</div>`).join('')}
          </div>
          ${it.explain ? `<div class="text-xs text-wechat-sub mt-2 italic">解析：${escapeHtml(it.explain)}</div>` : ''}
          <div class="flex justify-end gap-3 mt-2 text-xs">
            <button class="text-blue" data-edit="${it.id}">编辑</button>
            <button class="text-wechat-danger" data-del="${it.id}">删除</button>
          </div>
        </div>`).join('')}
      </div>
    </div>
  `).join('');
}

$('#q-list').addEventListener('click', e => {
  const ed = e.target.closest('[data-edit]');
  const dl = e.target.closest('[data-del]');
  const dc = e.target.closest('[data-del-chapter]');
  if (ed) openEditModal(ed.dataset.edit);
  if (dl){
    if (!confirm('删除该题目？')) return;
    const id = dl.dataset.del;
    State.questions = State.questions.filter(x => x.id !== id);
    State.wrong = State.wrong.filter(x => x.qid !== id);
  }
  if (dc){
    const ch = dc.dataset.delChapter;
    const n = State.questions.filter(x => getChapter(x) === ch).length;
    if (!confirm('删除章节「' + ch + '」下的全部 ' + n + ' 道题目？此操作不可恢复。')) return;
    const ids = new Set(State.questions.filter(x => getChapter(x) === ch).map(x => x.id));
    State.questions = State.questions.filter(x => !ids.has(x.id));
    State.wrong = State.wrong.filter(x => !ids.has(x.qid));
    toast('已删除「' + ch + '」' + n + ' 题');
  }
});

/* ---------------- 编辑弹窗 ---------------- */
function openEditModal(id){
  const it = State.questions.find(x => x.id === id);
  if (!it) return;
  const m = $('#modal');
  $('#m-title').textContent = '编辑题目';
  $('#m-body').innerHTML = `
    <div><label class="text-xs text-wechat-sub">章节（可选）</label><input id="m-chapter" value="${escapeAttr(it.chapter||'')}"></div>
    <div><label class="text-xs text-wechat-sub">题干</label><textarea id="m-q" rows="3">${escapeHtml(it.q)}</textarea></div>
    <div><label class="text-xs text-wechat-sub">选项 A</label><input id="m-a" value="${escapeAttr(it.options[0])}"></div>
    <div><label class="text-xs text-wechat-sub">选项 B</label><input id="m-b" value="${escapeAttr(it.options[1])}"></div>
    <div><label class="text-xs text-wechat-sub">选项 C</label><input id="m-c" value="${escapeAttr(it.options[2])}"></div>
    <div><label class="text-xs text-wechat-sub">选项 D</label><input id="m-d" value="${escapeAttr(it.options[3])}"></div>
    <div>
      <label class="text-xs text-wechat-sub">正确答案</label>
      <div class="grid grid-cols-4 gap-2 mt-1" id="m-answer">
        ${['A','B','C','D'].map(k => `<button type="button" data-val="${k}" class="btn ${k===it.answer?'btn-primary':'btn-ghost'}">${k}</button>`).join('')}
      </div>
    </div>
    <div><label class="text-xs text-wechat-sub">解析</label><textarea id="m-exp" rows="2">${escapeHtml(it.explain||'')}</textarea></div>
  `;
  let ans = it.answer;
  $$('#m-answer [data-val]').forEach(b => b.addEventListener('click', () => {
    ans = b.dataset.val;
    $$('#m-answer [data-val]').forEach(x => {
      x.classList.toggle('btn-primary', x.dataset.val === ans);
      x.classList.toggle('btn-ghost', x.dataset.val !== ans);
    });
  }));
  $('#m-ok').onclick = () => {
    const q = $('#m-q').value.trim();
    const opts = ['m-a','m-b','m-c','m-d'].map(id => $('#'+id).value.trim());
    if (!q || opts.some(o => !o) || !ans){ toast('请填写完整'); return; }
    const list = State.questions;
    const idx = list.findIndex(x => x.id === id);
    list[idx] = { ...list[idx], chapter: $('#m-chapter').value.trim(), q, options: opts, answer: ans, explain: $('#m-exp').value.trim() };
    State.questions = list;
    m.classList.remove('show');
    toast('已更新');
  };
  $('#m-cancel').onclick = () => m.classList.remove('show');
  m.classList.add('show');
}
