/* =========================================================
 * 简单题库 · APK 版 · Part 3/4：答题页
 * 章节/随机模式 · 选择即判分自动跳题 · 上一题/下一题回看（不重复计分）
 * =======================================================*/
let quizState = null;
let quizMode = 'chapter';

function renderQuizSetup(){
  const qs = State.questions;
  $('#quiz-pool').textContent = qs.length;
  $('#quiz-empty').classList.toggle('hidden', qs.length > 0);
  $('#btn-start').disabled = qs.length === 0;
  const chapters = [...new Set(qs.map(getChapter))];
  $('#quiz-chapter').innerHTML = chapters.map(c => {
    const n = qs.filter(q => getChapter(q) === c).length;
    return `<option value="${escapeAttr(c)}">${escapeHtml(c)}（${n} 题）</option>`;
  }).join('');
  $('#chapter-group').style.display = quizMode === 'chapter' ? '' : 'none';
  $('#quiz-setup').classList.remove('hidden');
  $('#quiz-run').classList.add('hidden');
  $('#quiz-done').classList.add('hidden');
  $('#quiz-title').textContent = '答题';
}

$$('#quiz-setup [data-mode]').forEach(b => b.addEventListener('click', () => {
  quizMode = b.dataset.mode;
  $$('#quiz-setup [data-mode]').forEach(x => {
    x.classList.toggle('btn-primary', x === b);
    x.classList.toggle('btn-ghost', x !== b);
  });
  $('#chapter-group').style.display = quizMode === 'chapter' ? '' : 'none';
}));

$('#btn-start').addEventListener('click', () => {
  const qs = State.questions;
  let pool;
  if (quizMode === 'chapter'){
    const ch = $('#quiz-chapter').value;
    pool = qs.filter(q => getChapter(q) === ch);
    if (!pool.length){ toast('该章节暂无题目'); return; }
  } else {
    pool = qs.slice().sort(() => Math.random() - 0.5);
  }
  const c = $('#quiz-count').value;
  if (c !== 'all') pool = pool.slice(0, parseInt(c,10));
  if (!pool.length){ toast('题库为空'); return; }
  quizState = { items: pool, idx: 0, picked: null, records: [] };
  $('#quiz-setup').classList.add('hidden');
  $('#quiz-run').classList.remove('hidden');
  $('#quiz-done').classList.add('hidden');
  $('#quiz-title').textContent = quizMode === 'chapter' ? '答题 · ' + $('#quiz-chapter').value : '答题 · 随机';
  renderQuestion();
});

function renderQuestion(){
  clearTimeout(quizState.autoTimer);
  const q = quizState.items[quizState.idx];
  const total = quizState.items.length;
  const rec = quizState.records[quizState.idx];
  const rightCount = quizState.records.filter(r => r && r.right).length;

  $('#quiz-progress-text').textContent = (quizState.idx+1) + ' / ' + total;
  $('#quiz-correct-text').textContent = '正确 ' + rightCount;
  $('#quiz-bar').style.width = (((quizState.idx+1)/total)*100) + '%';
  $('#q-text').textContent = q.q;

  $('#q-options').innerHTML = q.options.map((o,k) => `
    <div class="option" data-pick="${'ABCD'[k]}">
      <div class="key">${'ABCD'[k]}</div>
      <div class="text-sm">${escapeHtml(o)}</div>
    </div>
  `).join('');

  if (rec && rec.submitted){
    /* 回看已提交题目：锁定只读 */
    $$('#q-options .option').forEach(o => {
      o.classList.add('locked');
      const v = o.dataset.pick;
      if (v === q.answer) o.classList.add('correct');
      if (v === rec.picked && !rec.right) o.classList.add('wrong');
    });
    const r = $('#q-result');
    r.classList.remove('hidden');
    r.style.background = rec.right ? 'rgba(7,193,96,.08)' : 'rgba(250,81,81,.08)';
    r.style.color = rec.right ? '#07C160' : '#FA5151';
    r.innerHTML = '<div class="font-medium mb-2">' + (rec.right ? '✓ 回答正确' : '✗ 回答错误') + '</div>' +
      '<div style="color:#888;">正确答案：' + q.answer + (q.explain ? '  ·  ' + escapeHtml(q.explain) : '') + '</div>' +
      '<div class="text-xs mt-2" style="color:#999;">即将进入下一题…</div>';
    $('#btn-next').classList.remove('hidden');
  } else {
    /* 作答中：选择后自动判分并跳转 */
    $('#q-result').classList.add('hidden');
    $('#q-result').innerHTML = '';
    $('#btn-next').classList.add('hidden');
    $$('#q-options .option').forEach(o => o.addEventListener('click', () => {
      if (quizState.records[quizState.idx]?.submitted) return;
      quizState.picked = o.dataset.pick;
      submitAnswer();
    }));
  }
  $('#btn-prev').style.visibility = quizState.idx === 0 ? 'hidden' : 'visible';
  $('#btn-next').textContent = quizState.idx === total - 1 ? '完成' : '下一题';
  $('#quiz-scroll').scrollTo({ top: 0, behavior: 'smooth' });
}

function submitAnswer(){
  if (!quizState.picked || quizState.records[quizState.idx]?.submitted) return;
  const q = quizState.items[quizState.idx];
  const right = quizState.picked === q.answer;
  quizState.records[quizState.idx] = { picked: quizState.picked, right, submitted: true };
  /* 记录统计与错题（仅首次提交） */
  const st = State.stats;
  st.answered++; if (right) st.right++; else st.wrong++;
  State.stats = st;
  if (!right){
    const w = State.wrong;
    const ex = w.find(x => x.qid === q.id);
    if (ex){ ex.wrongCount++; ex.lastWrongAt = Date.now(); }
    else w.push({ qid: q.id, wrongCount: 1, lastWrongAt: Date.now() });
    State.wrong = w;
  }
  renderQuestion();
  clearTimeout(quizState.autoTimer);
  quizState.autoTimer = setTimeout(goNext, 1000);
}

function goNext(){
  clearTimeout(quizState.autoTimer);
  if (!quizState || !quizState.records[quizState.idx]?.submitted) return;
  quizState.idx++;
  if (quizState.idx >= quizState.items.length){
    const answered = quizState.records.filter(r => r && r.submitted).length;
    const right = quizState.records.filter(r => r && r.right).length;
    $('#quiz-run').classList.add('hidden');
    $('#quiz-done').classList.remove('hidden');
    $('#done-total').textContent = answered;
    $('#done-right').textContent = right;
    $('#done-wrong').textContent = answered - right;
    return;
  }
  quizState.picked = null;
  renderQuestion();
}

$('#btn-prev').addEventListener('click', () => {
  if (quizState.idx === 0) return;
  clearTimeout(quizState.autoTimer);
  quizState.idx--;
  quizState.picked = null;
  renderQuestion();
});
$('#btn-next').addEventListener('click', goNext);
$('#btn-restart').addEventListener('click', () => renderQuizSetup());
