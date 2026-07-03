// ============================================================
// 喵格研究所 v2 · 主逻辑（复用 ../cats.js 数据层）
// ============================================================

(function () {
  // --- State ---
  let catName = '';
  let catColor = '';
  let currentQ = 0;
  let answers = new Array(QUESTIONS.length).fill(null);
  let resultType = null;
  let resultScores = null;
  let advancing = false; // 自动翻题时锁定点击

  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const views = {
    landing: document.getElementById('view-landing'),
    test: document.getElementById('view-test'),
    result: document.getElementById('view-result'),
  };
  function showView(name) {
    Object.values(views).forEach(v => v.classList.remove('active'));
    views[name].classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // 评定量表配置（钢笔墨色系）
  const DIM_CONFIG = [
    { key: 'EI', color: '#33507a', left: ['外向', 'E'], right: ['内向', 'I'], scoreSide: 'left' },
    { key: 'SN', color: '#b3862c', left: ['谨慎', 'S'], right: ['好奇', 'N'], scoreSide: 'right' },
    { key: 'TF', color: '#b23a2c', left: ['强势', 'T'], right: ['温和', 'F'], scoreSide: 'left' },
    { key: 'JP', color: '#3d7a55', left: ['规律', 'J'], right: ['随性', 'P'], scoreSide: 'left' },
  ];
  function dimPos(d) {
    const p = resultScores[d.key];
    return (d.scoreSide === 'left' ? (1 - p) : p) * 100;
  }

  // ============ 受理大厅 ============

  // 档案照片墙
  (function renderWall() {
    const grid = document.getElementById('wall-grid');
    for (const [code, t] of Object.entries(CAT_TYPES)) {
      const mug = document.createElement('div');
      mug.className = 'mug';
      mug.innerHTML = `
        <div class="mug-svg">${catSVG(code)}</div>
        <div class="mug-name">${t.name}</div>
        <div class="mug-code">${code}</div>`;
      mug.addEventListener('click', () => showTypeFile(code));
      grid.appendChild(mug);
    }
  })();

  // 档案简况弹窗
  const $modal = document.getElementById('type-modal');
  function showTypeFile(code) {
    const t = CAT_TYPES[code];
    const g = TYPE_GROUPS[t.group];
    document.getElementById('modal-inner').innerHTML = `
      <button class="modal-close" onclick="document.getElementById('type-modal').classList.remove('active')">✕</button>
      <div style="text-align:center;margin-bottom:14px">
        <div style="width:110px;height:110px;margin:0 auto 8px;background:#fff;border:2px solid var(--ink)">${catSVG(code)}</div>
        <div style="font-family:var(--font-head);font-size:22px;letter-spacing:3px">${t.name}</div>
        <div style="font-family:var(--mono);font-size:11px;color:var(--ink-soft);letter-spacing:2px">${code} · ${g.name}</div>
      </div>
      <p style="font-size:14px;line-height:1.9;margin-bottom:14px">${t.desc}</p>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${t.tags.map(tag => `<span class="idc-tag">${tag}</span>`).join('')}
      </div>`;
    $modal.classList.add('active');
  }
  $modal.addEventListener('click', e => { if (e.target === $modal) $modal.classList.remove('active'); });

  // 开始建档
  document.getElementById('btn-start').addEventListener('click', () => {
    const input = document.getElementById('cat-name');
    catName = input.value.trim();
    if (!catName) {
      input.style.borderBottomColor = '#b23a2c';
      input.placeholder = '姓名为必填项！';
      input.focus();
      return;
    }
    catColor = document.getElementById('cat-color').value;
    currentQ = 0;
    answers.fill(null);
    renderQuestion();
    showView('test');
  });

  // ============ 行为观察（答题） ============

  function renderQuestion() {
    const q = QUESTIONS[currentQ];
    const total = QUESTIONS.length;

    document.getElementById('test-no').textContent =
      `NO.${String(currentQ + 1).padStart(2, '0')} / ${total}`;
    document.getElementById('ruler-fill').style.width = ((currentQ + 1) / total * 100) + '%';
    document.getElementById('q-cat').textContent = catName;
    document.getElementById('question-text').textContent = q.text;

    const optionsEl = document.getElementById('options');
    optionsEl.classList.remove('locked');
    optionsEl.innerHTML = '';
    SCALE_LABELS.forEach((label, i) => {
      const btn = document.createElement('button');
      const sel = answers[currentQ] === i + 1;
      btn.className = 'option-btn' + (sel ? ' selected' : '');
      btn.innerHTML = `<span class="box">${sel ? '☑' : '☐'}</span><span>${label}</span>`;
      btn.addEventListener('click', () => selectOption(i + 1, btn));
      optionsEl.appendChild(btn);
    });

    document.getElementById('q-stamp').classList.remove('show');
    document.getElementById('btn-prev').style.visibility = currentQ === 0 ? 'hidden' : 'visible';
  }

  // 选中 → 盖章 → 自动翻下一题
  function selectOption(val, btn) {
    if (advancing) return;
    advancing = true;
    answers[currentQ] = val;

    const optionsEl = document.getElementById('options');
    optionsEl.classList.add('locked');
    optionsEl.querySelectorAll('.option-btn').forEach(b => {
      b.classList.remove('selected');
      b.querySelector('.box').textContent = '☐';
    });
    btn.classList.add('selected');
    btn.querySelector('.box').textContent = '☑';
    document.getElementById('q-stamp').classList.add('show');

    setTimeout(() => {
      advancing = false;
      if (currentQ < QUESTIONS.length - 1) {
        currentQ++;
        renderQuestion();
      } else {
        submitTest();
      }
    }, 480);
  }

  document.getElementById('btn-prev').addEventListener('click', () => {
    if (advancing) return;
    if (currentQ > 0) { currentQ--; renderQuestion(); }
  });

  // ============ 档案核发（结果） ============

  function fileNo(code) {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    let h = 0;
    for (const ch of catName) h = (h * 31 + ch.charCodeAt(0)) % 1000;
    return `MEOW-${ymd}-${code}-${String(h).padStart(3, '0')}`;
  }

  function submitTest() {
    if (answers.some(a => a == null)) return;
    resultScores = calcScores(answers);
    const code = getTypeCode(resultScores);
    resultType = CAT_TYPES[code];
    renderResult();
    showView('result');
  }

  function renderResult() {
    const t = resultType;
    const g = TYPE_GROUPS[t.group];
    const d = new Date();

    // 人格证
    document.getElementById('idc-svg').innerHTML = catSVG(t.code);
    document.getElementById('idc-name').textContent = catName;
    document.getElementById('idc-type').textContent = t.name;
    document.getElementById('idc-code').textContent = t.code;
    document.getElementById('idc-group').textContent = `${g.icon} ${g.name}`;
    document.getElementById('idc-date').textContent =
      `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    document.getElementById('idc-no').textContent = fileNo(t.code);
    document.getElementById('idc-tags').innerHTML =
      t.tags.map(tag => `<span class="idc-tag">${tag}</span>`).join('');

    // 档案正文
    document.getElementById('r-desc').textContent = t.desc;
    document.getElementById('r-quotes').innerHTML =
      t.quotes.map(q => `<li>${q}</li>`).join('');
    document.getElementById('r-str').textContent = t.strengths.join(' · ');
    document.getElementById('r-weak').textContent = t.weaknesses.join(' · ');
    document.getElementById('r-match').innerHTML =
      `与 <b>${t.bestMatch.map(c => CAT_TYPES[c].name).join('、')}</b> 相处最为融洽；` +
      `与 <b>${t.challenging.map(c => CAT_TYPES[c].name).join('、')}</b> 同处一室时，建议分碗分窝、错峰巡逻。`;

    renderDims();
  }

  function renderDims() {
    document.getElementById('dim-bars').innerHTML = DIM_CONFIG.map(d => {
      const p = resultScores[d.key];
      const pos = dimPos(d);
      const strength = Math.round(Math.abs(p - 0.5) * 200);
      // 胜方 = 圆点所在半边
      const leftWin = pos <= 50;
      const winner = leftWin ? d.left : d.right;
      const fillLeft = Math.min(pos, 50);
      const fillW = Math.max(Math.abs(pos - 50), 1.5);
      const valText = strength === 0 ? '两极平衡' : `偏 ${winner[0]} ${winner[1]} · ${strength}%`;
      return `
        <div class="dim-row" style="--dim-color:${d.color}">
          <div class="ends">
            <span class="${leftWin ? 'on' : ''}">${d.left[0]} ${d.left[1]}</span>
            <span class="${leftWin ? '' : 'on'}">${d.right[1]} ${d.right[0]}</span>
          </div>
          <div class="dim-track">
            <span class="dim-center"></span>
            <span class="dim-fill" style="left:${fillLeft}%;width:${fillW}%"></span>
            <span class="dim-dot" style="left:${pos}%"></span>
          </div>
          <div class="dim-val">${valText}</div>
        </div>`;
    }).join('');
  }

  // 机密档案（付费位演示）
  document.getElementById('btn-unlock').addEventListener('click', () => {
    document.getElementById('unlock-tip').textContent =
      '调阅申请已登记 ✅ 付费通道开放后将第一时间通知你。';
  });

  document.getElementById('btn-retest').addEventListener('click', () => {
    currentQ = 0;
    answers.fill(null);
    showView('landing');
  });

  showView('landing');
})();
