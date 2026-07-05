// ============================================================
// 猫咪MBTI · 主逻辑
// ============================================================

(function () {
  // --- State ---
  let catName = '';
  let catColor = '';
  let currentQ = 0;
  let answers = new Array(QUESTIONS.length).fill(null);
  let resultType = null;
  let resultScores = null;

  // --- DOM refs ---
  const $app = document.getElementById('app');
  const views = {
    landing: document.getElementById('view-landing'),
    test: document.getElementById('view-test'),
    result: document.getElementById('view-result'),
    archive: document.getElementById('view-archive'),
    mine: document.getElementById('view-mine'),
  };
  // 每个视图归属的底部 Tab（test/result 归"测一测"）
  const TAB_OF = { landing: 'landing', test: 'landing', result: 'landing', archive: 'archive', mine: 'mine' };
  const $posterModal = document.getElementById('poster-modal');
  const $typeModal = document.getElementById('type-modal');

  // --- V0.5 配置 ---
  const CONTACT_WECHAT = ''; // 预约联系方式（微信号/公众号），填写后付费弹窗会展示

  // --- 工具 ---
  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function showToast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 2200);
  }

  // --- 配对邀请参数（好友分享链接进入） ---
  const matchInvite = (() => {
    const p = new URLSearchParams(location.search);
    const code = (p.get('match') || '').toUpperCase();
    if (!CAT_TYPES[code]) return null;
    const name = esc((p.get('mname') || '').trim().slice(0, 12));
    return { code, name: name || CAT_TYPES[code].name };
  })();

  // --- View switching ---
  function showView(name) {
    Object.values(views).forEach(v => v.classList.remove('active'));
    views[name].classList.add('active');
    // 答题时隐藏 Tab 栏（专注），其余视图高亮所属 Tab
    document.getElementById('tabbar').style.display = name === 'test' ? 'none' : 'flex';
    document.querySelectorAll('.tab-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.view === TAB_OF[name]));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- Tabbar ---
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.view;
      if (v === 'archive') { renderArchive(); track('tab_archive'); }
      if (v === 'mine') track('tab_mine');
      showView(v);
    });
  });

  // --- 猫咪档案（本地存储） ---
  function saveCatRecord() {
    try {
      const recs = JSON.parse(localStorage.getItem('mbti_cats') || '[]');
      recs.unshift({ name: catName, color: catColor, code: resultType.code, scores: resultScores, t: Date.now() });
      localStorage.setItem('mbti_cats', JSON.stringify(recs.slice(0, 50)));
    } catch (e) { /* 存储失败不影响主流程 */ }
  }

  function renderArchive() {
    const recs = JSON.parse(localStorage.getItem('mbti_cats') || '[]');
    const unlocked = new Set(recs.map(r => r.code));
    document.getElementById('archive-progress').textContent =
      recs.length ? `已点亮 ${unlocked.size} / 16 种喵格 · 共 ${recs.length} 次测试` : '';
    const list = document.getElementById('archive-list');
    if (!recs.length) {
      list.innerHTML = '<div class="archive-empty">还没有猫咪档案<br>去给主子测一个吧 🐾</div>';
      return;
    }
    list.innerHTML = '';
    recs.forEach(r => {
      const t = CAT_TYPES[r.code];
      if (!t) return;
      const card = document.createElement('div');
      card.className = 'archive-card';
      card.innerHTML = `
        <div class="ac-svg">${catSVG(r.code)}</div>
        <div class="ac-info">
          <div class="ac-name">${esc(r.name)}</div>
          <div class="ac-type">${t.name} · ${r.code}</div>
          <div class="ac-date">${new Date(r.t).toLocaleDateString('zh-CN')}</div>
        </div>
        <span class="ac-arrow">→</span>`;
      card.addEventListener('click', () => {
        catName = r.name;
        catColor = r.color || '';
        resultScores = r.scores;
        resultType = CAT_TYPES[r.code];
        renderResult();
        showView('result');
        track('archive_open', r.code);
      });
      list.appendChild(card);
    });
  }

  // === LANDING ===
  document.getElementById('btn-start').addEventListener('click', () => {
    const nameInput = document.getElementById('cat-name');
    catName = nameInput.value.trim();
    if (!catName) {
      nameInput.style.borderColor = '#ef4444';
      nameInput.focus();
      return;
    }
    nameInput.style.borderColor = '';
    catColor = document.getElementById('cat-color').value;
    currentQ = 0;
    answers.fill(null);
    track('start_test', catColor);
    renderQuestion();
    showView('test');
  });

  // === TEST ===
  function renderQuestion() {
    const q = QUESTIONS[currentQ];
    const total = QUESTIONS.length;

    const pct = ((currentQ + 1) / total * 100);
    document.getElementById('progress-fill').style.width = pct + '%';
    const progressCat = document.getElementById('progress-cat');
    if (progressCat) progressCat.style.left = pct + '%';
    document.getElementById('progress-text').textContent = `第 ${currentQ + 1} / ${total} 题`;

    document.getElementById('question-text').innerHTML =
      `<span class="cat-name">${catName}</span>……${q.text}`;

    const optionsEl = document.getElementById('options');
    optionsEl.innerHTML = '';
    SCALE_LABELS.forEach((label, i) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn' + (answers[currentQ] === i + 1 ? ' selected' : '');
      btn.innerHTML = `<span class="opt-emoji">${SCALE_EMOJI[i]}</span><span>${label}</span>`;
      btn.addEventListener('click', () => selectOption(i + 1));
      optionsEl.appendChild(btn);
    });

    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
    prevBtn.style.visibility = currentQ === 0 ? 'hidden' : 'visible';

    if (currentQ === total - 1) {
      nextBtn.textContent = '查看结果 🎉';
      nextBtn.onclick = submitTest;
    } else {
      nextBtn.textContent = '下一题 →';
      nextBtn.onclick = nextQuestion;
    }
    nextBtn.disabled = answers[currentQ] == null;
  }

  function selectOption(val) {
    answers[currentQ] = val;
    renderQuestion();
  }

  function nextQuestion() {
    if (answers[currentQ] == null) return;
    if (currentQ < QUESTIONS.length - 1) {
      currentQ++;
      renderQuestion();
    }
  }

  function prevQuestion() {
    if (currentQ > 0) {
      currentQ--;
      renderQuestion();
    }
  }
  document.getElementById('btn-prev').addEventListener('click', prevQuestion);

  function submitTest() {
    if (answers.some(a => a == null)) return;
    resultScores = calcScores(answers);
    const code = getTypeCode(resultScores);
    resultType = CAT_TYPES[code];
    track('complete_test', code);
    saveCatRecord();
    renderResult();
    showView('result');
  }

  // === RESULT ===
  function renderResult() {
    const t = resultType;
    const group = TYPE_GROUPS[t.group];

    // Hero
    document.getElementById('result-cat-svg').innerHTML = catSVG(t.code);
    document.getElementById('result-type-name').textContent = t.name;
    document.getElementById('result-type-code').textContent = t.code;

    const badge = document.getElementById('result-group-badge');
    badge.textContent = `${group.icon} ${group.name} · ${group.desc}`;
    badge.style.color = group.color;

    // Tags
    const tagsEl = document.getElementById('result-tags');
    tagsEl.innerHTML = t.tags.map(tag => `<span class="result-tag">${tag}</span>`).join('');

    // Desc
    document.getElementById('result-desc').textContent = t.desc;

    // Cat name in desc
    document.getElementById('result-cat-name-display').textContent = catName;

    // Quotes
    const quotesEl = document.getElementById('result-quotes');
    quotesEl.innerHTML = t.quotes.map(q => `<li>${q}</li>`).join('');

    // Strengths & Weaknesses
    document.getElementById('result-strengths').textContent = t.strengths.join(' · ');
    document.getElementById('result-weaknesses').textContent = t.weaknesses.join(' · ');

    // Match
    document.getElementById('result-best-match').innerHTML =
      t.bestMatch.map(c => `${CAT_TYPES[c].name}<br><small>${c}</small>`).join(' & ');
    document.getElementById('result-challenging').innerHTML =
      t.challenging.map(c => `${CAT_TYPES[c].name}<br><small>${c}</small>`).join(' & ');

    // Dimension bars
    renderDimBars();

    // Explore grid
    renderExplore();

    // Paywall
    document.getElementById('paywall-cat-name').textContent = catName;
    document.getElementById('paywall-sample-text').textContent =
      `"半夜跑酷不是精力过剩，是${t.name}在执行自己的巡逻计划。这时它需要的不是制止，而是……`;

    // 配对结果（从好友邀请链接进入时展示）
    renderPairResult();

    track('view_result', t.code);
  }

  // --- 配对结果卡 ---
  function renderPairResult() {
    const box = document.getElementById('pair-result');
    if (!matchInvite) { box.style.display = 'none'; return; }
    const inviter = CAT_TYPES[matchInvite.code];
    const pair = getPairing(matchInvite.code, matchInvite.name, resultType.code, esc(catName));
    box.style.display = 'block';
    box.innerHTML = `
      <h3>💞 缘分揭晓</h3>
      <div class="pair-cats">
        <div class="pair-cat">
          <div class="pair-svg">${catSVG(matchInvite.code)}</div>
          <div class="pair-name">${matchInvite.name}</div>
          <div class="pair-type">${inviter.name}</div>
        </div>
        <div class="pair-score"><b>${pair.score}</b><span>缘分值</span></div>
        <div class="pair-cat">
          <div class="pair-svg">${catSVG(resultType.code)}</div>
          <div class="pair-name">${esc(catName)}</div>
          <div class="pair-type">${resultType.name}</div>
        </div>
      </div>
      <div class="pair-title">「${pair.title}」</div>
      <p class="pair-line">${pair.line}</p>
    `;
    track('pair_shown', `${matchInvite.code}-${resultType.code}`);
  }

  // --- MBTI 双极维度条 ---
  // 每个维度：左右两极 + 圆点偏向优势侧。score 是"偏向 hi 侧"的 0-1 值。
  const DIM_CONFIG = [
    { key: 'EI', color: '#6fb5e0', left: ['外向', 'E'], right: ['内向', 'I'], scoreSide: 'left' },
    { key: 'SN', color: '#f4b942', left: ['谨慎', 'S'], right: ['好奇', 'N'], scoreSide: 'right' },
    { key: 'TF', color: '#ef7d6d', left: ['强势', 'T'], right: ['温和', 'F'], scoreSide: 'left' },
    { key: 'JP', color: '#5fbf95', left: ['规律', 'J'], right: ['随性', 'P'], scoreSide: 'left' },
  ];

  // 圆点位置：0 = 最左，100 = 最右；50 是中线
  function dimPos(d) {
    const p = resultScores[d.key];
    return (d.scoreSide === 'left' ? (1 - p) : p) * 100;
  }

  function renderDimBars() {
    const wrap = document.getElementById('dim-bars');
    wrap.innerHTML = DIM_CONFIG.map((d, i) => {
      const p = resultScores[d.key];
      const pos = dimPos(d);
      const strength = Math.round(Math.abs(p - 0.5) * 200); // 距中线的强度 0-100
      const hiWins = p >= 0.5;
      const winner = (d.scoreSide === 'left') === hiWins ? d.left : d.right;
      const leftActive = (d.scoreSide === 'left') === hiWins;
      const fillLeft = Math.min(pos, 50);
      const fillW = Math.max(Math.abs(pos - 50), 1.5);
      const valueText = strength === 0 ? '五五开 · 两边平衡' : `${strength}% ${winner[0]} ${winner[1]}`;
      return `
        <div class="dim-row" style="--dim-color:${d.color}; animation-delay:${i * 0.08}s">
          <div class="dim-ends">
            <span class="${leftActive ? 'active' : ''}">${d.left[0]} ${d.left[1]}</span>
            <span class="${leftActive ? '' : 'active'}">${d.right[1]} ${d.right[0]}</span>
          </div>
          <div class="dim-track">
            <span class="dim-center"></span>
            <span class="dim-fill" style="left:${fillLeft}%;width:${fillW}%"></span>
            <span class="dim-dot" style="left:${pos}%"></span>
          </div>
          <div class="dim-value">${valueText}</div>
        </div>`;
    }).join('');
  }

  // --- Explore grid ---
  function renderExplore() {
    const grid = document.getElementById('explore-grid');
    grid.innerHTML = '';
    for (const [code, t] of Object.entries(CAT_TYPES)) {
      const card = document.createElement('div');
      card.className = 'explore-card';
      if (code === resultType.code) card.classList.add('current');
      card.innerHTML = `
        <div class="ec-svg">${catSVG(code)}</div>
        <div class="ec-name">${t.name}</div>
        <div class="ec-code">${code}</div>
      `;
      card.addEventListener('click', () => showTypeDetail(code));
      grid.appendChild(card);
    }
  }

  // --- Type detail modal ---
  function showTypeDetail(code) {
    const t = CAT_TYPES[code];
    const group = TYPE_GROUPS[t.group];
    const inner = document.getElementById('type-modal-inner');
    inner.innerHTML = `
      <button class="poster-close" onclick="closeTypeModal()">✕</button>
      <div style="text-align:center">
        <div style="width:120px;height:120px;margin:0 auto 12px">${catSVG(code)}</div>
        <h2 style="font-size:22px;color:var(--primary);margin-bottom:4px">${t.name}</h2>
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">${code} · ${group.icon} ${group.name}</p>
        <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-bottom:16px">
          ${t.tags.map(tag => `<span class="result-tag">${tag}</span>`).join('')}
        </div>
      </div>
      <p style="font-size:14px;line-height:1.8;margin-bottom:16px">${t.desc}</p>
      <div style="margin-bottom:12px">
        <h4 style="font-size:13px;font-weight:700;margin-bottom:8px">🐾 标志语录</h4>
        <ul class="quotes-list">${t.quotes.map(q => `<li>${q}</li>`).join('')}</ul>
      </div>
      <div class="trait-row" style="margin-bottom:12px">
        <div class="trait-card good"><h4>✨ 优点</h4><div class="trait-items">${t.strengths.join(' · ')}</div></div>
        <div class="trait-card bad"><h4>⚡ 缺点</h4><div class="trait-items">${t.weaknesses.join(' · ')}</div></div>
      </div>
    `;
    $typeModal.classList.add('active');
  }
  window.closeTypeModal = () => $typeModal.classList.remove('active');
  $typeModal.addEventListener('click', (e) => { if (e.target === $typeModal) closeTypeModal(); });

  // --- Retest ---
  document.getElementById('btn-retest').addEventListener('click', () => {
    currentQ = 0;
    answers.fill(null);
    track('retest');
    showView('landing');
  });

  // === POSTER ===
  document.getElementById('btn-poster').addEventListener('click', generatePoster);

  // 按类型加载头像 PNG（供海报 canvas 使用）
  function loadCatImage(code) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = catImgSrc(code);
    });
  }

  // 圆形裁切 + cover 填充绘制头像，避免白底方角外露与拉伸变形
  function drawCatCircle(ctx, img, cx, cy, r) {
    if (!img) return;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const side = Math.min(iw, ih);
    const sx = (iw - side) / 2, sy = (ih - side) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, sx, sy, side, side, cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
  }

  // --- 海报绘制辅助：贴纸风卡片 / 胶囊 / 标题条 ---
  function stickerRect(ctx, x, y, w, h, r) {
    ctx.fillStyle = 'rgba(70, 52, 42, 0.15)';
    roundRect(ctx, x, y + 6, w, h, r); ctx.fill();
    ctx.fillStyle = '#fff';
    roundRect(ctx, x, y, w, h, r); ctx.fill();
    ctx.strokeStyle = '#46342a'; ctx.lineWidth = 3;
    roundRect(ctx, x, y, w, h, r); ctx.stroke();
  }

  function pillRect(ctx, x, y, w, h, fill, stroke, lw) {
    roundRect(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke();
  }

  function headerBand(ctx, x, y, w, h, r, color, label) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = '#46342a'; ctx.lineWidth = 3; ctx.stroke();
    ctx.font = '26px "ZCOOL KuaiLe", "PingFang SC", sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h / 2 + 9);
  }

  function drawTraitCard(ctx, x, y, w, h, label, color, items) {
    stickerRect(ctx, x, y, w, h, 20);
    headerBand(ctx, x, y, w, 52, 20, color, label);
    ctx.font = '22px "PingFang SC", sans-serif';
    ctx.fillStyle = '#46342a';
    ctx.textAlign = 'left';
    items.slice(0, 2).forEach((it, i) => {
      ctx.fillText('🐾 ' + it, x + 28, y + 100 + i * 46, w - 56);
    });
  }

  function drawTagRow(ctx, tags, y) {
    ctx.font = '22px "PingFang SC", sans-serif';
    const pad = 32, gap = 16, h = 44;
    const ws = tags.map(tag => ctx.measureText(tag).width + pad);
    const total = ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1);
    let x = (750 - total) / 2;
    tags.forEach((tag, i) => {
      pillRect(ctx, x, y, ws[i], h, '#fff', '#46342a', 2.5);
      ctx.fillStyle = '#d95f1d';
      ctx.textAlign = 'left';
      ctx.fillText(tag, x + pad / 2, y + 29);
      x += ws[i] + gap;
    });
  }

  async function generatePoster() {
    track('poster_generate', resultType.code);
    const canvas = document.getElementById('poster-canvas');
    const ctx = canvas.getContext('2d');
    const W = 750, H = 1334;
    const dpr = 2;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = '100%';
    ctx.scale(dpr, dpr);

    const t = resultType;
    const group = TYPE_GROUPS[t.group];
    const INK = '#46342a', ORANGE = '#f2762e', BROWN = '#9c8168';

    try { await document.fonts.ready; } catch (e) { /* 字体未就绪也继续 */ }

    // 预加载全部头像：主角 + 拍档×2 + 冤家×2
    const [mainImg, ...matchImgs] = await Promise.all([
      loadCatImage(t.code),
      ...t.bestMatch.slice(0, 2).map(c => loadCatImage(c)),
      ...t.challenging.slice(0, 2).map(c => loadCatImage(c)),
    ]);

    // --- 背景 ---
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#ffedd0');
    grad.addColorStop(0.55, '#ffe2c6');
    grad.addColorStop(1, '#ffd8b6');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(70, 240, 190, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(690, 1080, 230, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // --- 品牌头 ---
    ctx.textAlign = 'center';
    ctx.font = '38px "ZCOOL KuaiLe", "PingFang SC", sans-serif';
    ctx.fillStyle = ORANGE;
    ctx.fillText('🐱 喵格测试', W / 2, 72);
    ctx.font = '20px "PingFang SC", sans-serif';
    ctx.fillStyle = BROWN;
    ctx.fillText('MEOW-BTI · 发现你家猫主子的隐藏性格', W / 2, 106);

    // --- Hero：圆框头像 + 名字/类型/派系 ---
    const ax = 185, ay = 280, ar = 105;
    ctx.beginPath(); ctx.arc(ax, ay, ar + 12, 0, Math.PI * 2);
    ctx.strokeStyle = ORANGE; ctx.lineWidth = 10; ctx.stroke();
    ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke();
    drawCatCircle(ctx, mainImg, ax, ay, ar);

    ctx.textAlign = 'left';
    const nameLine = `${catName} 是……`;
    ctx.font = 'bold 34px "PingFang SC", sans-serif';
    if (ctx.measureText(nameLine).width > 370) ctx.font = 'bold 27px "PingFang SC", sans-serif';
    ctx.fillStyle = INK;
    ctx.fillText(nameLine, 330, 218);
    ctx.font = '58px "ZCOOL KuaiLe", "PingFang SC", sans-serif';
    ctx.fillStyle = ORANGE;
    ctx.fillText(t.name, 330, 295);
    ctx.font = 'bold 26px "PingFang SC", sans-serif';
    ctx.fillStyle = '#c98a4b';
    ctx.fillText(t.code, 330, 340);
    const gLabel = `${group.icon} ${group.name} · ${group.desc}`;
    ctx.font = '20px "PingFang SC", sans-serif';
    const gw = Math.min(ctx.measureText(gLabel).width + 36, 370);
    pillRect(ctx, 330, 362, gw, 42, '#fff', group.color, 2.5);
    ctx.fillStyle = group.color;
    ctx.fillText(gLabel, 348, 389, gw - 36);

    // --- 标签胶囊 ---
    drawTagRow(ctx, t.tags, 452);

    // --- 语录气泡 ×2 ---
    t.quotes.slice(0, 2).forEach((q, i) => {
      const qy = 530 + i * 74;
      stickerRect(ctx, 60, qy, W - 120, 58, 29);
      ctx.font = '22px "PingFang SC", sans-serif';
      ctx.fillStyle = INK;
      ctx.textAlign = 'left';
      ctx.fillText('💬 ' + q, 90, qy + 37, W - 180);
    });

    // --- 优势 / 弱点卡 ---
    drawTraitCard(ctx, 60, 690, 305, 190, '✨ 优势', '#5fbf95', t.strengths);
    drawTraitCard(ctx, 385, 690, 305, 190, '⚡ 弱点', '#e8a23c', t.weaknesses);

    // --- 缘分匹配卡 ---
    stickerRect(ctx, 60, 910, W - 120, 230, 20);
    headerBand(ctx, 60, 910, W - 120, 52, 20, '#ff8fa3', '💞 缘分匹配');
    ctx.font = 'bold 22px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#2e8f5e';
    ctx.fillText('最佳拍档', 217, 1002);
    ctx.fillStyle = '#d95757';
    ctx.fillText('尽量避免', 533, 1002);
    // 分隔虚线
    ctx.strokeStyle = '#ecd9bd'; ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(375, 985); ctx.lineTo(375, 1120); ctx.stroke();
    ctx.setLineDash([]);
    const combos = [
      { codes: t.bestMatch.slice(0, 2), imgs: [matchImgs[0], matchImgs[1]], cx: 217 },
      { codes: t.challenging.slice(0, 2), imgs: [matchImgs[2], matchImgs[3]], cx: 533 },
    ];
    combos.forEach(cb => {
      cb.codes.forEach((c, i) => {
        const mx = cb.cx + (i === 0 ? -66 : 66), my = 1058;
        ctx.beginPath(); ctx.arc(mx, my, 40, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.stroke();
        drawCatCircle(ctx, cb.imgs[i], mx, my, 40);
        ctx.font = '18px "PingFang SC", sans-serif';
        ctx.fillStyle = INK;
        ctx.textAlign = 'center';
        ctx.fillText(CAT_TYPES[c].name, mx, my + 68);
      });
    });

    // --- 维度条 ---
    DIM_CONFIG.forEach((d, i) => {
      const y = 1180 + i * 36;
      ctx.font = '18px "PingFang SC", sans-serif';
      ctx.fillStyle = BROWN;
      ctx.textAlign = 'left';
      ctx.fillText(`${d.left[0]} ${d.left[1]}`, 70, y + 6);
      ctx.textAlign = 'right';
      ctx.fillText(`${d.right[1]} ${d.right[0]}`, W - 70, y + 6);
      const bx = 195, bw = W - 390, bh = 10;
      ctx.fillStyle = '#f3e2c4';
      roundRect(ctx, bx, y - 5, bw, bh, 5); ctx.fill();
      ctx.fillStyle = '#dcc9ae';
      ctx.fillRect(bx + bw / 2 - 1, y - 10, 2, 20);
      const pos = dimPos(d) / 100;
      const px = bx + bw * pos, cxm = bx + bw / 2;
      ctx.fillStyle = d.color;
      roundRect(ctx, Math.min(px, cxm), y - 5, Math.max(Math.abs(px - cxm), 4), bh, 5); ctx.fill();
      ctx.beginPath(); ctx.arc(px, y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
    });

    // --- 尾部 ---
    ctx.textAlign = 'center';
    ctx.font = '18px "PingFang SC", sans-serif';
    ctx.fillStyle = '#c98a4b';
    ctx.fillText('长按保存图片 · 和朋友的猫一起测', W / 2, 1322);

    $posterModal.classList.add('active');
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function wrapText(ctx, text, x, y, maxW, lineH) {
    let line = '';
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const testLine = line + ch;
      if (ctx.measureText(testLine).width > maxW && line.length > 0) {
        ctx.fillText(line, x, y);
        line = ch;
        y += lineH;
      } else {
        line = testLine;
      }
    }
    if (line) ctx.fillText(line, x, y);
  }

  // Poster save
  document.getElementById('btn-save-poster').addEventListener('click', () => {
    track('poster_save', resultType.code);
    const canvas = document.getElementById('poster-canvas');
    canvas.toBlob(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${catName}的喵格测试结果.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    }, 'image/png');
  });

  document.getElementById('poster-close').addEventListener('click', () => {
    $posterModal.classList.remove('active');
  });
  $posterModal.addEventListener('click', (e) => {
    if (e.target === $posterModal) $posterModal.classList.remove('active');
  });

  // --- Landing: 16 类型图鉴 ---
  function renderLandingGallery() {
    const gallery = document.getElementById('landing-gallery');
    for (const g of Object.values(TYPE_GROUPS)) {
      const sec = document.createElement('div');
      sec.className = 'lt-group';
      sec.innerHTML = `
        <div class="lt-group-head" style="--g-color:${g.color}">
          <span class="lt-group-name">${g.icon} ${g.name}</span>
          <span class="lt-group-desc">${g.desc}</span>
        </div>`;
      const grid = document.createElement('div');
      grid.className = 'explore-grid';
      g.types.forEach(code => {
        const t = CAT_TYPES[code];
        const card = document.createElement('div');
        card.className = 'explore-card';
        card.innerHTML = `
          <div class="ec-svg">${catSVG(code)}</div>
          <div class="ec-name">${t.name}</div>
          <div class="ec-code">${code}</div>
        `;
        card.addEventListener('click', () => showTypeDetail(code));
        grid.appendChild(card);
      });
      sec.appendChild(grid);
      gallery.appendChild(sec);
    }
  }

  // --- Paywall（V0.5 假支付：记录意愿） ---
  const $paywallModal = document.getElementById('paywall-modal');
  document.getElementById('btn-paywall').addEventListener('click', () => {
    track('paywall_click', resultType.code);
    document.getElementById('paywall-step1').style.display = 'block';
    document.getElementById('paywall-step2').style.display = 'none';
    $paywallModal.classList.add('active');
  });
  document.getElementById('btn-unlock').addEventListener('click', () => {
    track('paywall_unlock_click', resultType.code);
    document.getElementById('paywall-step1').style.display = 'none';
    document.getElementById('paywall-step2').style.display = 'block';
    document.getElementById('paywall-contact').innerHTML = CONTACT_WECHAT
      ? `现在添加微信 <b>${CONTACT_WECHAT}</b> 备注「喵」，<br>上线当天立享 <b>5 折</b>！`
      : '你的解锁请求已记录 ✅<br>支付功能正在加急上线，过几天再来看看吧！';
  });
  document.getElementById('paywall-close').addEventListener('click', () => $paywallModal.classList.remove('active'));
  $paywallModal.addEventListener('click', (e) => { if (e.target === $paywallModal) $paywallModal.classList.remove('active'); });

  // --- 配对邀请链接 ---
  document.getElementById('btn-invite').addEventListener('click', () => {
    const url = `${location.origin}${location.pathname}?match=${resultType.code}&mname=${encodeURIComponent(catName)}`;
    const done = () => { showToast('邀请链接已复制，发给养猫的朋友吧 🐾'); track('invite_copy', resultType.code); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, () => fallbackCopy(url, done));
    } else {
      fallbackCopy(url, done);
    }
  });
  function fallbackCopy(text, cb) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); cb(); } catch (e) { prompt('复制下面的链接发给朋友：', text); }
    ta.remove();
  }

  // --- Privacy modal ---
  const $privacyModal = document.getElementById('privacy-modal');
  document.getElementById('privacy-link').addEventListener('click', () => $privacyModal.classList.add('active'));
  document.getElementById('privacy-link-2').addEventListener('click', () => $privacyModal.classList.add('active'));
  document.getElementById('privacy-close').addEventListener('click', () => $privacyModal.classList.remove('active'));
  $privacyModal.addEventListener('click', (e) => { if (e.target === $privacyModal) $privacyModal.classList.remove('active'); });

  // Init
  if (matchInvite) {
    const banner = document.getElementById('match-banner');
    banner.style.display = 'block';
    banner.innerHTML = `💌 <b>${matchInvite.name}</b>（${CAT_TYPES[matchInvite.code].name}）向你家猫发来配对邀请！<br>完成测试，揭晓两只猫的缘分`;
    track('match_visit', matchInvite.code);
  }
  track('visit');
  renderLandingGallery();
  showView('landing');
})();
