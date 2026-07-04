// ============================================================
// 喵格研究所 v2 · 主逻辑（复用 ../cats.js + ../pairing.js）
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

  const STORE_KEY = 'meow_bureau_files';
  const FRIENDS_KEY = 'meow_bureau_friends';

  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function showToast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 2400);
  }

  // --- 类型占比表 ---
  // ⚠️ 内测估算值（按"家猫偏内向/温和"的先验编排，总和 100）。
  // 小程序接入云数据库后，替换为真实测试结果统计。
  const RARITY = {
    ISFP: 12, ISFJ: 11, ISTJ: 9, INFP: 9, ISTP: 8, INFJ: 7, ESFP: 7, INTP: 6,
    ESFJ: 6, ESTP: 5, ENFP: 5, INTJ: 4, ESTJ: 4, ENFJ: 3, ENTP: 2, ENTJ: 2,
  };

  // --- 《行为翻译词典》样章（每型 2 条，第 2 条半加密展示） ---
  const DEEP_PREVIEW = {
    ESTJ: [
      ['清晨准点踩脸叫早', '不是饿疯了，是在执行考勤制度——你迟到了，罚你铲屎两次。'],
      ['占领你刚起身的椅子', '权力交接仪式。这个家的每一寸领土，都需要它的批示。'],
    ],
    ISTJ: [
      ['蹲在门口目送你出门', '例行安检：确认你带齐了钥匙、手机，和对它的思念。'],
      ['半夜挨个房间巡逻', '值夜班。水电门窗全部查完，才允许自己下班睡觉。'],
    ],
    ESFJ: [
      ['吃两口就优雅离席', '不是不饿，是这顿的摆盘配不上它的身份。'],
      ['主动走向客人又拒绝抚摸', '这叫检阅仪仗队。谁允许你伸手了？'],
    ],
    ISFJ: [
      ['从高处长时间注视你', '在做田野笔记：人类行为观察样本，第 1024 条。'],
      ['对新家具反复嗅闻绕圈', '入库登记中。气味归档完成前，不算验收通过。'],
    ],
    ESTP: [
      ['拆完快递还要钻进箱子', '现场勘查。每一个纸箱都必须由它亲自结案。'],
      ['追着吸尘器跑而不是逃', '抵近侦察。危险源要建档跟踪，不能放任自流。'],
    ],
    ISTP: [
      ['消失一下午遍寻不获', '在你不知道的第五空间闭关。别找了，时辰到自会现身。'],
      ['凌晨对着空气凝视', '它看到了什么，档案里不让写。'],
    ],
    ESFP: [
      ['你越不让上桌它越要上', '禁令在它的字典里，翻译过来叫"邀请函"。'],
      ['打翻水杯后直视你的眼睛', '行为艺术表演完毕，正在等待掌声。'],
    ],
    ISFP: [
      ['你走到哪跟到哪，包括厕所', '贴身护卫值勤中。人类独处，太危险了。'],
      ['摔倒后立刻舔毛装没事', '档案记录：刚才是主动翻滚训练，不是失误。'],
    ],
    INTJ: [
      ['盯着水龙头滴水半小时', '流体力学定点观测，实验数据即将发表。'],
      ['用爪子把东西缓缓推下桌', '重力对照实验第 47 次。结论：依然成立。'],
    ],
    INTP: [
      ['客人来就消失，人走就出现', '陌生人类未通过它的安全审查，回避是标准流程。'],
      ['深夜轻轻靠上你的脚边', '信任等级 MAX 的最高表达。请勿声张，会害羞。'],
    ],
    ENTJ: [
      ['凌晨五点准时嚎叫', '不是饿，是晨会点名。全体起立。'],
      ['挡在你和电脑屏幕之间', '议程变更通知：现在开始是朕的专属时间。'],
    ],
    ENTP: [
      ['打翻杯子后用无辜眼神看你', '档案原话："是我干的，但你没有证据。"'],
      ['连续三天研究柜门锁', '越狱预备行为，证据确凿，但无法起诉。'],
    ],
    INFJ: [
      ['对着毛毯疯狂踩奶', '在给你烤一炉看不见的面包，火候正要紧，勿扰。'],
      ['你情绪低落时默默贴过来', '治愈型人格自动上岗。不说话，但它都懂。'],
    ],
    INFP: [
      ['对着墙壁发呆一小时', '神游宇宙中，请勿打扰。它的世界你进不去。'],
      ['闻到猫薄荷后满场疯跑', '档案注解：短暂离开地球表面，属正常现象。'],
    ],
    ENFJ: [
      ['精准挡住你正在看的屏幕', '这叫加戏。主角光环怎么能让给一块发光的板子。'],
      ['翻出肚皮却不许你摸', '演出效果而已。观众请保持距离，鼓掌即可。'],
    ],
    ENFP: [
      ['追自己的尾巴直到晕倒', '每日喜剧专场。跌倒不是事故，是节目效果。'],
      ['从柜顶离奇坠落', '特技演员不需要保护措施，只需要观众。'],
    ],
  };

  // --- Views & Tabbar ---
  const views = {
    landing: document.getElementById('view-landing'),
    test: document.getElementById('view-test'),
    result: document.getElementById('view-result'),
    archive: document.getElementById('view-archive'),
    mine: document.getElementById('view-mine'),
  };
  const TAB_OF = { landing: 'landing', test: 'landing', result: 'landing', archive: 'archive', mine: 'mine' };

  function showView(name) {
    Object.values(views).forEach(v => v.classList.remove('active'));
    views[name].classList.add('active');
    document.getElementById('tabbar').style.display = name === 'test' ? 'none' : 'flex';
    document.querySelectorAll('.tab-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.view === TAB_OF[name]));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.view === 'archive') renderCabinet();
      showView(btn.dataset.view);
    });
  });

  // MBTI 评定量表配置（钢笔墨色系）
  const DIM_CONFIG = [
    { key: 'EI', color: '#33507a', left: ['外向', 'E'], right: ['内向', 'I'], scoreSide: 'left' },
    { key: 'SN', color: '#b3862c', left: ['谨慎', 'S'], right: ['好奇', 'N'], scoreSide: 'right' },
    { key: 'TF', color: '#b23a2c', left: ['强势', 'T'], right: ['温和', 'F'], scoreSide: 'left' },
    { key: 'JP', color: '#3d7a55', left: ['规律', 'J'], right: ['随性', 'P'], scoreSide: 'left' },
  ];
  function dimPos(scores, d) {
    const p = scores[d.key];
    return (d.scoreSide === 'left' ? (1 - p) : p) * 100;
  }

  // --- 本地存储 ---
  const loadFiles = () => JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
  const saveFiles = recs => localStorage.setItem(STORE_KEY, JSON.stringify(recs.slice(0, 50)));
  const loadFriends = () => JSON.parse(localStorage.getItem(FRIENDS_KEY) || '[]');
  const saveFriends = recs => localStorage.setItem(FRIENDS_KEY, JSON.stringify(recs.slice(0, 50)));

  // ============ 建档大厅 ============

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

  const $modal = document.getElementById('type-modal');
  function showTypeFile(code) {
    const t = CAT_TYPES[code];
    const g = TYPE_GROUPS[t.group];
    document.getElementById('modal-inner').innerHTML = `
      <button class="modal-close" onclick="document.getElementById('type-modal').classList.remove('active')">✕</button>
      <div style="text-align:center;margin-bottom:14px">
        <div style="width:110px;height:110px;margin:0 auto 8px;background:#fff;border:2px solid var(--ink)">${catSVG(code)}</div>
        <div style="font-family:var(--font-head);font-size:22px;letter-spacing:3px">${t.name}</div>
        <div style="font-family:var(--mono);font-size:12px;color:var(--red);letter-spacing:3px;font-weight:700">MBTI · ${code} · 约${RARITY[code]}%的猫</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--ink-soft);letter-spacing:2px">${g.name}</div>
      </div>
      <p style="font-size:14px;line-height:1.9;margin-bottom:14px">${t.desc}</p>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${t.tags.map(tag => `<span class="idc-tag">${tag}</span>`).join('')}
      </div>`;
    $modal.classList.add('active');
  }
  $modal.addEventListener('click', e => { if (e.target === $modal) $modal.classList.remove('active'); });

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

  function fileNo(code, name) {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    let h = 0;
    for (const ch of (name || catName)) h = (h * 31 + ch.charCodeAt(0)) % 1000;
    return `MEOW-${ymd}-${code}-${String(h).padStart(3, '0')}`;
  }

  function saveFile() {
    try {
      const recs = loadFiles();
      recs.unshift({ name: catName, color: catColor, code: resultType.code, scores: resultScores, paid: false, t: Date.now() });
      saveFiles(recs);
    } catch (e) { /* 存储失败不影响主流程 */ }
  }

  function submitTest() {
    if (answers.some(a => a == null)) return;
    resultScores = calcScores(answers);
    const code = getTypeCode(resultScores);
    resultType = CAT_TYPES[code];
    saveFile();
    renderResult();
    showView('result');
  }

  function rarityText(code) {
    const r = RARITY[code] || 6;
    return `约 ${r}% 的猫${r <= 4 ? ' · 稀有' : ''}`;
  }

  function renderResult() {
    const t = resultType;
    const g = TYPE_GROUPS[t.group];
    const d = new Date();

    // 猫格证
    document.getElementById('idc-svg').innerHTML = catSVG(t.code);
    document.getElementById('idc-name').textContent = catName;
    document.getElementById('idc-type').textContent = t.name;
    document.getElementById('idc-code').textContent = t.code;
    const rareEl = document.getElementById('idc-rarity');
    rareEl.textContent = rarityText(t.code);
    rareEl.className = RARITY[t.code] <= 4 ? 'idc-rare' : '';
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
    renderDeepPreview();
    document.getElementById('unlock-tip').textContent = '';
  }

  function dimBarsHTML(scores) {
    return DIM_CONFIG.map(d => {
      const p = scores[d.key];
      const pos = dimPos(scores, d);
      const strength = Math.round(Math.abs(p - 0.5) * 200);
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

  function renderDims() {
    document.getElementById('dim-bars').innerHTML = dimBarsHTML(resultScores);
  }

  // 样章试阅 + 人格写真照样例
  function renderDeepPreview() {
    const t = resultType;
    const entries = DEEP_PREVIEW[t.code] || [];

    document.getElementById('dict-entries').innerHTML = entries.map(([b, note], i) => `
      <div class="dict-entry${i === 1 ? ' faded' : ''}">
        <div class="de-b">▸ 观察到的行为：${b}</div>
        <div class="de-t">档案注解：${note}</div>
      </div>`).join('');

    document.getElementById('mugshots').innerHTML = `
      <div class="shot"><div class="shot-svg">${catSVG(t.code)}</div><span>正面</span></div>
      <div class="shot"><div class="shot-svg flip">${catSVG(t.code)}</div><span>侧面</span></div>
      <div class="shot"><div class="shot-svg sil">${catSVG(t.code)}</div><span>背面</span></div>`;

    const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
    const danger = Math.min(5, Math.max(1, Math.round(resultScores.TF * 5)));
    const clingy = Math.min(5, Math.max(1, Math.round(((resultScores.EI + (1 - resultScores.TF)) / 2) * 5)));
    document.getElementById('feature-table').innerHTML = `
      <div class="ft-row"><span class="k">在案编号</span><span class="mono">${fileNo(t.code)}</span></div>
      <div class="ft-row"><span class="k">性格特征</span><span>${t.tags.join(' · ')}</span></div>
      <div class="ft-row"><span class="k">危险等级</span><span class="ft-star">${stars(danger)}</span></div>
      <div class="ft-row"><span class="k">粘人指数</span><span class="ft-star">${stars(clingy)}</span></div>
      <div class="ft-row"><span class="k">口供摘录</span><span>${t.quotes[0]}</span></div>`;
  }

  // 申请调阅：登记意愿 + 标记付费档案（演示）
  document.getElementById('btn-unlock').addEventListener('click', () => {
    document.getElementById('unlock-tip').textContent =
      '调阅申请已登记 ✅ 付费通道开放后将第一时间通知你。';
    const recs = loadFiles();
    const hit = recs.find(r => r.name === catName && r.code === resultType.code);
    if (hit) { hit.paid = true; saveFiles(recs); }
  });

  document.getElementById('btn-retest').addEventListener('click', () => {
    currentQ = 0;
    answers.fill(null);
    showView('landing');
  });

  // ============ 分享档案照 ============

  const $shareModal = document.getElementById('share-modal');
  document.getElementById('btn-share').addEventListener('click', async () => {
    document.getElementById('share-cat-name').textContent = catName;
    await drawShareCard();
    $shareModal.classList.add('active');
  });
  document.getElementById('share-close').addEventListener('click', () => $shareModal.classList.remove('active'));
  $shareModal.addEventListener('click', e => { if (e.target === $shareModal) $shareModal.classList.remove('active'); });

  document.getElementById('btn-save-share').addEventListener('click', () => {
    const canvas = document.getElementById('share-canvas');
    canvas.toBlob(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${catName}的猫格证.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    }, 'image/png');
  });

  // 升级档案照 → 进入付费（滚动到机密档案区并高亮）
  document.getElementById('btn-upgrade-share').addEventListener('click', () => {
    $shareModal.classList.remove('active');
    const locked = document.getElementById('d-locked');
    locked.scrollIntoView({ behavior: 'smooth', block: 'center' });
    locked.classList.remove('flash');
    setTimeout(() => locked.classList.add('flash'), 50);
  });

  function svgToImage(svgStr) {
    return new Promise(resolve => {
      const blob = new Blob([svgStr], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  }

  function rr(ctx, x, y, w, h, r) {
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

  function drawQR(ctx, text, x, y, size) {
    try {
      if (typeof qrcode === 'undefined') throw new Error('no lib');
      const qr = qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      const n = qr.getModuleCount();
      const cell = size / n;
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - 8, y - 8, size + 16, size + 16);
      ctx.fillStyle = '#2f261c';
      for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++)
          if (qr.isDark(r, c)) ctx.fillRect(x + c * cell, y + r * cell, cell + 0.4, cell + 0.4);
      return true;
    } catch (e) { return false; }
  }

  async function drawShareCard() {
    const t = resultType, g = TYPE_GROUPS[t.group];
    const canvas = document.getElementById('share-canvas');
    const ctx = canvas.getContext('2d');
    const W = 750, H = 1060, dpr = 2;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = '100%';
    ctx.scale(dpr, dpr);

    const INK = '#2f261c', RED = '#b23a2c', SOFT = '#6f5c44', PAPER = '#f4ead2', CARD = '#fbf4e2';
    try { await document.fonts.ready; } catch (e) { /* 继续 */ }
    const mainImg = await svgToImage(catSVG(t.code));

    // 牛皮纸底 + 边框
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = INK; ctx.lineWidth = 4;
    ctx.strokeRect(14, 14, W - 28, H - 28);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(24, 24, W - 48, H - 48);

    // 机构头
    ctx.textAlign = 'center';
    ctx.font = '34px "ZCOOL QingKe HuangYou", sans-serif';
    ctx.fillStyle = INK;
    ctx.fillText('喵 格 研 究 所', W / 2, 78);
    ctx.font = '12px "Courier New", monospace';
    ctx.fillStyle = SOFT;
    ctx.fillText('C A T · M B T I · B U R E A U', W / 2, 104);

    // 标题黑带
    ctx.fillStyle = INK;
    ctx.fillRect(40, 126, W - 80, 56);
    ctx.font = '30px "ZCOOL QingKe HuangYou", sans-serif';
    ctx.fillStyle = PAPER;
    ctx.fillText('猫 咪 M B T I 猫 格 证', W / 2, 165);

    // 档案照
    const px = 60, py = 214, ps = 216;
    ctx.fillStyle = '#fff';
    ctx.fillRect(px, py, ps, ps);
    ctx.strokeStyle = INK; ctx.lineWidth = 3;
    ctx.strokeRect(px, py, ps, ps);
    if (mainImg) ctx.drawImage(mainImg, px + 8, py + 8, ps - 16, ps - 16);
    ctx.font = '12px "Courier New", monospace';
    ctx.fillStyle = SOFT;
    ctx.textAlign = 'center';
    ctx.fillText('档 案 照', px + ps / 2, py + ps + 24);

    // 字段区
    const fx = 312, fw = W - fx - 60;
    ctx.textAlign = 'left';
    const field = (label, y) => {
      ctx.font = '13px "Courier New", monospace';
      ctx.fillStyle = SOFT;
      ctx.fillText(label, fx, y);
      ctx.strokeStyle = 'rgba(111,92,68,0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(fx, y + 12); ctx.lineTo(fx + fw, y + 12); ctx.stroke();
      ctx.setLineDash([]);
    };
    field('姓 名', 240);
    ctx.font = 'bold 26px "PingFang SC", sans-serif';
    ctx.fillStyle = INK;
    ctx.fillText(catName, fx + 76, 242);

    field('喵 格', 296);
    ctx.font = '30px "ZCOOL QingKe HuangYou", sans-serif';
    ctx.fillStyle = RED;
    ctx.fillText(t.name, fx + 76, 300);

    field('MBTI', 352);
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.fillStyle = RED;
    ctx.fillText(t.code, fx + 76, 355);

    field('占 比', 408);
    ctx.font = 'bold 18px "PingFang SC", sans-serif';
    ctx.fillStyle = RARITY[t.code] <= 4 ? RED : INK;
    ctx.fillText(rarityText(t.code), fx + 76, 409);

    // 红章
    ctx.save();
    ctx.translate(620, 430);
    ctx.rotate(-0.24);
    ctx.strokeStyle = 'rgba(178,58,44,0.85)';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, 44, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, 37, 0, Math.PI * 2); ctx.stroke();
    ctx.font = '22px "Ma Shan Zheng", cursive';
    ctx.fillStyle = 'rgba(178,58,44,0.9)';
    ctx.textAlign = 'center';
    ctx.fillText('喵格', 0, -3);
    ctx.fillText('认证', 0, 22);
    ctx.restore();

    // 分隔 + 评定量表
    ctx.textAlign = 'left';
    ctx.font = '17px "ZCOOL QingKe HuangYou", sans-serif';
    ctx.fillStyle = INK;
    ctx.fillText('▍MBTI 评定量表', 60, 512);
    DIM_CONFIG.forEach((d, i) => {
      const y = 552 + i * 44;
      ctx.font = '13px "Courier New", monospace';
      ctx.fillStyle = SOFT;
      ctx.textAlign = 'left';
      ctx.fillText(`${d.left[0]}${d.left[1]}`, 60, y + 5);
      ctx.textAlign = 'right';
      ctx.fillText(`${d.right[1]}${d.right[0]}`, W - 60, y + 5);
      const bx = 150, bw = W - 300, bh = 9;
      ctx.fillStyle = '#e6d8b6';
      rr(ctx, bx, y - 5, bw, bh, 4.5); ctx.fill();
      ctx.strokeStyle = SOFT; ctx.lineWidth = 1;
      rr(ctx, bx, y - 5, bw, bh, 4.5); ctx.stroke();
      ctx.fillStyle = SOFT;
      ctx.fillRect(bx + bw / 2 - 1, y - 9, 2, 17);
      const pos = dimPos(resultScores, d) / 100;
      const dx = bx + bw * pos, cxm = bx + bw / 2;
      ctx.fillStyle = d.color;
      rr(ctx, Math.min(dx, cxm), y - 5, Math.max(Math.abs(dx - cxm), 3), bh, 4.5); ctx.fill();
      ctx.beginPath(); ctx.arc(dx, y - 0.5, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = CARD; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(dx, y - 0.5, 9.2, 0, Math.PI * 2); ctx.stroke();
    });

    // 行为记录摘录
    ctx.textAlign = 'left';
    ctx.font = '17px "ZCOOL QingKe HuangYou", sans-serif';
    ctx.fillStyle = INK;
    ctx.fillText('▍行为记录摘录', 60, 764);
    ctx.font = '20px "Ma Shan Zheng", cursive';
    ctx.fillStyle = '#33507a';
    t.quotes.slice(0, 2).forEach((q, i) => {
      ctx.fillText('✎ ' + q, 60, 802 + i * 36, W - 120);
    });

    // 底部：二维码 + 条码 + 编号
    const qy = 880;
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(40, qy - 18); ctx.lineTo(W - 40, qy - 18); ctx.stroke();

    const qrOK = drawQR(ctx, 'https://xinyuxinsheng.github.io/cat-mbti/v2/', 60, qy, 118);
    if (!qrOK) {
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.strokeRect(60, qy, 118, 118);
      ctx.font = '14px "PingFang SC", sans-serif';
      ctx.fillStyle = SOFT;
      ctx.textAlign = 'center';
      ctx.fillText('扫码入口', 119, qy + 55);
      ctx.fillText('即将开放', 119, qy + 75);
    }
    ctx.textAlign = 'left';
    ctx.font = '15px "PingFang SC", sans-serif';
    ctx.fillStyle = INK;
    ctx.fillText('扫码给你家猫', 200, qy + 46);
    ctx.fillText('也建一份 MBTI 档案', 200, qy + 72);

    // 条形码
    ctx.fillStyle = INK;
    let bx2 = 470;
    const pattern = [3, 1, 2, 1, 1, 3, 2, 1, 3, 1, 1, 2, 3, 1, 2, 2, 1, 3, 1, 2, 1, 1, 3, 2];
    pattern.forEach((wd, i) => {
      if (i % 2 === 0) ctx.fillRect(bx2, qy + 8, wd * 2.5, 52);
      bx2 += wd * 2.5 + 2;
    });
    ctx.font = '12px "Courier New", monospace';
    ctx.fillStyle = SOFT;
    ctx.fillText(fileNo(t.code), 470, qy + 84);
    ctx.font = '11px "Courier New", monospace';
    ctx.fillText('MEOW PERSONALITY BUREAU', 470, qy + 106);
  }

  // ============ 档案柜 ============

  function renderCabinet() {
    // —— 壹 · 喵喵档案 ——
    const recs = loadFiles();
    const unlocked = new Set(recs.map(r => r.code));
    document.getElementById('cabinet-progress').textContent =
      recs.length ? `已收录 ${unlocked.size} / 16 型 MBTI · 共 ${recs.length} 份档案` : '';
    const list = document.getElementById('cabinet-list');
    if (!recs.length) {
      list.innerHTML = '<div class="cabinet-empty">档案柜空空如也<br>先去给主子建一份档案 🐾</div>';
    } else {
      list.innerHTML = '';
      recs.forEach(r => {
        const t = CAT_TYPES[r.code];
        if (!t) return;
        const row = document.createElement('div');
        row.className = 'file-row';
        row.innerHTML = `
          <div class="fr-svg">${catSVG(r.code)}</div>
          <div class="fr-info">
            <b>${esc(r.name)}${r.paid ? ' <span class="paid-badge">付费档案</span>' : ''}</b>
            <span class="fr-type">${t.name} · <i class="mono">${r.code}</i></span>
            <span class="fr-date mono">${new Date(r.t).toLocaleDateString('zh-CN')}</span>
          </div>
          <span class="fr-open">调阅 →</span>`;
        row.addEventListener('click', () => {
          catName = r.name;
          catColor = r.color || '';
          resultScores = r.scores;
          resultType = CAT_TYPES[r.code];
          renderResult();
          showView('result');
        });
        list.appendChild(row);
      });
    }

    // —— 贰 · 猫友圈 ——
    const friends = loadFriends();
    document.getElementById('friends-empty').style.display = friends.length ? 'none' : 'block';
    const flist = document.getElementById('friends-list');
    flist.innerHTML = '';
    friends.forEach(f => {
      const t = CAT_TYPES[f.code];
      if (!t) return;
      const row = document.createElement('div');
      row.className = 'file-row friend';
      row.innerHTML = `
        <div class="fr-svg">${catSVG(f.code)}</div>
        <div class="fr-info">
          <b>${esc(f.name)} <span class="friend-badge">好友的猫</span></b>
          <span class="fr-type">${t.name} · <i class="mono">${f.code}</i></span>
          <span class="fr-date mono">${new Date(f.t).toLocaleDateString('zh-CN')} 收到</span>
        </div>`;
      flist.appendChild(row);
    });
    if (friends.length) {
      const shareRow = document.createElement('div');
      shareRow.style.textAlign = 'center';
      shareRow.innerHTML = '<button class="ghost" id="btn-net-share2">+ 再邀请一位猫友</button>';
      flist.appendChild(shareRow);
      shareRow.querySelector('#btn-net-share2').addEventListener('click', copyInvite);
    }

    // —— 两猫对比（自己的猫 + 好友的猫 ≥ 2 只时展示） ——
    const pool = [
      ...recs.map(r => ({ ...r, from: '我家' })),
      ...friends.map(f => ({ ...f, from: '好友' })),
    ];
    // 去重（同名同型只留一个）
    const seen = new Set();
    const options = pool.filter(c => {
      const k = c.from + c.name + c.code;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    const box = document.getElementById('compare-box');
    if (options.length >= 2) {
      box.style.display = 'block';
      const fill = sel => {
        sel.innerHTML = options.map((c, i) =>
          `<option value="${i}">${c.from} · ${esc(c.name)}（${c.code}）</option>`).join('');
      };
      const a = document.getElementById('cmp-a'), b = document.getElementById('cmp-b');
      fill(a); fill(b);
      b.selectedIndex = 1;
      document.getElementById('btn-compare').onclick = () => {
        const ca = options[+a.value], cb = options[+b.value];
        if (a.value === b.value) { showToast('选两只不同的猫再对比 🐾'); return; }
        renderCompare(ca, cb);
      };
    } else {
      box.style.display = 'none';
    }
    document.getElementById('compare-result').innerHTML = '';
  }

  function copyInvite() {
    const recs = loadFiles();
    let url = location.origin + location.pathname;
    if (recs.length) {
      url += `?fcode=${recs[0].code}&fname=${encodeURIComponent(recs[0].name)}`;
    }
    const done = () => showToast('邀请链接已复制，发给养猫的朋友吧 🐾');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, () => prompt('复制链接发给朋友：', url));
    } else {
      prompt('复制链接发给朋友：', url);
    }
  }
  document.getElementById('btn-net-share').addEventListener('click', copyInvite);

  function renderCompare(ca, cb) {
    const pair = getPairing(ca.code, esc(ca.name), cb.code, esc(cb.name));
    const dims = [
      ['社交性', 0, '外向E', '内向I'],
      ['好奇心', 1, '谨慎S', '好奇N'],
      ['支配性', 2, '强势T', '温和F'],
      ['规律性', 3, '规律J', '随性P'],
    ];
    const dimRows = dims.map(([label, i]) => {
      const la = ca.code[i], lb = cb.code[i];
      const same = la === lb;
      return `<div class="cr-dim">
        <span class="k">${label}</span>
        <span class="mono">${la}</span>
        <span class="cr-tag ${same ? 'same' : 'diff'}">${same ? '同频' : '互补'}</span>
        <span class="mono">${lb}</span>
      </div>`;
    }).join('');
    document.getElementById('compare-result').innerHTML = `
      <div class="cr-head">
        <div class="cr-cat"><div class="cr-svg">${catSVG(ca.code)}</div><b>${esc(ca.name)}</b><span class="mono">${ca.code}</span></div>
        <div class="cr-score"><b>${pair.score}</b><span>缘分值</span></div>
        <div class="cr-cat"><div class="cr-svg">${catSVG(cb.code)}</div><b>${esc(cb.name)}</b><span class="mono">${cb.code}</span></div>
      </div>
      <div class="cr-title">「${pair.title}」</div>
      <p class="cr-line">${pair.line}</p>
      <div class="cr-dims">${dimRows}</div>
      <div class="cr-locked">
        <div class="dict-title">🔒 完整《相处剧本》· 待调阅</div>
        <ul class="locked-list">
          <li>▪ 初次见面剧本——谁先凑近、破冰要几天</li>
          <li>▪ 冲突预警——什么情况会打架、谁是挑事的</li>
          <li>▪ 和平共处指南——资源分配与空间布置 3 条建议</li>
        </ul>
        <button class="stamp-btn small" id="btn-script-unlock">申请调阅 · ¥9.9</button>
        <p class="tiny center" id="script-tip"></p>
      </div>`;
    document.getElementById('btn-script-unlock').addEventListener('click', () => {
      document.getElementById('script-tip').textContent =
        '调阅申请已登记 ✅ 付费通道开放后将第一时间通知你。';
    });
  }

  // 人 & 猫 MBTI 付费位
  document.getElementById('btn-humancat').addEventListener('click', () => {
    document.getElementById('humancat-tip').textContent =
      '解锁申请已登记 ✅ 人类快测题库上线后将第一时间通知你。';
  });

  // ============ 接收好友档案（分享链接进入） ============
  (function receiveFriend() {
    const p = new URLSearchParams(location.search);
    const code = (p.get('fcode') || '').toUpperCase();
    const name = (p.get('fname') || '').trim().slice(0, 12);
    if (!CAT_TYPES[code] || !name) return;
    const friends = loadFriends();
    if (friends.some(f => f.name === name && f.code === code)) return;
    friends.unshift({ name, code, t: Date.now() });
    saveFriends(friends);
    setTimeout(() => showToast(`已收到好友猫咪「${name}」的档案，去档案柜看看 🗂`), 600);
  })();

  showView('landing');
})();
