// ============================================================
// 猫咪MBTI · 配对相性（16×16 静态规则，无后端）
// ============================================================

function getPairing(codeA, nameA, codeB, nameB) {
  const ta = CAT_TYPES[codeA], tb = CAT_TYPES[codeB];
  const A = codeA.split(''), B = codeB.split('');
  const isBest = ta.bestMatch.includes(codeB) || tb.bestMatch.includes(codeA);
  const isChallenging = ta.challenging.includes(codeB) || tb.challenging.includes(codeA);

  // --- 缘分值：维度互补/冲突打分 ---
  let s = 50;
  s += A[0] !== B[0] ? 8 : (A[0] === 'E' ? 5 : 7);            // 一动一静互补加分
  s += A[1] === B[1] ? 7 : 2;                                  // 探索节奏一致加分
  if (A[2] === 'T' && B[2] === 'T') s -= 6;                    // 双强势易冲突
  else if (A[2] !== B[2]) s += 8;                              // 强弱互补
  else s += 9;                                                 // 双温和最和平
  s += A[3] === B[3] ? 6 : 3;                                  // 作息一致加分
  if (isBest) s += 12;
  if (isChallenging) s -= 15;
  if (codeA === codeB) s = Math.max(s, 88);                    // 同类型彩蛋
  const score = Math.max(32, Math.min(99, Math.round(s)));

  // --- 称号 + 锐评（按特征分桶，命中即停） ---
  const eCat = A[0] === 'E' ? nameA : nameB;
  const iCat = A[0] === 'E' ? nameB : nameA;
  const tCat = A[2] === 'T' ? nameA : nameB;
  const fCat = A[2] === 'T' ? nameB : nameA;

  let title, line;
  if (codeA === codeB) {
    title = '镜像猫生';
    line = `${nameA}和${nameB}是同一个模子刻出来的${ta.name}。要么互相看不顺眼，要么组成全宇宙最默契的二猫组——没有中间态。`;
  } else if (isBest) {
    title = '天选搭子';
    line = `相性表上的官方认证组合。${ta.name}${nameA}和${tb.name}${nameB}，一个负责出主意，一个负责兜底，猫界模范搭档就是这样。`;
  } else if (isChallenging) {
    title = '欢喜冤家';
    line = `${nameA}和${nameB}是相性表上的红色警报。不过猫的世界里，追着打和一起玩只有一线之隔——先分碗分窝，来日方长。`;
  } else if (A[2] === 'T' && B[2] === 'T') {
    title = '王座之争';
    line = `两位都是当老大的料，一山难容二虎。给${nameA}和${nameB}备好两套碗、两个窝、两座猫爬架，划江而治，天下太平。`;
  } else if (A[0] === 'E' && B[0] === 'E') {
    title = '派对双子星';
    line = `${nameA}和${nameB}凑在一起，家里从此没有安静的下午。两只显眼包，家具的噩梦，主人的快乐源泉。`;
  } else if (A[0] === 'I' && B[0] === 'I' && A[2] === 'F' && B[2] === 'F') {
    title = '岁月静好';
    line = `一个在窗台，一个在沙发，同框但互不打扰——${nameA}和${nameB}会用猫界最高礼遇对待彼此：安静的陪伴。`;
  } else if (A[0] !== B[0]) {
    title = '一动一静';
    line = `${eCat}负责搞事，${iCat}负责围观。一个是台风眼，一个是气象台，看似不搭，其实意外互补。`;
  } else if (A[2] !== B[2]) {
    title = '猫界拿捏学';
    line = `表面上${tCat}说了算，实际上${fCat}用温柔把一切安排得明明白白。强势的那个，早就被拿捏了。`;
  } else if (A[1] === 'N' && B[1] === 'N') {
    title = '探险二人组';
    line = `${nameA}和${nameB}的好奇心加起来能拆掉半个家。快递箱要买两个，柜门要装锁，它们的地图上没有禁区。`;
  } else {
    title = '细水长流';
    line = `${nameA}和${nameB}不是天生一对，也谈不上冤家。给点时间、给点零食，猫的友谊比人类简单多了。`;
  }
  return { score, title, line };
}
