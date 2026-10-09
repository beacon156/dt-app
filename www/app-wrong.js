/* =========================================================
 * 简单题库 · APK 版 · Part 4/4：错题集 / 备份 / 初始化
 * =======================================================*/
function renderWrong(){
  const w = State.wrong;
  const qs = State.questions;
  const list = w.map(x => ({...x, q: qs.find(q => q.id === x.qid)})).filter(x => x.q);
  list.sort((a,b) => b.lastWrongAt - a.lastWrongAt);
  $('#wrong-count').textContent = list.length;
  const wrap = $('#wrong-list');
  const empty = $('#wrong-empty');
  if (!list.length){ wrap.innerHTML = ''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  wrap.innerHTML = list.map((it, i) => {
    const ansIdx = 'ABCD'.indexOf(it.q.answer);
    return `
    <div class="bg-white rounded-lg p-3 shadow-card">
      <div class="flex justify-between items-start gap-2">
        <div class="text-sm font-medium text-wechat-text flex-1"><span class="text-wechat-sub"> ${i+1}. </span>${escapeHtml(it.q.q)}</div>
        <span class="badge badge-wrong">错 ${it.wrongCount}</span>
      </div>
      <div class="text-xs text-wechat-sub mt-2 space-y-0-5">
        ${it.q.options.map((o,k)=>{
          const cls = k === ansIdx ? 'text-wechat-green font-medium' : '';
          return `<div class="${cls}">${'ABCD'[k]}. ${escapeHtml(o)}${k===ansIdx?'  ✓':''}</div>`;
        }).join('')}
      </div>
      ${it.q.explain ? `<div class="text-xs text-wechat-sub mt-2 italic">解析：${escapeHtml(it.q.explain)}</div>` : ''}
      <div class="flex justify-end mt-2 text-xs">
        <button class="text-wechat-danger" data-rm="${it.qid}">移除</button>
      </div>
    </div>`;
  }).join('');
}

$('#wrong-list').addEventListener('click', e => {
  const r = e.target.closest('[data-rm]');
  if (!r) return;
  State.wrong = State.wrong.filter(x => x.qid !== r.dataset.rm);
  toast('已移除');
});

$('#btn-clear-wrong').addEventListener('click', () => {
  if (!State.wrong.length){ toast('错题集已为空'); return; }
  if (!confirm('确定清空错题集？')) return;
  State.wrong = [];
  toast('已清空');
});

$('#btn-redo').addEventListener('click', () => {
  if (!State.wrong.length){ toast('暂无错题'); return; }
  const ids = new Set(State.wrong.map(x => x.qid));
  const items = State.questions.filter(q => ids.has(q.id));
  if (!items.length){ toast('对应题目已不存在'); return; }
  items.sort(() => Math.random() - 0.5);
  go('quiz');
  setTimeout(() => {
    quizState = { items, idx: 0, picked: null, records: [] };
    $('#quiz-setup').classList.add('hidden');
    $('#quiz-run').classList.remove('hidden');
    $('#quiz-done').classList.add('hidden');
    $('#quiz-title').textContent = '错题重做';
    renderQuestion();
  }, 50);
});

/* ---------------- 备份 & 恢复 ---------------- */
$('#btn-export').addEventListener('click', () => {
  const data = { questions: State.questions, wrong: State.wrong, stats: State.stats, exportedAt: Date.now() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = '题库备份-' + new Date().toISOString().slice(0,10) + '.json';
  a.click(); URL.revokeObjectURL(url);
  toast('已导出');
});

$('#btn-import').addEventListener('click', () => $('#file-input').click());

$('#file-input').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(r.result);
      if (Array.isArray(data)) data.questions = data;
      if (Array.isArray(data.questions)){
        if (!confirm('将导入 ' + data.questions.length + ' 题，是否覆盖当前题库？\n确定=覆盖，取消=追加')){
          /* 追加 */
          const list = State.questions;
          for (const it of data.questions){
            const q = (it.q ?? '').toString().trim();
            const opts = (it.options ?? []).map(x=>String(x??'').trim());
            const ans = (it.answer ?? '').toString().toUpperCase();
            if (q && opts.length===4 && ['A','B','C','D'].includes(ans)){
              list.push({ id: uid(), chapter: (it.chapter ?? '').toString().trim(), q, options: opts, answer: ans, explain: it.explain ?? '', createdAt: Date.now() });
            }
          }
          State.questions = list;
          toast('已追加导入');
        } else {
          /* 覆盖 */
          State.questions = data.questions.map(x => ({
            id: x.id || uid(), chapter: (x.chapter ?? '').toString().trim(),
            q: x.q, options: x.options, answer: x.answer, explain: x.explain ?? '', createdAt: x.createdAt || Date.now()
          }));
          toast('已覆盖导入');
        }
      } else { toast('未找到 questions 字段'); }
    } catch { toast('解析失败'); }
    e.target.value = '';
  };
  r.readAsText(f);
});

$('#btn-sample').addEventListener('click', () => {
  const list = State.questions;
  let added = 0;
  for (const s of SAMPLE){
    if (!list.some(x => x.q === s.q)){
      list.push({ id: uid(), ...s, createdAt: Date.now() });
      added++;
    }
  }
  State.questions = list;
  toast(added ? '已新增 ' + added + ' 道示例题' : '示例题已存在');
});

$('#btn-reset').addEventListener('click', () => {
  if (!confirm('将清空全部题目、错题与统计，确定？')) return;
  localStorage.removeItem(KEYS.questions);
  localStorage.removeItem(KEYS.wrong);
  localStorage.removeItem(KEYS.stats);
  renderAll();
  toast('已清空');
});

/* ---------------- 全局渲染 & 初始化 ---------------- */
function renderAll(){
  renderHome();
  if (typeof inputTab !== 'undefined' && inputTab === 'list') renderQuestionList();
  renderWrong();
}

(function init(){
  refreshAnswerButtons();
  renderAll();
})();
