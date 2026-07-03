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
  };
  const $posterModal = document.getElementById('poster-modal');
  const $typeModal = document.getElementById('type-modal');

  // --- View switching ---
  function showView(name) {
    Object.values(views).forEach(v => v.classList.remove('active'));
    views[name].classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    showView('landing');
  });

  // === POSTER ===
  document.getElementById('btn-poster').addEventListener('click', generatePoster);

  function generatePoster() {
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

    // Background
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#fff6e6');
    grad.addColorStop(0.5, '#ffe4cf');
    grad.addColorStop(1, '#fff6e6');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Decorative circles
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#f2762e';
    ctx.beginPath(); ctx.arc(100, 200, 150, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(650, 900, 200, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // Title
    ctx.font = '42px "ZCOOL KuaiLe", "PingFang SC", sans-serif';
    ctx.fillStyle = '#f2762e';
    ctx.textAlign = 'center';
    ctx.fillText('🐱 喵格测试', W / 2, 80);

    ctx.font = '24px "PingFang SC", sans-serif';
    ctx.fillStyle = '#9c8168';
    ctx.fillText('发现你家猫主子的隐藏性格', W / 2, 120);

    // Cat SVG → render as image
    const svgStr = catSVG(t.code);
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, W / 2 - 120, 160, 240, 240);
      URL.revokeObjectURL(svgUrl);
      finishPoster(ctx, W, H, t, group);
    };
    img.onerror = () => {
      finishPoster(ctx, W, H, t, group);
    };
    img.src = svgUrl;
  }

  function finishPoster(ctx, W, H, t, group) {
    // Cat name
    ctx.font = 'bold 32px "PingFang SC", sans-serif';
    ctx.fillStyle = '#46342a';
    ctx.textAlign = 'center';
    ctx.fillText(`${catName} 的性格类型`, W / 2, 440);

    // Type name
    ctx.font = '56px "ZCOOL KuaiLe", "PingFang SC", sans-serif';
    ctx.fillStyle = '#f2762e';
    ctx.fillText(t.name, W / 2, 510);

    // Code
    ctx.font = '28px "PingFang SC", sans-serif';
    ctx.fillStyle = '#d99a63';
    ctx.fillText(t.code + ' · ' + group.icon + ' ' + group.name, W / 2, 555);

    // Tags
    ctx.font = '22px "PingFang SC", sans-serif';
    ctx.fillStyle = '#f2762e';
    ctx.fillText(t.tags.join('  ·  '), W / 2, 610);

    // Desc card
    const descX = 60, descY = 660, descW = W - 120;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    roundRect(ctx, descX, descY, descW, 320, 20);
    ctx.fill();

    ctx.font = '22px "PingFang SC", sans-serif';
    ctx.fillStyle = '#46342a';
    ctx.textAlign = 'left';
    wrapText(ctx, t.desc, descX + 30, descY + 40, descW - 60, 34);

    // Quotes
    ctx.font = 'italic 20px "PingFang SC", sans-serif';
    ctx.fillStyle = '#f2762e';
    const qY = descY + 200;
    t.quotes.slice(0, 2).forEach((q, i) => {
      ctx.fillText(q, descX + 30, qY + i * 32);
    });

    // Strengths / Weaknesses
    const traitY = 1020;
    ctx.font = 'bold 22px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#2e8f5e';
    ctx.fillText('✨ ' + t.strengths.join(' · '), W / 2, traitY);
    ctx.fillStyle = '#cd7a12';
    ctx.fillText('⚡ ' + t.weaknesses.join(' · '), W / 2, traitY + 40);

    // MBTI 双极维度条（与结果页一致：中线出发，圆点偏向优势侧）
    const barY = 1100;
    DIM_CONFIG.forEach((d, i) => {
      const y = barY + i * 40;
      ctx.font = '16px "PingFang SC", sans-serif';
      ctx.fillStyle = '#9c8168';
      ctx.textAlign = 'left';
      ctx.fillText(`${d.left[0]} ${d.left[1]}`, 70, y + 5);
      ctx.textAlign = 'right';
      ctx.fillText(`${d.right[1]} ${d.right[0]}`, W - 70, y + 5);

      const bx = 180, bw = W - 360, bh = 10;
      // 轨道
      ctx.fillStyle = '#f0e2c8';
      roundRect(ctx, bx, y - 5, bw, bh, 5);
      ctx.fill();
      // 中线
      ctx.fillStyle = '#dcc9ae';
      ctx.fillRect(bx + bw / 2 - 1, y - 9, 2, 18);
      // 从中线到圆点的填充
      const pos = dimPos(d) / 100;
      const px = bx + bw * pos;
      const cxm = bx + bw / 2;
      ctx.fillStyle = d.color;
      roundRect(ctx, Math.min(px, cxm), y - 5, Math.max(Math.abs(px - cxm), 4), bh, 5);
      ctx.fill();
      // 圆点
      ctx.beginPath();
      ctx.arc(px, y, 9, 0, Math.PI * 2);
      ctx.fillStyle = d.color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.stroke();
    });

    // Footer
    ctx.textAlign = 'center';
    ctx.font = '18px "PingFang SC", sans-serif';
    ctx.fillStyle = '#d99a63';
    ctx.fillText('长按保存图片 · 分享给朋友一起测', W / 2, H - 40);

    // Show modal
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

  // Init
  showView('landing');
})();
