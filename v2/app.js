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
  let catsExpanded = false;    // 档案柜档案列表折叠态（会话内保持）
  let friendsExpanded = false; // 好友列表折叠态

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

  // 《行为翻译词典》数据已迁移至 content.js 的 DEEP_CONTENT（每型 12 条，含科学注脚）
  // 样章试阅 = 取前 2 条，第 2 条半加密展示

  // ============================================================
  // 猫咪写真照 / 档案照 状态机（对齐小程序 services/photoState.ts）
  // H5 纯前端演示：付费=模拟解锁；AI 照=选本地图 FileReader 直接当"AI 生成"结果，
  // 存 localStorage（rec.photoUrl / rec.photoStatus）。生成一次定型，不可再传。
  // 五态：locked（未付费）/ empty（付费未上传）/ making（制作中）/ done（已完成）/ failed（本地必成功，不出现）
  // ============================================================
  function computePhotoState(rec) {
    if (!rec || !rec.paid) return 'locked';
    if (rec.photoStatus === 'making') return 'making';
    if (rec.photoStatus === 'done') return 'done';
    return 'empty';
  }
  // 档案照三态徽章（base 未升级 / making 升级中 / done 已升级；失败归 base）
  function photoChip(state) {
    if (state === 'making') return { label: '升级中', tone: 'making' };
    if (state === 'done') return { label: '已升级', tone: 'done' };
    return { label: '未升级', tone: 'base' };
  }
  // 上传弹窗文案（随状态）
  function photoModalCopy(state) {
    switch (state) {
      case 'locked': return { desc: '解密深度档案后，可上传爱猫照片，AI 生成专属档案照与 MBTI 写真', cta: '解密档案', note: '' };
      case 'empty': return { desc: '上传爱猫照片，AI 将生成专属档案照与 MBTI 写真', cta: '上传照片', note: '' };
      case 'making': return { desc: 'AI 正在生成专属档案照与写真，稍候片刻…', cta: '生成中…', note: '' };
      case 'done': return { desc: '专属档案照已定型，永久归入本猫档案', cta: '查看写真', note: '每只猫的档案照仅定型一次，不可重新生成' };
      default: return { desc: '上传爱猫照片，AI 将生成专属档案照与 MBTI 写真', cta: '上传照片', note: '' };
    }
  }

  // ============================================================
  // 《隐私协议》· H5 事实版（重要：不照抄小程序那份服务器存储表述）
  // 主体与联系方式同小程序；数据行为如实描述纯前端演示站：仅存浏览器本地、不上传服务器、
  // 付费为演示模拟、上传照片仅本地处理不离开设备、清除浏览器数据即删除。
  // ============================================================
  const PRIVACY_SUBJECT = '杭州心语心声科技有限公司';
  const PRIVACY_CONTACT = '1041063767@qq.com';
  const PRIVACY_HIGHLIGHTS = [
    { icon: '💻', title: '仅存本地浏览器', text: '猫咪信息、答题结果、已解锁状态都只保存在你当前浏览器（localStorage），不上传任何服务器。' },
    { icon: '🖼️', title: '照片不离开设备', text: '上传的猫咪照片仅在本机用于生成演示头像与写真，不会上传、不会外传。' },
    { icon: '🎭', title: '付费为演示模拟', text: '本站是纯前端演示，"付费解锁"为点击即解锁的模拟，不产生任何真实扣费。' },
    { icon: '🗑️', title: '清除即删除', text: '清除本浏览器数据（或更换设备 / 浏览器）即彻底删除全部档案，无需联系客服。' },
  ];
  const PRIVACY_POLICY_TEXT = `# 喵格测试 · 演示站隐私说明

运营主体：${PRIVACY_SUBJECT}

## 关于本站

本页面是「喵格测试」的纯前端演示站（H5），用于体验产品形态。无需登录、无后端服务器，所有功能均在你的浏览器本地运行。

## 简要条款

1. 仅存本地：你填写的猫咪昵称、品种花色、24 题答题结果、以及已解锁状态，都只保存在你当前浏览器的本地存储（localStorage），不会上传到任何服务器。
2. 照片不离开设备：制作演示头像与写真时上传的猫咪照片，仅在你的设备本地读取处理（浏览器 FileReader），不上传、不外传，刷新或关闭页面即释放。
3. 付费为演示模拟：本站的"解密档案""升级档案照"等付费动作均为点击即解锁的演示模拟，不接入任何支付，不会产生真实扣费。
4. 无第三方收集：本站不索取通讯录、位置、麦克风、摄像头等权限，不做用户画像与广告推送。（页面字体等静态资源由公共 CDN 提供，属常规网络请求。）

## 数据的删除

由于全部数据只存在你的浏览器本地，你可随时通过清除本站点的浏览器数据（或更换设备 / 浏览器）来彻底删除全部档案，删除后不可恢复，无需联系我们。

## 关于正式版

正式版（微信小程序）会有真实登录、支付与云端存储，其数据处理规则以小程序内《隐私协议》为准，与本演示站不同。

## 联系我们

· 主体名称：${PRIVACY_SUBJECT}
· 邮箱：${PRIVACY_CONTACT}`;

  // --- 付费内容库拼装引擎（内容见 content.js，规则见 docs/content/assembly-rules.md） ---

  // 科学注脚：经验共识不显示编号；science 本身为共识占位时不渲染
  const refTag = r => (r && !/co|共识/.test(String(r))) ? ` <span class="sci-ref">${r}</span>` : '';
  function sciNote(science, ref) {
    if (!science || /共识/.test(science)) return '';
    return `<div class="sci">🔬 ${science}${refTag(ref)}</div>`;
  }

  // when 规则求值：原子 X.L / X.L!=Y.L，连接 && ||，'always' 恒真
  const LPOS = { E: 0, I: 0, S: 1, N: 1, T: 2, F: 2, J: 3, P: 3 };
  function evalWhenOnce(when, a, b) {
    if (!when || when === 'always') return true;
    const sub = s => (s === 'A' || s === 'human') ? a : b;
    const expr = when.replace(/\s+/g, '')
      .replace(/(A|B|human|cat)\.([EISNTFJP])!=(A|B|human|cat)\.([EISNTFJP])/g,
        (m, s1, l1, s2, l2) => (sub(s1)[LPOS[l1]] !== sub(s2)[LPOS[l2]]) ? '1' : '0')
      .replace(/(A|B|human|cat)\.([EISNTFJP])/g,
        (m, s, l) => (sub(s)[LPOS[l]] === l) ? '1' : '0');
    if (!/^[01&|()]+$/.test(expr)) return false;
    try { return !!(new Function('return ' + expr))(); } catch (e) { return false; }
  }
  // 两猫规则对称（A/B 互换也算命中）；人猫不对称
  const evalPair = (when, a, b) => evalWhenOnce(when, a, b) || evalWhenOnce(when, b, a);
  const atomCount = when => (String(when).match(/\./g) || []).length;

  const DIM_NAMES = { EI: '社交性', SN: '好奇心', TF: '支配性', JP: '规律性' };
  const DIM_IDX = { EI: 0, SN: 1, TF: 2, JP: 3 };
  function contentBlock(title, text, science, ref) {
    return `<div class="cblock"><h5>${title}</h5><p>${text}</p>${sciNote(science, ref)}</div>`;
  }

  // --- Views & Tabbar ---
  const views = {
    landing: document.getElementById('view-landing'),
    test: document.getElementById('view-test'),
    result: document.getElementById('view-result'),
    archive: document.getElementById('view-archive'),
  };
  const TAB_OF = { landing: 'landing', test: 'landing', result: 'landing', archive: 'archive' };

  function showView(name) {
    Object.values(views).forEach(v => v.classList.remove('active'));
    views[name].classList.add('active');
    document.getElementById('tabbar').style.display = name === 'test' ? 'none' : 'flex';
    document.getElementById('float-bar').style.display = name === 'result' ? 'flex' : 'none';
    document.querySelectorAll('.tab-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.view === TAB_OF[name]));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // 悬浮栏：深度档案 → 滚动到机密档案区并高亮
  function gotoLocked() {
    const locked = document.getElementById('d-locked');
    locked.scrollIntoView({ behavior: 'smooth', block: 'center' });
    locked.classList.remove('flash');
    setTimeout(() => locked.classList.add('flash'), 50);
  }
  document.getElementById('btn-deep').addEventListener('click', gotoLocked);

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

  // --- 本地存储（每条档案唯一 id，旧数据自动迁移补 id） ---
  const saveFiles = recs => localStorage.setItem(STORE_KEY, JSON.stringify(recs.slice(0, 50)));
  const loadFiles = () => {
    const recs = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    let dirty = false;
    recs.forEach((r, i) => { if (!r.id) { r.id = (r.t || Date.now()) + '-' + i; dirty = true; } });
    if (dirty) saveFiles(recs);
    return recs;
  };
  let currentRecId = null; // 当前结果页展示的档案 id
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

  // 实际进入测试
  function goTest() {
    catColor = document.getElementById('cat-color').value;
    currentQ = 0;
    answers.fill(null);
    renderQuestion();
    showView('test');
  }

  document.getElementById('btn-start').addEventListener('click', () => {
    const input = document.getElementById('cat-name');
    catName = input.value.trim();
    if (!catName) {
      input.style.borderBottomColor = '#b23a2c';
      input.placeholder = '主子尊称是必填项哦';
      input.focus();
      return;
    }
    // 隐私门槛：未勾选 → 弹简要条款确认弹窗（「同意并开始」直进测试）
    if (!privacyAgreed()) { openPolicyModal('brief'); return; }
    goTest();
  });

  // ============ 行为观察（答题） ============

  function renderQuestion() {
    const q = QUESTIONS[currentQ];
    const total = QUESTIONS.length;

    document.getElementById('test-no').textContent =
      `NO.${String(currentQ + 1).padStart(2, '0')} / ${total}`;
    const pct = (currentQ + 1) / total * 100;
    document.getElementById('ruler-fill').style.width = pct + '%';
    document.getElementById('cat-walker').style.left = pct + '%';
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
      const id = Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      recs.unshift({ id, name: catName, color: catColor, code: resultType.code, scores: resultScores, paid: false, t: Date.now() });
      saveFiles(recs);
      currentRecId = id;
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
    renderPetPhoto();
    document.getElementById('unlock-tip').textContent = '';
  }

  // 当前结果页对应的档案记录
  function currentRec() {
    return loadFiles().find(r => r.id === currentRecId) || null;
  }

  // 猫格证档案照三态徽章 + 头像（AI 照 or 简笔画）
  function renderIdcPhoto() {
    const rec = currentRec();
    const state = computePhotoState(rec);
    const shot = rec && rec.photoStatus === 'done' && rec.photoUrl ? rec.photoUrl : '';
    const svgEl = document.getElementById('idc-svg');
    if (shot) {
      svgEl.innerHTML = `<img class="cat-pic" src="${shot}" alt="AI 档案照"><span class="idc-ai-badge">AI 生成·演示</span>`;
    } else {
      svgEl.innerHTML = catSVG(resultType.code);
    }
    const chip = photoChip(state);
    const chipEl = document.getElementById('idc-chip');
    chipEl.textContent = chip.label;
    chipEl.className = 'idc-chip ' + chip.tone;
  }

  // 「猫咪写真照」板块：16:9 框内按五态切内容
  function renderPetPhoto() {
    renderIdcPhoto();
    const rec = currentRec();
    const state = computePhotoState(rec);
    const frame = document.getElementById('pp-frame16');
    const foot = document.getElementById('pp-foot');
    const row = document.getElementById('pp-row');
    document.getElementById('petphoto').className = 'petphoto ' + state;

    if (state === 'done' && rec.photoUrl) {
      frame.innerHTML = `<div class="pp-shot"><img class="pp-shot-img" src="${rec.photoUrl}" alt="写真"><span class="pp-ai-tag">${esc(rec.name)} 的专属写真 · AI 生成·演示</span></div>`;
      foot.style.display = 'none';
      row.onclick = null;
    } else if (state === 'making') {
      frame.innerHTML = `<div class="pp-making"><div class="pp-making-t">📸 正在冲印专属写真……</div><div class="pp-bar"><div class="pp-fill"></div></div><div class="pp-making-s">稍候片刻 · 可继续浏览档案</div></div>`;
      foot.style.display = 'none';
      row.onclick = null;
    } else {
      // locked / empty：按型格展示写真样例（16 型专属，对齐小程序 portraitSampleOf）+ 半透明提示占位
      const pcode = (resultType && resultType.code || '').toLowerCase();
      frame.innerHTML = `<div class="pp-sample16"><img class="pp-sample-img" src="portraits/${pcode}.jpg" alt="${esc((resultType && resultType.name) || '')}写真样例"><div class="pp-overlay"><span class="pp-overlay-t">上传照片生成猫咪写真</span></div></div>`;
      foot.style.display = '';
      foot.textContent = state === 'locked'
        ? '解密档案后可生成专属头像和写真照'
        : '上传照片，即可生成专属头像和写真照';
      row.onclick = openUploadModal;
    }
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

  // 当前展示的猫是否已付费（按档案唯一 id 匹配）
  function isPaidCurrent() {
    return loadFiles().some(r => r.id === currentRecId && r.paid);
  }

  // 样章试阅 + 人格写真照样例（含已解密状态）
  function renderDeepPreview() {
    const t = resultType;
    const cc = DEEP_CONTENT[t.code] || {};
    const entries = cc.dictionary || [];
    const paid = isPaidCurrent();

    // —— 状态复位/切换 ——
    const locked = document.getElementById('d-locked');
    locked.classList.toggle('unlocked', paid);
    document.getElementById('locked-band').textContent = paid ? '已解密 · UNLOCKED' : '机 密 · CLASSIFIED';
    document.getElementById('locked-title').innerHTML = paid ? '🔓 深度档案 · 已解密' : '🔒 深度档案 · 待调阅';
    document.getElementById('preview-label').textContent = paid ? '—— 完 整 档 案 ——' : '—— 样 章 试 阅 ——';
    document.getElementById('dict-title').textContent = `《${t.name}行为应对宝典》${paid ? '' : '精选'}`;
    document.getElementById('dict-more').textContent = paid
      ? `✓ 完整 ${entries.length} 条档案注解 · 已全部解密`
      : `…… 其余 ${Math.max(entries.length - 2, 0)} 条注解已加密，解密后全部展开`;
    document.getElementById('locked-list').style.display = paid ? 'none' : '';
    document.getElementById('deep-price').style.display = paid ? 'none' : '';
    const unlockBtn = document.getElementById('btn-unlock');
    unlockBtn.textContent = paid ? '已解密 ✓ 永久有效' : '解密全部档案 🔓';
    unlockBtn.classList.toggle('done', paid);
    unlockBtn.disabled = paid;
    // 悬浮栏同步
    const fbDeep = document.getElementById('btn-deep');
    fbDeep.innerHTML = paid ? '深度档案 · 已解密 ✓' : '解密档案 ¥9.9 <s>¥39.9</s>';
    fbDeep.classList.toggle('done', paid);

    // —— 已解密：追加红黑榜 + 喂养建议（内容库 · 含科学注脚） ——
    const extra = document.getElementById('deep-extra');
    if (paid) {
      const li = arr => (arr || []).map(x => `<li>${x.tip}${refTag(x.ref)}</li>`).join('');
      extra.innerHTML = `
        <div class="dict-title" style="margin-top:22px">《相处红黑榜》</div>
        <div class="rb-grid">
          <div class="rb red"><h5>✓ 红榜 · 多做</h5><ul>${li(cc.red)}</ul></div>
          <div class="rb black"><h5>✗ 黑榜 · 别碰</h5><ul>${li(cc.black)}</ul></div>
        </div>
        <div class="dict-title" style="margin-top:18px">《喂养环境建议》</div>
        <ul class="care-list">${(cc.care || []).map(x => `<li>🐾 ${x.tip}${refTag(x.ref)}</li>`).join('')}</ul>`;
    } else {
      extra.innerHTML = '';
    }

    // 词典：未解密显示前 2 条（第 2 条半加密），已解密全部展开
    const show = paid ? entries : entries.slice(0, 2);
    document.getElementById('dict-entries').innerHTML = show.map((e, i) => `
      <div class="dict-entry${!paid && i === 1 ? ' faded' : ''}">
        <div class="de-b">▸ ${e.behavior}</div>
        ${(!paid && i === 1)
          ? '<div class="de-t">完整解读与科学注解，解锁后展开</div>'
          : sciNote(e.science, e.ref)}
      </div>`).join('');

  }

  // 解密全部档案：模拟支付成功 → 切换到已解密状态（演示模式）
  document.getElementById('btn-unlock').addEventListener('click', () => {
    const recs = loadFiles();
    const hit = recs.find(r => r.id === currentRecId);
    if (hit) { hit.paid = true; saveFiles(recs); }
    showToast('支付成功（演示模式）· 档案已解密 🔓');
    renderDeepPreview();
    renderPetPhoto();
    document.getElementById('unlock-tip').textContent = '';
  });

  document.getElementById('btn-retest').addEventListener('click', () => {
    currentQ = 0;
    answers.fill(null);
    showView('landing');
  });

  // ============ 档案照上传弹窗 + 模拟 AI 生成（演示） ============
  const $uploadModal = document.getElementById('upload-modal');
  const $uploadFile = document.getElementById('upload-file');

  // 点击档案照 / 写真板块 → 弹上传弹窗（随状态切内容）
  function openUploadModal() {
    const rec = currentRec();
    const state = computePhotoState(rec);
    const shot = rec && rec.photoStatus === 'done' && rec.photoUrl ? rec.photoUrl : '';
    document.getElementById('upload-photo').innerHTML = shot
      ? `<img class="cat-pic" src="${shot}" alt="AI 档案照"><span class="idc-ai-badge">AI 生成·演示</span>`
      : catSVG(resultType.code);
    const copy = photoModalCopy(state);
    document.getElementById('upload-desc').textContent = copy.desc;
    const noteEl = document.getElementById('upload-note');
    noteEl.textContent = copy.note;
    noteEl.style.display = copy.note ? '' : 'none';
    const cta = document.getElementById('btn-upload-cta');
    cta.textContent = copy.cta;
    cta.disabled = state === 'making';
    $uploadModal.classList.add('active');
  }

  // 上传弹窗主按钮（随状态）
  document.getElementById('btn-upload-cta').addEventListener('click', () => {
    const rec = currentRec();
    const state = computePhotoState(rec);
    if (state === 'locked') { $uploadModal.classList.remove('active'); gotoLocked(); return; }
    if (state === 'making') return;
    if (state === 'done') { $uploadModal.classList.remove('active'); return; }
    // empty：选本地图片
    $uploadFile.value = '';
    $uploadFile.click();
  });

  // 选图 → FileReader（不上传）→ 「制作中」2~3 秒 → 用该图作为"AI 生成"结果定型
  $uploadFile.addEventListener('change', () => {
    const f = $uploadFile.files && $uploadFile.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      patchRecord(currentRecId, { photoStatus: 'making' });
      $uploadModal.classList.remove('active');
      renderPetPhoto();
      const delay = 2000 + Math.random() * 1000; // 本地必成功
      setTimeout(() => {
        patchRecord(currentRecId, { photoStatus: 'done', photoUrl: dataUrl });
        showToast('专属档案照生成完成 📸（演示模式）');
        renderPetPhoto();
      }, delay);
    };
    reader.readAsDataURL(f);
  });

  document.getElementById('upload-close').addEventListener('click', () => $uploadModal.classList.remove('active'));
  $uploadModal.addEventListener('click', e => { if (e.target === $uploadModal) $uploadModal.classList.remove('active'); });

  // 点击猫格证档案照 → 上传弹窗
  document.getElementById('idc-photo').addEventListener('click', openUploadModal);

  // ============ 分享档案照 ============

  const $shareModal = document.getElementById('share-modal');
  let shareFileName = '猫格证';

  document.getElementById('btn-share').addEventListener('click', async () => {
    shareFileName = `${catName}的猫格证`;
    // 未升级（非 AI 照）时显示引导小字；已升级则隐藏
    const rec = currentRec();
    const avatarDone = !!(rec && rec.photoStatus === 'done' && rec.photoUrl);
    document.getElementById('share-hint').style.display = avatarDone ? 'none' : '';
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
      a.download = `${shareFileName}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    }, 'image/png');
  });

  // 按类型加载头像 PNG（供 canvas 导出使用）
  function loadCatImage(code) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = catImgSrc(code);
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

    const INK = '#2f261c', RED = '#b23a2c', SOFT = '#6f5c44', PAPER = '#f4ead2', CARD = '#fbf4e2', GOLD = '#c79a3b';
    try { await document.fonts.ready; } catch (e) { /* 继续 */ }
    // 头像取"当前最新可用"：AI 照（白金版）优先，否则像素头像
    const rec = currentRec();
    const avatarDone = !!(rec && rec.photoStatus === 'done' && rec.photoUrl);
    const mainImg = avatarDone ? await loadDataImg(rec.photoUrl) : await loadCatImage(t.code);

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

    // 标题带（印泥红，对齐猫格证顶栏主题）
    ctx.fillStyle = RED;
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
    if (mainImg) drawImageCover(ctx, mainImg, px + 8, py + 8, ps - 16, ps - 16);
    // AI 照角标（白金版）
    if (avatarDone) {
      ctx.fillStyle = 'rgba(23,17,11,0.72)';
      ctx.fillRect(px + 8, py + ps - 34, 108, 20);
      ctx.font = '11px "Courier New", monospace';
      ctx.fillStyle = '#f0d9a8';
      ctx.textAlign = 'left';
      ctx.fillText('AI 生成·演示', px + 14, py + ps - 20);
    }
    ctx.font = '12px "Courier New", monospace';
    ctx.fillStyle = SOFT;
    ctx.textAlign = 'center';
    ctx.fillText('专 属 档 案 照', px + ps / 2, py + ps + 24);

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

    // 4 关键词 chip（取档案标签前 4 个）
    const chips = (t.tags || []).slice(0, 4);
    let chx = 60;
    const chy = 462;
    ctx.font = '15px "PingFang SC", sans-serif';
    ctx.textAlign = 'left';
    chips.forEach(tag => {
      const w = ctx.measureText(tag).width + 22;
      ctx.strokeStyle = SOFT; ctx.lineWidth = 1.2;
      rr(ctx, chx, chy, w, 28, 14); ctx.stroke();
      ctx.fillStyle = INK;
      ctx.fillText(tag, chx + 11, chy + 19);
      chx += w + 8;
    });

    // 版本章（白金版金黄，仅 AI 照生效时盖；普通版不盖章）
    if (avatarDone) {
      ctx.save();
      ctx.translate(W - 118, 452);
      ctx.rotate(-0.18);
      ctx.strokeStyle = GOLD; ctx.lineWidth = 3;
      rr(ctx, -52, -22, 104, 44, 8); ctx.stroke();
      ctx.font = '17px "ZCOOL QingKe HuangYou", sans-serif';
      ctx.fillStyle = GOLD;
      ctx.textAlign = 'center';
      ctx.fillText('白金版', 0, 6);
      ctx.restore();
    }

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
      // 折叠：超过 3 份默认只显示前 3 份（会话内保持）
      const FOLD = 3;
      const shown = catsExpanded ? recs : recs.slice(0, FOLD);
      shown.forEach(r => {
        const t = CAT_TYPES[r.code];
        if (!t) return;
        // 写真照状态标签（未解锁 / 未制作 / 制作中 / 已完成——本地状态推导）
        const st = !r.paid ? ['lock', '未解锁']
          : r.photoStatus === 'done' ? ['done', '已完成']
          : r.photoStatus === 'making' ? ['making', '制作中']
          : ['none', '未制作'];
        const row = document.createElement('div');
        row.className = 'file-row';
        row.innerHTML = `
          <div class="fr-svg">${catSVG(r.code)}</div>
          <div class="fr-info">
            <b>${esc(r.name)}${r.paid ? ' <span class="paid-badge">付费档案</span>' : ''}</b>
            <span class="fr-type">${t.name} · <i class="mono">${r.code}</i></span>
            <span class="fr-date mono">${new Date(r.t).toLocaleDateString('zh-CN')}</span>
          </div>
          <span class="fr-open">调阅 →</span>
          <div class="fr-photo">
            <span class="fp-label">📷 写真照</span>
            <span class="photo-chip st-${st[0]}">${st[1]}</span>
          </div>`;
        row.addEventListener('click', () => {
          catName = r.name;
          catColor = r.color || '';
          resultScores = r.scores;
          resultType = CAT_TYPES[r.code];
          currentRecId = r.id;
          renderResult();
          showView('result');
        });
        list.appendChild(row);
      });
      if (recs.length > FOLD) {
        const toggle = document.createElement('div');
        toggle.className = 'fold-toggle';
        toggle.textContent = catsExpanded ? '收起 ▴' : `展开全部 ${recs.length} 份 ▾`;
        toggle.addEventListener('click', () => { catsExpanded = !catsExpanded; renderCabinet(); });
        list.appendChild(toggle);
      }
    }

    // —— 贰 · 猫友圈 ——
    const friends = loadFriends();
    document.getElementById('friends-empty').style.display = friends.length ? 'none' : 'block';
    const flist = document.getElementById('friends-list');
    flist.innerHTML = '';
    const FOLD_F = 3;
    const shownF = friendsExpanded ? friends : friends.slice(0, FOLD_F);
    shownF.forEach(f => {
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
    if (friends.length > FOLD_F) {
      const toggle = document.createElement('div');
      toggle.className = 'fold-toggle';
      toggle.textContent = friendsExpanded ? '收起 ▴' : `展开全部 ${friends.length} 位 ▾`;
      toggle.addEventListener('click', () => { friendsExpanded = !friendsExpanded; renderCabinet(); });
      flist.appendChild(toggle);
    }
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

    // —— 叁 · 人 & 猫 MBTI 选项 ——
    fillHumanCatSelects(recs, friends);
    document.getElementById('hc-result').innerHTML = '';
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
      ['社交性', 0],
      ['好奇心', 1],
      ['支配性', 2],
      ['规律性', 3],
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
    // 免费：缘分值 + 称号 + 锐评；深度解读 ¥9.9 开通（开通后无限次，已开通显示全文）
    const unlocked = localStorage.getItem('meow_cmp_unlocked') === '1';
    const head = `
      <div class="cr-head">
        <div class="cr-cat"><div class="cr-svg">${catSVG(ca.code)}</div><b>${esc(ca.name)}</b><span class="mono">${ca.code}</span></div>
        <div class="cr-score"><b>${pair.score}</b><span>缘分值</span></div>
        <div class="cr-cat"><div class="cr-svg">${catSVG(cb.code)}</div><b>${esc(cb.name)}</b><span class="mono">${cb.code}</span></div>
      </div>
      <div class="cr-title">「${pair.title}」</div>
      <p class="cr-line">${pair.line}</p>`;

    // 已开通：按 assembly-rules 从内容库拼装（维度4块 + 冲突3~4 + 和平4）
    let unlockedBody = '';
    if (unlocked) {
      const A = ca.code, B = cb.code;
      const dimBlocks = ['EI', 'SN', 'TF', 'JP'].map(k => {
        const i = DIM_IDX[k];
        const key = A[i] === B[i] ? A[i] + A[i] : 'MIX';
        const d = (CMP_CONTENT.dims[k] || {})[key];
        return d ? contentBlock(`${DIM_NAMES[k]} · ${d.title}`, d.text, d.science, d.ref) : '';
      }).join('');

      const cHits = CMP_CONTENT.conflict.filter(x => evalPair(x.when, A, B));
      const cPick = [
        ...cHits.filter(x => x.when !== 'always')
          .sort((x, y) => atomCount(y.when) - atomCount(x.when)).slice(0, 3),
        ...cHits.filter(x => x.when === 'always'),
      ];
      const conflictBlocks = cPick.map(x => contentBlock('⚡ ' + x.title, x.text, x.science, x.ref)).join('');

      const pHits = CMP_CONTENT.peace.filter(x => evalPair(x.when, A, B));
      const pCond = pHits.filter(x => x.when !== 'always').slice(0, 2);
      const pAlw = pHits.filter(x => x.when === 'always')
        .sort((x, y) => (['p1', 'p10'].includes(y.id) ? 1 : 0) - (['p1', 'p10'].includes(x.id) ? 1 : 0));
      const pPick = [...pCond, ...pAlw].slice(0, 4);
      const peaceBlocks = pPick.map(x => contentBlock('🕊 ' + x.title, x.text, x.science, x.ref)).join('');

      unlockedBody = `<div class="cr-locked unlocked-box">
          <div class="dict-title">🔓 深度解读 · 已开通</div>
          <div class="cr-dims">${dimRows}</div>
          <div class="dict-title" style="margin-top:16px">📖 维度对比详解</div>
          ${dimBlocks}
          <div class="dict-title" style="margin-top:16px">⚡ 冲突预警</div>
          ${conflictBlocks}
          <div class="dict-title" style="margin-top:16px">🕊 和平共处指南</div>
          ${peaceBlocks}
          <p class="tiny center unlock-done">已开通 · 无限次对比 ✓</p>
        </div>`;
    }

    const deepBody = unlocked
      ? unlockedBody
      : `<div class="cr-locked">
          <div class="dict-title">🔒 深度解读 · 待开通</div>
          <div class="blur-lock"><div class="cr-dims">${dimRows}</div></div>
          <ul class="locked-list">
            <li>▪ 维度对比——四个维度同频/互补逐项解读</li>
            <li>▪ 冲突预警——什么情况会炸毛、谁是挑事的</li>
            <li>▪ 和平共处指南——资源分配与空间布置建议</li>
          </ul>
          <div class="price-row"><b>¥9.9</b><s>¥39.9</s><span class="price-tag">限时内测价</span></div>
          <button class="stamp-btn small" id="btn-script-unlock">解密两猫关系 🔓</button>
          <p class="tiny center">开通后可无限次对比任意两只猫</p>
        </div>`;

    document.getElementById('compare-result').innerHTML = head + deepBody;
    if (!unlocked) {
      document.getElementById('btn-script-unlock').addEventListener('click', () => {
        localStorage.setItem('meow_cmp_unlocked', '1');
        showToast('支付成功（演示模式）· 深度对比已开通 🔓');
        renderCompare(ca, cb);
      });
    }
  }

  // ============ 人 & 猫 MBTI ============

  // 人猫适配分：互补优先（人的包容度 × 猫的性格强度）
  function humanCatScore(h, c) {
    let s = 50;
    if (h[0] === 'E' && c[0] === 'E') s += 8;        // 双外向：互动拉满
    else if (h[0] === 'I' && c[0] === 'I') s += 9;   // 双内向：安静同频
    else if (c[0] === 'E') s += 7;                   // 猫外向主动破冰
    else s += 4;                                     // 人热猫冷需磨合
    s += h[1] === c[1] ? 6 : 4;
    if (h[2] === 'T' && c[2] === 'T') s -= 4;        // 双强势易较劲
    else if (h[2] === 'F' && c[2] === 'T') s += 9;   // 人包容 × 猫霸道
    else if (h[2] === 'T') s += 8;                   // 人主导 × 猫温和
    else s += 7;
    s += h[3] === c[3] ? 7 : 4;
    // 原始分范围 58~81，线性重映射到 42~98，保证四档等级全部可达
    // （详见 docs/人猫匹配算法说明.md）
    return Math.round(42 + (s - 58) * (98 - 42) / (81 - 58));
  }
  const hcLevel = s => s >= 85 ? '天作之合' : s >= 70 ? '相处融洽' : s >= 55 ? '需要磨合' : '缘分挑战';

  function fillHumanCatSelects(recs, friends) {
    const hcH = document.getElementById('hc-human');
    hcH.innerHTML = '<option value="">你的 MBTI</option>' +
      Object.keys(CAT_TYPES).map(c => `<option value="${c}">${c}</option>`).join('');
    const mine = recs.map(r => `<option value="${r.code}">${esc(r.name)}（${r.code}）</option>`).join('');
    const pals = friends.map(f => `<option value="${f.code}">${esc(f.name)}（${f.code}）</option>`).join('');
    document.getElementById('hc-cat').innerHTML =
      (mine ? `<optgroup label="我的猫">${mine}</optgroup>` : '') +
      (pals ? `<optgroup label="好友的猫">${pals}</optgroup>` : '') +
      `<optgroup label="按类型选">${Object.entries(CAT_TYPES).map(([c, t]) =>
        `<option value="${c}">${t.name}（${c}）</option>`).join('')}</optgroup>`;
  }

  function renderHumanCat() {
    const h = document.getElementById('hc-human').value;
    const c = document.getElementById('hc-cat').value;
    if (!h) { showToast('先选择你自己的 MBTI 🧑'); return; }
    const s = humanCatScore(h, c);
    const unlocked = localStorage.getItem('meow_hc_unlocked') === '1';

    const scoreBlock = `
      <div class="hc-score">
        <span class="mono hc-codes">${h} × ${c}</span>
        <b>${s}</b>
        <div class="hc-level">「${hcLevel(s)}」</div>
      </div>`;

    let body;
    if (unlocked) {
      // 按 assembly-rules 拼装：维度4块 + 权力1~2 + 雷区/讨好聚合 + 一周名场面≤2
      const dimBlocks = ['EI', 'SN', 'TF', 'JP'].map(k => {
        const i = DIM_IDX[k];
        const d = (HC_CONTENT.dims[k] || {})[`${h[i]}-${c[i]}`];
        return d ? contentBlock(`${DIM_NAMES[k]} · ${d.title}`, d.text, d.science, d.ref) : '';
      }).join('');

      const powHits = HC_CONTENT.power.filter(x => evalWhenOnce(x.when, h, c));
      const primary = powHits.find(x => /\.(T|F)/.test(x.when) && atomCount(x.when) === 2);
      const secondary = powHits.filter(x => x !== primary)
        .sort((x, y) => atomCount(y.when) - atomCount(x.when))[0];
      const powerBlocks = [primary, secondary].filter(Boolean)
        .map(x => contentBlock('👑 ' + x.title, x.text, x.science, x.ref)).join('');

      const gather = pool => [...c].flatMap(L => ((pool || {})[L] || []).slice(0, 2));
      const bullets = arr => `<ul class="care-list">${arr.map(x => `<li>▪ ${x.tip}${refTag(x.ref)}</li>`).join('')}</ul>`;
      const weekly = (HC_CONTENT.weekly || []).filter(x => evalWhenOnce(x.when, h, c)).slice(0, 2);

      body = `
        <div class="cr-locked unlocked-box">
          <div class="dict-title">🔓 完整适配解析 · 已解锁</div>
          <div class="dict-title" style="margin-top:12px">📖 四维关系拆解</div>
          ${dimBlocks}
          <div class="dict-title" style="margin-top:16px">👑 谁在驯服谁</div>
          ${powerBlocks}
          <div class="dict-title" style="margin-top:16px">💣 雷区清单</div>
          ${bullets(gather(HC_CONTENT.mines))}
          <div class="dict-title" style="margin-top:16px">🍖 讨好攻略</div>
          ${bullets(gather(HC_CONTENT.please))}
          ${weekly.length ? `<div class="dict-title" style="margin-top:16px">📅 一周名场面预测</div>` +
            weekly.map(w => `<p class="weekly-line">${w.text}</p>`).join('') : ''}
          <p class="tiny center unlock-done">已解锁 · 任意人猫组合可查 ✓</p>
        </div>`;
    } else {
      body = `
        <div class="cr-locked">
          <div class="dict-title">🔒 完整适配解析 · 待解锁</div>
          <ul class="locked-list">
            <li>▪ 谁在驯服谁——你们的权力结构解析</li>
            <li>▪ 雷区清单——千万别对 TA 做的事</li>
            <li>▪ 讨好攻略——对这只猫最有效的示好方式</li>
          </ul>
          <div class="price-row"><b>¥9.9</b><s>¥29.9</s><span class="price-tag">限时内测价</span></div>
          <button class="stamp-btn small" id="btn-hc-unlock">解锁完整解析 🔓</button>
          <p class="tiny center" id="humancat-tip"></p>
        </div>`;
    }
    document.getElementById('hc-result').innerHTML = scoreBlock + body;
    if (!unlocked) {
      document.getElementById('btn-hc-unlock').addEventListener('click', () => {
        localStorage.setItem('meow_hc_unlocked', '1');
        showToast('支付成功（演示模式）· 完整解析已解锁 🔓');
        renderHumanCat();
      });
    }
  }
  document.getElementById('btn-humancat').addEventListener('click', renderHumanCat);

  // ============ 档案记录读写辅助 ============
  function patchRecord(id, patch) {
    const recs = loadFiles();
    const r = recs.find(x => x.id === id);
    if (r) { Object.assign(r, patch); saveFiles(recs); }
  }

  function loadDataImg(src) {
    return new Promise(res => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => res(null);
      i.src = src;
    });
  }

  function drawImageCover(ctx, img, x, y, w, h) {
    const s = Math.max(w / img.width, h / img.height);
    const sw = w / s, sh = h / s;
    const sx = (img.width - sw) / 2, sy = (img.height - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  // ============ 受理动态走马灯 + 建档计数器 ============
  // ⚠️ 构造数据（行业常规的氛围组），小程序接入云数据库后切换为真实动态

  (function initTicker() {
    const NAMES = ['煤球', '年糕', '布丁', '汤圆', '麻薯', '奥利奥', '芝麻', '豆腐',
      '可乐', '鱼丸', '糯米', '花卷', '馒头', '雪碧', '旺仔', '椰奶',
      '皮蛋', '包子', '乌龙', '栗子', '小满', '芋泥'];
    const BREEDS = ['狸花猫', '橘猫', '三花猫', '奶牛猫', '英短', '布偶', '美短', '玄猫'];
    const RARE_CODES = ['ENTJ', 'ENTP', 'ENFJ', 'INTJ', 'ESTJ'];
    const PAIR_TITLES = ['天选搭子', '一动一静', '岁月静好', '派对双子星', '镜像猫生'];
    const CODES = Object.keys(CAT_TYPES);
    const pick = a => a[Math.floor(Math.random() * a.length)];

    const msgs = [];
    for (let i = 0; i < 48; i++) {
      const r = i % 4;
      if (r === 0) {
        const c = pick(CODES);
        msgs.push(`${pick(BREEDS)}「${pick(NAMES)}」测出 ${c} ${CAT_TYPES[c].name}`);
      } else if (r === 1) {
        const c = pick(RARE_CODES);
        msgs.push(`「${pick(NAMES)}」测出稀有猫格 ${c} · 全所仅 ${RARITY[c]}%`);
      } else if (r === 2) {
        msgs.push(`「${pick(NAMES)}」的深度档案刚被主子解密了`);
      } else {
        const a = pick(NAMES);
        let b = pick(NAMES);
        while (b === a) b = pick(NAMES);
        msgs.push(`「${a}」×「${b}」缘分值 ${85 + Math.floor(Math.random() * 14)} · ${pick(PAIR_TITLES)}`);
      }
    }
    msgs.sort(() => Math.random() - 0.5);

    const el = document.getElementById('ticker-item');
    let idx = 0;
    const show = () => {
      el.textContent = msgs[idx % msgs.length];
      el.classList.remove('roll');
      void el.offsetWidth; // 重新触发动画
      el.classList.add('roll');
      idx++;
    };
    show();
    setInterval(show, 3000);
  })();

  (function initCounter() {
    const el = document.getElementById('bureau-count');
    // 严格单调分钟级函数：任何时刻只增不减（跨天不跳变）。
    // 每日约 +137，按分钟均摊；数值与旧公式（基数 236208 起）平滑衔接。
    // TODO(stats): 档案数 ≥ 阈值后切真实统计（接入云数据库后替换为后端下发的 total）。
    const calc = () => {
      const minutes = Math.floor((Date.now() - new Date('2026-06-01T00:00:00+08:00').getTime()) / 60000);
      return 236208 + Math.floor(minutes * 137 / 1440);
    };
    const fmt = x => x.toLocaleString('en-US');
    el.textContent = fmt(calc());
    // 每 60s 用同一函数重算刷新（分钟推进自然 +0/+1，绝不回退）。
    setInterval(() => { el.textContent = fmt(calc()); }, 60000);
  })();

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

  // ============ 隐私协议勾选 + 弹窗（交互对齐小程序，文本用 H5 事实版） ============
  const PRIVACY_KEY = 'meow_privacy_agreed';
  const privacyAgreed = () => localStorage.getItem(PRIVACY_KEY) === '1';
  const setPrivacyAgreed = v => v ? localStorage.setItem(PRIVACY_KEY, '1') : localStorage.removeItem(PRIVACY_KEY);

  const $paBox = document.getElementById('pa-box');
  function syncAgreeUI() { $paBox.classList.toggle('checked', privacyAgreed()); $paBox.textContent = privacyAgreed() ? '✓' : ''; }
  const toggleAgree = () => { setPrivacyAgreed(!privacyAgreed()); syncAgreeUI(); };
  $paBox.addEventListener('click', toggleAgree);
  document.getElementById('pa-text').addEventListener('click', toggleAgree);
  document.getElementById('pa-link').addEventListener('click', () => openPolicyModal('full'));
  syncAgreeUI();

  const $policyModal = document.getElementById('policy-modal');
  // 协议正文按 # / ## 标题拆行渲染
  function policyFullHTML() {
    return PRIVACY_POLICY_TEXT.split('\n').filter(l => l.length).map(line => {
      if (line.startsWith('## ')) return `<div class="pp-h2">${esc(line.replace(/^##\s+/, ''))}</div>`;
      if (line.startsWith('# ')) return `<div class="pp-h1">${esc(line.replace(/^#\s+/, ''))}</div>`;
      return `<div class="pp-p">${esc(line)}</div>`;
    }).join('');
  }
  function policyBriefHTML() {
    return `<div class="pp-highlights">${PRIVACY_HIGHLIGHTS.map(h =>
      `<div class="pp-card"><span class="pp-card-icon">${h.icon}</span><div class="pp-card-main"><div class="pp-card-title">${esc(h.title)}</div><div class="pp-card-text">${esc(h.text)}</div></div></div>`
    ).join('')}</div><div class="pp-fulllink" id="pp-fulllink">查看完整协议 ›</div>`;
  }
  // variant: 'full' 只读全文（勾选行/页脚入口）；'brief' 建档前简要确认（同意并开始 → 直进测试）
  function openPolicyModal(variant) {
    const body = document.getElementById('policy-body');
    const agreeBtn = document.getElementById('policy-agree');
    const sub = document.getElementById('policy-sub');
    if (variant === 'brief') {
      sub.textContent = '建档前请知悉';
      body.innerHTML = policyBriefHTML();
      agreeBtn.textContent = '同 意 并 开 始';
      agreeBtn.onclick = () => { setPrivacyAgreed(true); syncAgreeUI(); $policyModal.classList.remove('active'); goTest(); };
      const fl = document.getElementById('pp-fulllink');
      if (fl) fl.addEventListener('click', () => { body.innerHTML = `<div class="pp-scroll">${policyFullHTML()}</div>`; });
    } else {
      sub.textContent = 'PRIVACY POLICY';
      body.innerHTML = `<div class="pp-scroll">${policyFullHTML()}</div>`;
      agreeBtn.textContent = '我知道了';
      agreeBtn.onclick = () => $policyModal.classList.remove('active');
    }
    $policyModal.classList.add('active');
  }
  document.getElementById('policy-close').addEventListener('click', () => $policyModal.classList.remove('active'));
  $policyModal.addEventListener('click', e => { if (e.target === $policyModal) $policyModal.classList.remove('active'); });

  // ============ 科学依据折叠（建档区底部） ============
  document.getElementById('sci-fold-head').addEventListener('click', () => {
    const body = document.getElementById('sci-fold-body');
    const arrow = document.getElementById('sci-fold-arrow');
    const open = body.style.display === 'none';
    body.style.display = open ? '' : 'none';
    arrow.textContent = open ? '▴' : '▾';
  });

  // ============ 档案柜页脚：隐私协议 + 联系与反馈（可复制） ============
  document.getElementById('footlink-policy').addEventListener('click', () => openPolicyModal('full'));
  function copyText(value, label) {
    const done = () => showToast(`${label}已复制`);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(done, () => showToast('复制失败，请手动记录'));
    } else { showToast('复制失败，请手动记录'); }
  }
  document.getElementById('footlink-email').addEventListener('click', () => copyText(PRIVACY_CONTACT, '客服邮箱'));

  showView('landing');
})();
