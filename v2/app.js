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

  const STORE_KEY = 'meow_bureau_files';

  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

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
  function dimPos(d) {
    const p = resultScores[d.key];
    return (d.scoreSide === 'left' ? (1 - p) : p) * 100;
  }

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
        <div style="font-family:var(--mono);font-size:12px;color:var(--red);letter-spacing:3px;font-weight:700">MBTI · ${code}</div>
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

  function fileNo(code) {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    let h = 0;
    for (const ch of catName) h = (h * 31 + ch.charCodeAt(0)) % 1000;
    return `MEOW-${ymd}-${code}-${String(h).padStart(3, '0')}`;
  }

  function saveFile() {
    try {
      const recs = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
      recs.unshift({ name: catName, color: catColor, code: resultType.code, scores: resultScores, t: Date.now() });
      localStorage.setItem(STORE_KEY, JSON.stringify(recs.slice(0, 50)));
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
    renderDeepPreview();
    document.getElementById('unlock-tip').textContent = '';
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

  // 样章试阅 + 人格写真照样例
  function renderDeepPreview() {
    const t = resultType;
    const entries = DEEP_PREVIEW[t.code] || [];

    // 词典节选：第 1 条完整，第 2 条渐隐加密
    document.getElementById('dict-entries').innerHTML = entries.map(([b, note], i) => `
      <div class="dict-entry${i === 1 ? ' faded' : ''}">
        <div class="de-b">▸ 观察到的行为：${b}</div>
        <div class="de-t">档案注解：${note}</div>
      </div>`).join('');

    // 三视图特摄（监狱风身高线）
    document.getElementById('mugshots').innerHTML = `
      <div class="shot"><div class="shot-svg">${catSVG(t.code)}</div><span>正面</span></div>
      <div class="shot"><div class="shot-svg flip">${catSVG(t.code)}</div><span>侧面</span></div>
      <div class="shot"><div class="shot-svg sil">${catSVG(t.code)}</div><span>背面</span></div>`;

    // 特征描述表（危险/粘人指数由实测分数生成）
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

  document.getElementById('btn-unlock').addEventListener('click', () => {
    document.getElementById('unlock-tip').textContent =
      '调阅申请已登记 ✅ 付费通道开放后将第一时间通知你。';
  });

  document.getElementById('btn-retest').addEventListener('click', () => {
    currentQ = 0;
    answers.fill(null);
    showView('landing');
  });

  // ============ 档案柜 ============

  function renderCabinet() {
    const recs = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    const unlocked = new Set(recs.map(r => r.code));
    document.getElementById('cabinet-progress').textContent =
      recs.length ? `已收录 ${unlocked.size} / 16 型 MBTI · 共 ${recs.length} 份档案` : '';
    const list = document.getElementById('cabinet-list');
    if (!recs.length) {
      list.innerHTML = '<div class="cabinet-empty">档案柜空空如也<br>先去给主子建一份档案 🐾</div>';
      return;
    }
    list.innerHTML = '';
    recs.forEach(r => {
      const t = CAT_TYPES[r.code];
      if (!t) return;
      const row = document.createElement('div');
      row.className = 'file-row';
      row.innerHTML = `
        <div class="fr-svg">${catSVG(r.code)}</div>
        <div class="fr-info">
          <b>${esc(r.name)}</b>
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

  showView('landing');
})();
