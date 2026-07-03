// ============================================================
// 猫咪MBTI · 数据层
// ============================================================

// --- 24 道题目 ---
const QUESTIONS = [
  // E/I 社交性 ×5
  { id: 1,  text: '家里来客人时，会躲到床底、衣柜或其他隐蔽角落', dim: 'EI', dir: -1 },
  { id: 2,  text: '听到门铃响或快递员敲门，会主动跑到门口迎接', dim: 'EI', dir: 1 },
  { id: 3,  text: '对第一次来家里的人，会反复犹豫要不要靠近', dim: 'EI', dir: -1 },
  { id: 4,  text: '家里人来人往也能淡定自若，该吃吃该睡睡', dim: 'EI', dir: 1 },
  { id: 5,  text: '搬家、换家具这些环境变化，它很快就能适应', dim: 'EI', dir: 1 },
  // S/N 好奇心 ×7
  { id: 6,  text: '快递箱一到家，它比你还急着钻进去探索', dim: 'SN', dir: 1 },
  { id: 7,  text: '买了新玩具或猫爬架，它会兴奋地研究很久', dim: 'SN', dir: 1 },
  { id: 8,  text: '突然的声响（吸尘器、吹风机、炒菜声）会把它吓得弹飞', dim: 'SN', dir: -1 },
  { id: 9,  text: '热衷于巡视家里每个角落，柜顶、窗台、洗衣机上面都是它的地盘', dim: 'SN', dir: 1 },
  { id: 10, text: '是个"开锁大师"——总能想办法打开柜门、推开房门或闯入禁区', dim: 'SN', dir: 1 },
  { id: 11, text: '经常在家里跑酷：飞奔、跳跃、扑击，精力旺盛', dim: 'SN', dir: 1 },
  { id: 12, text: '面对没见过的东西，第一反应是后退观望而不是凑上去闻', dim: 'SN', dir: -1 },
  // T/F 支配性 ×7
  { id: 13, text: '吃饭时不允许其他猫或宠物靠近它的碗', dim: 'TF', dir: 1 },
  { id: 14, text: '会欺负、追赶或压制家里其他猫或小动物', dim: 'TF', dir: 1 },
  { id: 15, text: '没有按时喂饭或者被忽视时，会大声叫唤甚至发脾气', dim: 'TF', dir: 1 },
  { id: 16, text: '喜欢按自己的节奏来，你叫它它不一定理你', dim: 'TF', dir: 1 },
  { id: 17, text: '遇到新的猫或动物时，会主动展示"老大"姿态', dim: 'TF', dir: 1 },
  { id: 18, text: '想要某样东西的时候非常执着，不达目的不罢休', dim: 'TF', dir: 1 },
  { id: 19, text: '看到其他猫或宠物被关注、被喂食，它会明显吃醋', dim: 'TF', dir: 1 },
  // J/P 规律性 ×5
  { id: 20, text: '作息非常规律，几点吃饭几点睡觉你都能猜到', dim: 'JP', dir: 1 },
  { id: 21, text: '做事之前会先观察和思考，不会贸然冲上去', dim: 'JP', dir: 1 },
  { id: 22, text: '经常有出乎意料的反应，你永远猜不到它下一步干什么', dim: 'JP', dir: -1 },
  { id: 23, text: '情绪变化很快，上一秒还在撒娇，下一秒就炸毛或咬人', dim: 'JP', dir: -1 },
  { id: 24, text: '注意力很短，一个玩具玩不了两分钟就去找别的了', dim: 'JP', dir: -1 },
];

const SCALE_LABELS = ['非常不符合', '不太符合', '不确定', '比较符合', '非常符合'];
const SCALE_EMOJI = ['🙀', '😾', '🐱', '😺', '😻'];

// --- 计分 ---
function calcScores(answers) {
  const dims = { EI: [], SN: [], TF: [], JP: [] };
  QUESTIONS.forEach((q, i) => {
    const raw = answers[i]; // 1-5
    if (raw == null) return;
    const score = q.dir === 1 ? raw : (6 - raw);
    dims[q.dim].push(score);
  });
  const pct = {};
  for (const [k, arr] of Object.entries(dims)) {
    const sum = arr.reduce((a, b) => a + b, 0);
    const max = arr.length * 5;
    pct[k] = max > 0 ? sum / max : 0.5;
  }
  return pct; // 0-1, higher = E/N/T/J side
}

function getTypeCode(scores) {
  return (
    (scores.EI >= 0.5 ? 'E' : 'I') +
    (scores.SN >= 0.5 ? 'N' : 'S') +
    (scores.TF >= 0.5 ? 'T' : 'F') +
    (scores.JP >= 0.5 ? 'J' : 'P')
  );
}

// --- 16 种类型 ---
const CAT_TYPES = {
  // ===== Mousers (SJ) 实干派 =====
  ESTJ: {
    name: '霸总猫', code: 'ESTJ', group: 'SJ', groupName: '实干派',
    tags: ['掌控全局', '雷厉风行', '精准守时', '不容置疑'],
    desc: '你家猫是天生的 CEO。它精确记住每天的喂食时间，误差不超过一分钟；它占据家里最好的位置，而且认为你的键盘、笔记本电脑都是它的专属座椅。规则？当然有——全是它定的。',
    quotes: ['"你的键盘现在归我了"', '"准时喂饭是基本的尊重"', '"这个家我说了算"', '"那个位子是我的，你坐错了"'],
    strengths: ['自信果断', '作息规律'],
    weaknesses: ['霸道专制', '领地意识过强'],
    bestMatch: ['ISTP', 'ISFP'],
    challenging: ['INFP', 'ESTP'],
  },
  ISTJ: {
    name: '管家猫', code: 'ISTJ', group: 'SJ', groupName: '实干派',
    tags: ['忠诚可靠', '一丝不苟', '默默守护', '谨小慎微'],
    desc: '你家猫是家里的隐形管家。它会巡视每个房间确保一切正常，会在你洗澡时蹲在门口"监督"，会对每一个新出现的物品进行全方位检查。别看它话不多，其实它操碎了心。',
    quotes: ['"人类需要我来监管，信我"', '"这个包裹我检查过了，安全"', '"你今天回来晚了3分钟"', '"门口有动静，我去看看"'],
    strengths: ['体贴细心', '忠诚不二'],
    weaknesses: ['胆小敏感', '管得太多'],
    bestMatch: ['ESTP', 'ESFP'],
    challenging: ['ENFP', 'ESTP'],
  },
  ESFJ: {
    name: '王子猫', code: 'ESFJ', group: 'SJ', groupName: '实干派',
    tags: ['天生贵族', '处变不惊', '优雅从容', '要求极高'],
    desc: '你家猫认为自己是皇室血统。它走路自带慢动作，吃饭要摆好姿势，对环境变化毫不在意——毕竟整个家都是它的王国。它会主动走向客人，不是因为热情，是来检阅的。',
    quotes: ['"所有东西其实都是朕的"', '"你可以摸我了，限时30秒"', '"这个罐头不配我的身份"', '"跪安吧"'],
    strengths: ['威严淡定', '适应力强'],
    weaknesses: ['傲慢挑剔', '喜怒无常'],
    bestMatch: ['ISTP', 'ISFP'],
    challenging: ['INTP', 'ESTP'],
  },
  ISFJ: {
    name: '学者猫', code: 'ISFJ', group: 'SJ', groupName: '实干派',
    tags: ['深度观察', '安静自信', '若即若离', '博学多识'],
    desc: '你家猫是一位沉默的观察家。它喜欢从高处俯瞰全局，在门框后偷看访客，安静地分析家里每个人的行为规律。它不需要太多互动，却比谁都了解你。',
    quotes: ['"我在门口观察就好"', '"你以为我在发呆？我在思考"', '"这个人上次来过，鞋子换了"', '"书架上的视角最佳"'],
    strengths: ['乖巧聪慧', '洞察力强'],
    weaknesses: ['过于冷淡', '让人猜不透'],
    bestMatch: ['ESTP', 'ESFP'],
    challenging: ['ENTP', 'ESTP'],
  },
  // ===== Alleycats (SP) 冒险派 =====
  ESTP: {
    name: '侦探猫', code: 'ESTP', group: 'SP', groupName: '冒险派',
    tags: ['好奇无限', '独立自主', '分析达人', '随时待命'],
    desc: '你家猫是家里的首席调查官。每一个新到的快递都要拆解检验，每一个声响都要追踪溯源，每一个角落都要定期排查。它对这个世界充满疑问，并且一定要亲自找到答案。',
    quotes: ['"洗衣机我检查过了，是安全的"', '"这个味道可疑，需要进一步调查"', '"柜子后面有东西，我听到了"', '"报告：阳台一切正常"'],
    strengths: ['独立聪明', '精力充沛'],
    weaknesses: ['多管闲事', '容易紧张'],
    bestMatch: ['ISTJ', 'ISFJ'],
    challenging: ['INFJ', 'ESTJ'],
  },
  ISTP: {
    name: '隐士猫', code: 'ISTP', group: 'SP', groupName: '冒险派',
    tags: ['神出鬼没', '深不可测', '灵性十足', '来去如风'],
    desc: '你家猫活在另一个次元。它能消失在你找不到的地方，又在你最意想不到的时刻出现在你身边。它似乎能感知到你看不到的东西，有时对着空气发呆，让你怀疑家里是否有平行世界的入口。',
    quotes: ['"我见过你不敢相信的东西"', '"那个缝隙里别有洞天"', '"消失是一种修行"', '"你找不到我，但我一直在看着你"'],
    strengths: ['感知敏锐', '充满灵性'],
    weaknesses: ['行踪不定', '过于神秘'],
    bestMatch: ['ESTJ', 'ESFJ'],
    challenging: ['ENFJ', 'ESTJ'],
  },
  ESFP: {
    name: '叛逆猫', code: 'ESFP', group: 'SP', groupName: '冒险派',
    tags: ['不走寻常路', '创意无限', '活力四射', '规则克星'],
    desc: '你家猫是一个天生的反叛者。你说不能上桌，它偏要上；你关上门，它能想办法打开。它会把你的头绳变成最好的玩具，把纸巾卷变成世界上最刺激的猎物。对它来说，规则就是用来打破的。',
    quotes: ['"没有我打不开的门"', '"规则是用来挑战的"', '"你说不行？那我偏要试试"', '"无聊才是最大的敌人"'],
    strengths: ['自立自强', '创造力强'],
    weaknesses: ['不服管教', '搞破坏'],
    bestMatch: ['ISTJ', 'ISFJ'],
    challenging: ['INTJ', 'ESTJ'],
  },
  ISFP: {
    name: '跟班猫', code: 'ISFP', group: 'SP', groupName: '冒险派',
    tags: ['忠实伙伴', '勇敢探险', '温暖贴心', '永不缺席'],
    desc: '你家猫是你最忠实的小跟班。你去厨房它跟着，你去卫生间它也跟着，你坐下来它就跳到你腿上。它可能不是最聪明的，但一定是最有爱的——而且摔倒了一定会假装是故意的。',
    quotes: ['"刚才那个摔跤完全是故意的"', '"你去哪我就去哪"', '"蹭蹭就是我的表白方式"', '"我才不是黏人，我是在保护你"'],
    strengths: ['温暖友善', '活力充沛'],
    weaknesses: ['过度依赖', '有点冲动'],
    bestMatch: ['ESTJ', 'ESFJ'],
    challenging: ['ENTJ', 'ESTJ'],
  },
  // ===== Tomcats (NT) 策略派 =====
  INTJ: {
    name: '科学家猫', code: 'INTJ', group: 'NT', groupName: '策略派',
    tags: ['冷静分析', '条理清晰', '深度思考', '独来独往'],
    desc: '你家猫是家里的首席科学家。它会花半小时观察水龙头滴水的规律，会用爪子精确地测试物品的边缘，会记住家里每个人的行为模式。它不是在发呆，它是在建模。',
    quotes: ['"观察完毕，我去书架上了"', '"这个数据需要更多样本"', '"水龙头的滴水频率变了"', '"你的行为模式今天出现了异常"'],
    strengths: ['观察入微', '条理分明'],
    weaknesses: ['略显固执', '社交冷淡'],
    bestMatch: ['ENFJ', 'ENFP'],
    challenging: ['ESFP', 'ESTJ'],
  },
  INTP: {
    name: '影子猫', code: 'INTP', group: 'NT', groupName: '策略派',
    tags: ['低调潜行', '内心柔软', '深居简出', '安静陪伴'],
    desc: '你家猫是家里最神秘的存在。客人在时它消失得无影无踪，人一走它就从某个不可能的角落冒出来。它怕这个世界的大部分东西，但一旦信任你，就会在深夜轻轻靠在你脚边。',
    quotes: ['"衣柜是我的快乐老家"', '"等人都走了我再出来"', '"外面太可怕了，我选择被窝"', '"你不动我就假装你是家具，安全"'],
    strengths: ['温柔细腻', '让人着迷'],
    weaknesses: ['过度隐居', '难以捉摸'],
    bestMatch: ['ENFJ', 'ENFP'],
    challenging: ['ESFJ', 'ESTJ'],
  },
  ENTJ: {
    name: '独裁猫', code: 'ENTJ', group: 'NT', groupName: '策略派',
    tags: ['绝对权威', '目标明确', '高效执行', '专横跋扈'],
    desc: '你家猫认为这个家是它的独裁王国。它要求独享所有资源，吃饭必须第一个，沙发最好的位置永远是它的。它的叫声不是在撒娇，是在下达命令。不服？那就叫得更大声。',
    quotes: ['"先喂我，别的以后再说"', '"我饿了=全世界都欠我的"', '"这个位置有人？让开"', '"叫一声是通知，叫三声是最后通牒"'],
    strengths: ['气场强大', '表达能力强'],
    weaknesses: ['饿了就暴躁', '嗓门太大'],
    bestMatch: ['INFJ', 'INFP'],
    challenging: ['ISFP', 'ESTJ'],
  },
  ENTP: {
    name: '黑帮猫', code: 'ENTP', group: 'NT', groupName: '策略派',
    tags: ['深藏不露', '老谋深算', '意图不明', '出其不意'],
    desc: '你家猫有着可疑的意图和周密的计划。它会花三天时间研究零食柜的锁，会在半夜发出诡异的声响，会用无辜的眼神看你——就在它刚打翻你杯子的5秒之后。它是家里最像黑帮老大的存在。',
    quotes: ['"我们有办法让你乖乖喂我"', '"这个柜子的锁，我已经研究三天了"', '"是我干的，但你没有证据"', '"一切尽在掌握之中"'],
    strengths: ['聪明有趣', '不可预测'],
    weaknesses: ['诡计多端', '偶尔暴躁'],
    bestMatch: ['INFJ', 'INFP'],
    challenging: ['ISFJ', 'ESTJ'],
  },
  // ===== Housecats (NF) 艺术派 =====
  INFJ: {
    name: '面包师猫', code: 'INFJ', group: 'NF', groupName: '艺术派',
    tags: ['温暖治愈', '踩奶大师', '安静陪伴', '忠诚专一'],
    desc: '你家猫是一位温柔的面包师——因为它无时无刻不在踩奶。你的肚子、毛毯、枕头，甚至空气，都是它的"面团"。它存在的意义似乎就是让你感到安心，是家里最治愈的存在。',
    quotes: ['"我做了这个面包……给你的"', '"让我再踩两下，马上就好"', '"你不开心？我来给你暖暖"', '"这条毯子的柔软度，9分"'],
    strengths: ['忠诚温暖', '治愈人心'],
    weaknesses: ['过于安静', '有点粘人'],
    bestMatch: ['ENTJ', 'ENTP'],
    challenging: ['ESTP', 'ESTJ'],
  },
  INFP: {
    name: '迷糊猫', code: 'INFP', group: 'NF', groupName: '艺术派',
    tags: ['佛系人生', '天然呆萌', '随遇而安', '活在梦里'],
    desc: '你家猫活在自己的小世界里。它一天能睡18个小时，醒着的时间也在放空。它可能会对着墙壁发呆一小时，也可能因为一颗猫薄荷球而疯跑全场。它是快乐的，虽然你永远不知道它在想什么。',
    quotes: ['"叫我吃晚饭的时候再叫醒我"', '"刚才发生了什么？我没注意"', '"猫薄荷！猫薄荷！起飞！"', '"这里不错，就在这睡吧"'],
    strengths: ['随和佛系', '天然有趣'],
    weaknesses: ['经常放空', '笨手笨脚'],
    bestMatch: ['ENTJ', 'ENTP'],
    challenging: ['ESTJ', 'ISTJ'],
  },
  ENFJ: {
    name: '戏精猫', code: 'ENFJ', group: 'NF', groupName: '艺术派',
    tags: ['万众瞩目', '表演天才', '不甘寂寞', '黏人大王'],
    desc: '你家猫是天生的演员。它会在你面前翻肚皮求关注，会用各种声调叫唤直到你看它，会在你工作时精准地挡住屏幕。它的人生目标只有一个：成为你注意力的唯一焦点。',
    quotes: ['"只要能坐下，就一定是你的键盘上"', '"你在看手机？看我！"', '"我表演一个翻肚皮，鼓掌"', '"什么叫个人空间？没听说过"'],
    strengths: ['表达丰富', '热情洋溢'],
    weaknesses: ['过度粘人', '有点贪吃'],
    bestMatch: ['INTJ', 'INTP'],
    challenging: ['ISTP', 'ESTJ'],
  },
  ENFP: {
    name: '小丑猫', code: 'ENFP', group: 'NF', groupName: '艺术派',
    tags: ['快乐源泉', '社交达人', '永远惊喜', '制造混乱'],
    desc: '你家猫是家里的首席喜剧官。它会用最离奇的姿势睡觉，会从匪夷所思的地方掉下来，会追着自己的尾巴转圈然后晕倒。跟它在一起永远不会无聊——但你的家可能会经常一团糟。',
    quotes: ['"保持饥渴，保持愚蠢"', '"那个塑料袋侮辱了我，我必须消灭它"', '"从柜子上掉下来？那是特技表演"', '"social！social！新朋友！"'],
    strengths: ['搞笑有趣', '社交能力强'],
    weaknesses: ['制造混乱', '让人筋疲力尽'],
    bestMatch: ['INTJ', 'INTP'],
    challenging: ['ISTJ', 'ESTJ'],
  },
};

// --- 类型组信息 ---
const TYPE_GROUPS = {
  SJ: { name: '实干派', icon: '🐭', color: '#e07a3f', desc: '务实、忠诚、维护秩序的猫', types: ['ESTJ','ISTJ','ESFJ','ISFJ'] },
  SP: { name: '冒险派', icon: '🐈', color: '#3f9e77', desc: '好奇、独立、渴望自由的猫', types: ['ESTP','ISTP','ESFP','ISFP'] },
  NT: { name: '策略派', icon: '🐅', color: '#d95757', desc: '有战略、有决断、掌控全局的猫', types: ['INTJ','INTP','ENTJ','ENTP'] },
  NF: { name: '艺术派', icon: '🏠', color: '#5b8fd9', desc: '敏感、温暖、活在当下的猫', types: ['INFJ','INFP','ENFJ','ENFP'] },
};

// --- SVG 猫咪简笔画 ---
function catSVG(typeCode) {
  const cats = {
    ESTJ: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <!-- 霸总猫: 坐姿+皇冠+严肃脸 -->
      <g fill="none" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <!-- 皇冠 -->
        <path d="M70 58 L75 42 L85 52 L100 38 L115 52 L125 42 L130 58Z" fill="#fbbf24" stroke="#f59e0b"/>
        <!-- 头 -->
        <ellipse cx="100" cy="80" rx="35" ry="28" fill="#faf9f6"/>
        <!-- 耳朵 -->
        <path d="M70 68 L62 42 L82 60" fill="#faf9f6"/>
        <path d="M130 68 L138 42 L118 60" fill="#faf9f6"/>
        <path d="M68 64 L64 46 L80 58" stroke="#f0abfc" fill="#f0abfc" opacity="0.3"/>
        <path d="M132 64 L136 46 L120 58" stroke="#f0abfc" fill="#f0abfc" opacity="0.3"/>
        <!-- 眼睛: 严厉眯眯眼 -->
        <line x1="82" y1="78" x2="95" y2="78"/>
        <line x1="105" y1="78" x2="118" y2="78"/>
        <circle cx="88" cy="77" r="1.5" fill="#7c3aed"/>
        <circle cx="112" cy="77" r="1.5" fill="#7c3aed"/>
        <!-- 鼻子+嘴 -->
        <path d="M97 86 L100 89 L103 86" fill="#f0abfc"/>
        <path d="M100 89 L100 93"/>
        <path d="M95 93 Q100 97 105 93"/>
        <!-- 胡须 -->
        <line x1="72" y1="85" x2="90" y2="88"/>
        <line x1="72" y1="90" x2="90" y2="90"/>
        <line x1="128" y1="85" x2="110" y2="88"/>
        <line x1="128" y1="90" x2="110" y2="90"/>
        <!-- 身体 -->
        <path d="M72 105 Q70 150 85 165 Q100 172 115 165 Q130 150 128 105" fill="#faf9f6"/>
        <!-- 前爪 -->
        <ellipse cx="82" cy="165" rx="8" ry="5" fill="#faf9f6"/>
        <ellipse cx="118" cy="165" rx="8" ry="5" fill="#faf9f6"/>
        <!-- 尾巴 -->
        <path d="M128 140 Q155 130 148 110" stroke-width="3"/>
      </g>
    </svg>`,
    ISTJ: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <!-- 管家猫: 站姿+围裙+认真眼 -->
      <g fill="none" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <ellipse cx="100" cy="72" rx="32" ry="26" fill="#faf9f6"/>
        <path d="M72 62 L65 38 L84 54" fill="#faf9f6"/>
        <path d="M128 62 L135 38 L116 54" fill="#faf9f6"/>
        <path d="M70 58 L67 42 L82 52" stroke="#f0abfc" fill="#f0abfc" opacity="0.3"/>
        <path d="M130 58 L133 42 L118 52" stroke="#f0abfc" fill="#f0abfc" opacity="0.3"/>
        <!-- 大圆眼: 认真 -->
        <circle cx="88" cy="70" r="6" fill="white" stroke="#7c3aed"/>
        <circle cx="112" cy="70" r="6" fill="white" stroke="#7c3aed"/>
        <circle cx="90" cy="69" r="3" fill="#7c3aed"/>
        <circle cx="114" cy="69" r="3" fill="#7c3aed"/>
        <circle cx="91" cy="68" r="1" fill="white"/>
        <circle cx="115" cy="68" r="1" fill="white"/>
        <path d="M97 80 L100 83 L103 80" fill="#f0abfc"/>
        <path d="M100 83 L100 86"/>
        <path d="M96 86 Q100 89 104 86"/>
        <line x1="73" y1="76" x2="86" y2="78"/>
        <line x1="127" y1="76" x2="114" y2="78"/>
        <!-- 身体+围裙 -->
        <path d="M74 95 Q72 140 86 158 Q100 165 114 158 Q128 140 126 95" fill="#faf9f6"/>
        <path d="M80 115 Q100 108 120 115 L118 155 Q100 162 82 155Z" fill="#e9d5ff" opacity="0.5"/>
        <ellipse cx="86" cy="158" rx="7" ry="5" fill="#faf9f6"/>
        <ellipse cx="114" cy="158" rx="7" ry="5" fill="#faf9f6"/>
        <path d="M126 130 Q145 125 150 140 Q152 150 145 155" stroke-width="3"/>
      </g>
    </svg>`,
    ESFJ: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <!-- 王子猫: 优雅坐姿+闭眼高贵 -->
      <g fill="none" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <ellipse cx="100" cy="78" rx="34" ry="27" fill="#faf9f6"/>
        <path d="M70 66 L63 40 L83 58" fill="#faf9f6"/>
        <path d="M130 66 L137 40 L117 58" fill="#faf9f6"/>
        <path d="M68 62 L65 44 L81 56" stroke="#f0abfc" fill="#f0abfc" opacity="0.3"/>
        <path d="M132 62 L135 44 L119 56" stroke="#f0abfc" fill="#f0abfc" opacity="0.3"/>
        <!-- 小皇冠 -->
        <path d="M88 53 L91 45 L97 50 L100 42 L103 50 L109 45 L112 53" fill="#fbbf24" stroke="#f59e0b" stroke-width="1.5"/>
        <!-- 闭眼:优雅 -->
        <path d="M83 76 Q88 72 95 76"/>
        <path d="M105 76 Q112 72 117 76"/>
        <path d="M97 84 L100 87 L103 84" fill="#f0abfc"/>
        <path d="M96 90 Q100 93 104 90"/>
        <line x1="74" y1="82" x2="88" y2="83"/>
        <line x1="126" y1="82" x2="112" y2="83"/>
        <path d="M72 102 Q70 148 85 162 Q100 170 115 162 Q130 148 128 102" fill="#faf9f6"/>
        <ellipse cx="85" cy="162" rx="8" ry="5" fill="#faf9f6"/>
        <ellipse cx="115" cy="162" rx="8" ry="5" fill="#faf9f6"/>
        <path d="M128 135 Q152 128 155 145 Q154 158 145 160" stroke-width="3"/>
      </g>
    </svg>`,
    ISFJ: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <!-- 学者猫: 坐在书上+眼镜+好奇歪头 -->
      <g fill="none" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <!-- 书 -->
        <rect x="60" y="155" width="80" height="15" rx="2" fill="#ddd6fe" stroke="#7c3aed"/>
        <rect x="65" y="142" width="70" height="15" rx="2" fill="#e9d5ff" stroke="#7c3aed"/>
        <!-- 头(微歪) -->
        <ellipse cx="102" cy="78" rx="32" ry="26" fill="#faf9f6" transform="rotate(-5 102 78)"/>
        <path d="M74 66 L65 42 L84 56" fill="#faf9f6"/>
        <path d="M128 70 L138 44 L118 60" fill="#faf9f6"/>
        <!-- 眼镜 -->
        <circle cx="88" cy="76" r="8" fill="none" stroke="#7c3aed" stroke-width="1.5"/>
        <circle cx="112" cy="76" r="8" fill="none" stroke="#7c3aed" stroke-width="1.5"/>
        <line x1="96" y1="76" x2="104" y2="76" stroke-width="1.5"/>
        <circle cx="90" cy="75" r="3" fill="#7c3aed"/>
        <circle cx="114" cy="75" r="3" fill="#7c3aed"/>
        <circle cx="91" cy="74" r="1" fill="white"/>
        <circle cx="115" cy="74" r="1" fill="white"/>
        <path d="M97 86 L100 89 L103 86" fill="#f0abfc"/>
        <path d="M100 89 L100 91"/>
        <path d="M97 91 Q100 94 103 91"/>
        <line x1="72" y1="82" x2="80" y2="82"/>
        <line x1="128" y1="82" x2="120" y2="82"/>
        <path d="M76 100 Q74 138 86 142 Q100 148 114 142 Q126 138 124 100" fill="#faf9f6"/>
        <ellipse cx="86" cy="142" rx="7" ry="5" fill="#faf9f6"/>
        <ellipse cx="114" cy="142" rx="7" ry="5" fill="#faf9f6"/>
        <path d="M124 125 Q140 118 142 130" stroke-width="3"/>
      </g>
    </svg>`,
    ESTP: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <!-- 侦探猫: 蹲姿+放大镜+警觉耳朵 -->
      <g fill="none" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <ellipse cx="100" cy="78" rx="32" ry="26" fill="#faf9f6"/>
        <!-- 耳朵(竖起警觉) -->
        <path d="M72 66 L60 35 L84 56" fill="#faf9f6"/>
        <path d="M128 66 L140 35 L116 56" fill="#faf9f6"/>
        <path d="M70 62 L63 40 L82 54" stroke="#f0abfc" fill="#f0abfc" opacity="0.3"/>
        <path d="M130 62 L137 40 L118 54" stroke="#f0abfc" fill="#f0abfc" opacity="0.3"/>
        <!-- 眼: 一大一小(怀疑) -->
        <circle cx="87" cy="74" r="7" fill="white" stroke="#7c3aed"/>
        <circle cx="113" cy="74" r="5" fill="white" stroke="#7c3aed"/>
        <circle cx="89" cy="73" r="3.5" fill="#7c3aed"/>
        <circle cx="114" cy="73" r="2.5" fill="#7c3aed"/>
        <path d="M97 85 L100 88 L103 85" fill="#f0abfc"/>
        <path d="M100 88 L100 90"/>
        <path d="M97 90 L100 93 L103 90"/>
        <line x1="72" y1="80" x2="80" y2="80"/>
        <line x1="72" y1="84" x2="82" y2="84"/>
        <line x1="128" y1="80" x2="120" y2="80"/>
        <!-- 身体(蹲) -->
        <path d="M74 98 Q68 135 80 155 Q90 162 100 160 Q110 162 120 155 Q132 135 126 98" fill="#faf9f6"/>
        <ellipse cx="85" cy="158" rx="8" ry="5" fill="#faf9f6"/>
        <ellipse cx="115" cy="158" rx="8" ry="5" fill="#faf9f6"/>
        <!-- 放大镜 -->
        <circle cx="148" cy="125" r="12" stroke-width="2"/>
        <line x1="138" y1="134" x2="125" y2="148" stroke-width="3"/>
        <!-- 尾巴 -->
        <path d="M68 140 Q50 128 48 110" stroke-width="3"/>
      </g>
    </svg>`,
    ISTP: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <!-- 隐士猫: 半隐藏在箱子后+神秘眼 -->
      <g fill="none" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <!-- 箱子 -->
        <rect x="40" y="110" width="120" height="70" rx="4" fill="#fef3c7" stroke="#d97706"/>
        <line x1="40" y1="125" x2="160" y2="125" stroke="#d97706"/>
        <!-- 半露头 -->
        <path d="M75 110 Q75 78 100 72 Q125 78 125 110" fill="#faf9f6"/>
        <!-- 耳朵 -->
        <path d="M78 95 L70 72 L88 88" fill="#faf9f6"/>
        <path d="M122 95 L130 72 L112 88" fill="#faf9f6"/>
        <!-- 神秘大眼(发光) -->
        <circle cx="90" cy="98" r="7" fill="#e9d5ff"/>
        <circle cx="110" cy="98" r="7" fill="#e9d5ff"/>
        <circle cx="90" cy="98" r="4" fill="#7c3aed"/>
        <circle cx="110" cy="98" r="4" fill="#7c3aed"/>
        <circle cx="92" cy="96" r="1.5" fill="white"/>
        <circle cx="112" cy="96" r="1.5" fill="white"/>
        <!-- 搭在箱子边缘的爪子 -->
        <path d="M82 110 L82 118" stroke-width="3"/>
        <path d="M78 118 L86 118" stroke-width="2"/>
        <path d="M118 110 L118 118" stroke-width="3"/>
        <path d="M114 118 L122 118" stroke-width="2"/>
      </g>
    </svg>`,
    ESFP: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <!-- 叛逆猫: 弓背+炸毛+咧嘴笑 -->
      <g fill="none" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <!-- 头 -->
        <ellipse cx="80" cy="82" rx="30" ry="25" fill="#faf9f6"/>
        <path d="M55 72 L45 48 L66 62" fill="#faf9f6"/>
        <path d="M105 72 L115 48 L95 62" fill="#faf9f6"/>
        <!-- 眼: 星星眼(兴奋) -->
        <path d="M68 78 L70 74 L72 78 L76 76 L74 80 L78 82 L74 84 L76 88 L72 86 L70 90 L68 86 L64 88 L66 84 L62 82 L66 80 L64 76Z" fill="#fbbf24" stroke="none"/>
        <path d="M88 78 L90 74 L92 78 L96 76 L94 80 L98 82 L94 84 L96 88 L92 86 L90 90 L88 86 L84 88 L86 84 L82 82 L86 80 L84 76Z" fill="#fbbf24" stroke="none"/>
        <path d="M77 94 L80 97 L83 94" fill="#f0abfc"/>
        <path d="M72 100 Q80 106 88 100"/>
        <line x1="50" y1="86" x2="62" y2="86"/>
        <line x1="98" y1="86" x2="110" y2="86"/>
        <!-- 弓背身体 -->
        <path d="M105 82 Q130 60 155 85 Q165 110 155 140" fill="#faf9f6" stroke-width="3"/>
        <!-- 炸毛 -->
        <path d="M118 65 L120 55" stroke-width="2"/>
        <path d="M130 60 L134 50" stroke-width="2"/>
        <path d="M140 62 L146 54" stroke-width="2"/>
        <!-- 腿 -->
        <path d="M65 105 L60 160" stroke-width="3"/>
        <path d="M95 100 L100 160" stroke-width="3"/>
        <path d="M140 110 L138 160" stroke-width="3"/>
        <path d="M155 115 L158 160" stroke-width="3"/>
        <!-- 尾巴(竖直炸毛) -->
        <path d="M155 140 Q165 110 160 85" stroke-width="3"/>
        <line x1="158" y1="90" x2="165" y2="85" stroke-width="2"/>
        <line x1="160" y1="95" x2="168" y2="92" stroke-width="2"/>
      </g>
    </svg>`,
    ISFP: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <!-- 跟班猫: 蹭腿姿势+爱心眼 -->
      <g fill="none" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <!-- 人的腿(简笔) -->
        <rect x="125" y="30" width="25" height="170" rx="8" fill="#e5e5e5" stroke="none"/>
        <!-- 头(侧面蹭) -->
        <ellipse cx="95" cy="100" rx="30" ry="25" fill="#faf9f6" transform="rotate(10 95 100)"/>
        <path d="M70 88 L58 66 L78 80" fill="#faf9f6"/>
        <path d="M115 85 L128 66 L108 78" fill="#faf9f6"/>
        <!-- 爱心眼 -->
        <path d="M82 96 C80 92 74 92 74 96 C74 100 82 104 82 104 C82 104 90 100 90 96 C90 92 84 92 82 96Z" fill="#f472b6" stroke="none"/>
        <path d="M105 94 C103 90 97 90 97 94 C97 98 105 102 105 102 C105 102 113 98 113 94 C113 90 107 90 105 94Z" fill="#f472b6" stroke="none"/>
        <path d="M92 108 L95 111 L98 108" fill="#f0abfc"/>
        <path d="M89 114 Q95 118 101 114"/>
        <line x1="68" y1="104" x2="80" y2="106"/>
        <line x1="108" y1="102" x2="118" y2="100"/>
        <!-- 身体(侧蹭) -->
        <path d="M78 122 Q70 155 82 168 Q95 175 108 168 Q120 155 118 122" fill="#faf9f6"/>
        <ellipse cx="85" cy="168" rx="7" ry="5" fill="#faf9f6"/>
        <ellipse cx="108" cy="168" rx="7" ry="5" fill="#faf9f6"/>
        <!-- 尾巴(开心翘起) -->
        <path d="M70 145 Q48 135 45 115 Q44 105 50 100" stroke-width="3"/>
      </g>
    </svg>`,
    INTJ: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <!-- 科学家猫: 坐姿+思考泡泡 -->
      <g fill="none" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <!-- 思考泡泡 -->
        <circle cx="148" cy="42" r="15" fill="white" stroke="#c4b5fd"/>
        <circle cx="135" cy="60" r="5" fill="white" stroke="#c4b5fd"/>
        <circle cx="128" cy="68" r="3" fill="white" stroke="#c4b5fd"/>
        <text x="142" y="47" font-size="14" fill="#7c3aed" text-anchor="middle" stroke="none">?!</text>
        <!-- 头 -->
        <ellipse cx="100" cy="82" rx="32" ry="26" fill="#faf9f6"/>
        <path d="M72 70 L64 46 L84 62" fill="#faf9f6"/>
        <path d="M128 70 L136 46 L116 62" fill="#faf9f6"/>
        <!-- 眼: 半眯(思考) -->
        <path d="M82 78 Q88 74 95 78" stroke-width="2"/>
        <path d="M105 78 Q112 74 118 78" stroke-width="2"/>
        <circle cx="88" cy="79" r="1.5" fill="#7c3aed"/>
        <circle cx="112" cy="79" r="1.5" fill="#7c3aed"/>
        <path d="M97 88 L100 91 L103 88" fill="#f0abfc"/>
        <path d="M100 91 L100 94"/>
        <path d="M96 94 Q100 96 104 94"/>
        <line x1="72" y1="84" x2="82" y2="84"/>
        <line x1="128" y1="84" x2="118" y2="84"/>
        <!-- 身体 -->
        <path d="M74 106 Q72 148 86 162 Q100 170 114 162 Q128 148 126 106" fill="#faf9f6"/>
        <!-- 前爪抱胸 -->
        <path d="M80 130 Q90 125 100 130 Q110 125 120 130" stroke-width="2"/>
        <ellipse cx="86" cy="162" rx="7" ry="5" fill="#faf9f6"/>
        <ellipse cx="114" cy="162" rx="7" ry="5" fill="#faf9f6"/>
        <path d="M126 140 Q145 135 148 120" stroke-width="3"/>
      </g>
    </svg>`,
    INTP: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <!-- 影子猫: 缩在角落+大大的怯眼 -->
      <g fill="none" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <!-- 角落阴影 -->
        <path d="M160 30 L160 180 L30 180" stroke="#e5e5e5" stroke-width="1"/>
        <path d="M160 30 L160 180 L30 180Z" fill="#f5f3ff" opacity="0.3"/>
        <!-- 缩小的身体(团成一团) -->
        <ellipse cx="120" cy="140" rx="30" ry="25" fill="#faf9f6"/>
        <!-- 头(缩着) -->
        <ellipse cx="115" cy="115" rx="25" ry="22" fill="#faf9f6"/>
        <path d="M94 104 L86 82 L102 98" fill="#faf9f6"/>
        <path d="M133 104 L140 82 L126 98" fill="#faf9f6"/>
        <!-- 超大怯生生的眼睛 -->
        <circle cx="106" cy="112" r="8" fill="white"/>
        <circle cx="126" cy="112" r="8" fill="white"/>
        <circle cx="108" cy="113" r="5" fill="#7c3aed"/>
        <circle cx="128" cy="113" r="5" fill="#7c3aed"/>
        <circle cx="110" cy="111" r="2" fill="white"/>
        <circle cx="130" cy="111" r="2" fill="white"/>
        <path d="M113 122 L115 124 L117 122" fill="#f0abfc"/>
        <path d="M115 124 L115 126"/>
        <path d="M112 126 Q115 128 118 126"/>
        <!-- 尾巴绕身体 -->
        <path d="M148 140 Q160 145 155 155 Q148 165 130 168 Q110 170 95 162" stroke-width="3"/>
      </g>
    </svg>`,
    ENTJ: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <!-- 独裁猫: 张嘴大叫+怒眉 -->
      <g fill="none" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <!-- 音波 -->
        <path d="M140 65 Q150 60 148 70" stroke="#f472b6" stroke-width="1.5"/>
        <path d="M148 62 Q160 55 157 72" stroke="#f472b6" stroke-width="1.5"/>
        <path d="M155 58 Q170 48 165 75" stroke="#f472b6" stroke-width="1.5"/>
        <ellipse cx="100" cy="80" rx="34" ry="28" fill="#faf9f6"/>
        <path d="M70 68 L60 40 L84 58" fill="#faf9f6"/>
        <path d="M130 68 L140 40 L116 58" fill="#faf9f6"/>
        <!-- 怒眉 -->
        <line x1="78" y1="68" x2="92" y2="72" stroke-width="2.5"/>
        <line x1="108" y1="72" x2="122" y2="68" stroke-width="2.5"/>
        <circle cx="87" cy="78" r="5" fill="white"/>
        <circle cx="113" cy="78" r="5" fill="white"/>
        <circle cx="88" cy="77" r="3" fill="#7c3aed"/>
        <circle cx="114" cy="77" r="3" fill="#7c3aed"/>
        <!-- 大张嘴 -->
        <path d="M88 92 Q100 108 112 92" fill="#f472b6"/>
        <path d="M92 92 L95 96 L100 92 L105 96 L108 92" fill="#faf9f6" stroke="none"/>
        <line x1="68" y1="84" x2="80" y2="84"/>
        <line x1="68" y1="88" x2="78" y2="88"/>
        <line x1="132" y1="84" x2="120" y2="84"/>
        <path d="M72 106 Q70 150 86 165 Q100 172 114 165 Q130 150 128 106" fill="#faf9f6"/>
        <ellipse cx="86" cy="165" rx="8" ry="5" fill="#faf9f6"/>
        <ellipse cx="114" cy="165" rx="8" ry="5" fill="#faf9f6"/>
        <path d="M128 140 Q150 132 152 118" stroke-width="3"/>
      </g>
    </svg>`,
    ENTP: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <!-- 黑帮猫: 眯眼+墨镜掀起+爪子搭食物 -->
      <g fill="none" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <ellipse cx="100" cy="78" rx="33" ry="27" fill="#faf9f6"/>
        <path d="M71 66 L62 40 L84 56" fill="#faf9f6"/>
        <path d="M129 66 L138 40 L116 56" fill="#faf9f6"/>
        <!-- 墨镜(掀到额头) -->
        <path d="M78 62 Q100 58 122 62" stroke="#333" stroke-width="1.5"/>
        <ellipse cx="85" cy="60" rx="8" ry="5" fill="#333" stroke="none" opacity="0.7"/>
        <ellipse cx="115" cy="60" rx="8" ry="5" fill="#333" stroke="none" opacity="0.7"/>
        <!-- 眯眼(算计) -->
        <line x1="82" y1="78" x2="96" y2="78" stroke-width="2"/>
        <line x1="104" y1="78" x2="118" y2="78" stroke-width="2"/>
        <circle cx="89" cy="77" r="1.5" fill="#7c3aed"/>
        <circle cx="111" cy="77" r="1.5" fill="#7c3aed"/>
        <path d="M97 86 L100 89 L103 86" fill="#f0abfc"/>
        <path d="M100 89 L100 92"/>
        <path d="M94 92 Q100 96 106 92"/>
        <line x1="70" y1="83" x2="82" y2="83"/>
        <line x1="130" y1="83" x2="118" y2="83"/>
        <!-- 身体 -->
        <path d="M74 102 Q72 146 86 160 Q100 167 114 160 Q128 146 126 102" fill="#faf9f6"/>
        <!-- 爪子搭在零食罐上 -->
        <ellipse cx="60" cy="162" rx="15" ry="12" fill="#fef3c7" stroke="#d97706"/>
        <text x="60" y="166" font-size="10" fill="#d97706" text-anchor="middle" stroke="none">零食</text>
        <path d="M78 145 Q65 148 60 152" stroke-width="2.5"/>
        <ellipse cx="114" cy="162" rx="7" ry="5" fill="#faf9f6"/>
        <path d="M126 135 Q148 128 150 115" stroke-width="3"/>
      </g>
    </svg>`,
    INFJ: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <!-- 面包师猫: 趴着踩奶+满足闭眼 -->
      <g fill="none" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <!-- 毯子/枕头 -->
        <ellipse cx="100" cy="155" rx="60" ry="20" fill="#e9d5ff" stroke="#c4b5fd"/>
        <!-- 趴着的身体 -->
        <ellipse cx="100" cy="130" rx="40" ry="22" fill="#faf9f6"/>
        <!-- 头 -->
        <ellipse cx="100" cy="95" rx="28" ry="24" fill="#faf9f6"/>
        <path d="M76 84 L68 60 L86 76" fill="#faf9f6"/>
        <path d="M124 84 L132 60 L114 76" fill="#faf9f6"/>
        <path d="M74 80 L70 64 L84 74" stroke="#f0abfc" fill="#f0abfc" opacity="0.3"/>
        <path d="M126 80 L130 64 L116 74" stroke="#f0abfc" fill="#f0abfc" opacity="0.3"/>
        <!-- 满足闭眼+微笑 -->
        <path d="M85 92 Q90 88 95 92"/>
        <path d="M105 92 Q110 88 115 92"/>
        <path d="M97 100 L100 103 L103 100" fill="#f0abfc"/>
        <path d="M93 106 Q100 112 107 106"/>
        <line x1="72" y1="98" x2="82" y2="98"/>
        <line x1="128" y1="98" x2="118" y2="98"/>
        <!-- 前爪(踩奶动作) -->
        <path d="M72 135 L68 148" stroke-width="3"/>
        <path d="M128 135 L132 148" stroke-width="3"/>
        <path d="M65 148 Q68 152 72 148" stroke-width="2"/>
        <path d="M129 148 Q132 152 136 148" stroke-width="2"/>
        <!-- 爱心 -->
        <path d="M100 70 C98 66 92 66 92 70 C92 74 100 78 100 78 C100 78 108 74 108 70 C108 66 102 66 100 70Z" fill="#f472b6" stroke="none" opacity="0.6"/>
      </g>
    </svg>`,
    INFP: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <!-- 迷糊猫: 四脚朝天翻肚皮+迷糊表情 -->
      <g fill="none" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <!-- 身体(仰面) -->
        <ellipse cx="100" cy="115" rx="38" ry="30" fill="#faf9f6"/>
        <!-- 白肚皮 -->
        <ellipse cx="100" cy="118" rx="22" ry="18" fill="white" stroke="#e5e5e5" stroke-width="1"/>
        <!-- 头(上方) -->
        <ellipse cx="100" cy="72" rx="28" ry="24" fill="#faf9f6"/>
        <path d="M76 62 L68 38 L86 54" fill="#faf9f6"/>
        <path d="M124 62 L132 38 L114 54" fill="#faf9f6"/>
        <!-- 迷糊眼(不同大小+螺旋) -->
        <circle cx="88" cy="70" r="6" fill="white"/>
        <circle cx="112" cy="70" r="7" fill="white"/>
        <path d="M88 70 Q86 67 88 65 Q90 67 88 70" fill="#7c3aed" stroke="none"/>
        <circle cx="112" cy="70" r="3" fill="#7c3aed"/>
        <circle cx="113" cy="69" r="1" fill="white"/>
        <path d="M97 80 L100 83 L103 80" fill="#f0abfc"/>
        <path d="M96 86 Q100 82 104 86"/>
        <line x1="72" y1="76" x2="82" y2="76"/>
        <line x1="128" y1="76" x2="118" y2="76"/>
        <!-- 四脚朝天 -->
        <path d="M68 100 L55 85" stroke-width="3"/>
        <path d="M132 100 L145 85" stroke-width="3"/>
        <path d="M75 138 L62 155" stroke-width="3"/>
        <path d="M125 138 L138 155" stroke-width="3"/>
        <circle cx="55" cy="83" r="4" fill="#faf9f6"/>
        <circle cx="145" cy="83" r="4" fill="#faf9f6"/>
        <circle cx="62" cy="157" r="4" fill="#faf9f6"/>
        <circle cx="138" cy="157" r="4" fill="#faf9f6"/>
        <!-- Zzz -->
        <text x="140" y="55" font-size="14" fill="#c4b5fd" stroke="none">Z</text>
        <text x="150" y="45" font-size="11" fill="#c4b5fd" stroke="none">z</text>
        <text x="157" y="38" font-size="8" fill="#c4b5fd" stroke="none">z</text>
      </g>
    </svg>`,
    ENFJ: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <!-- 戏精猫: 站立+张开前爪求抱+大眼 -->
      <g fill="none" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <ellipse cx="100" cy="68" rx="30" ry="25" fill="#faf9f6"/>
        <path d="M74 56 L65 32 L84 48" fill="#faf9f6"/>
        <path d="M126 56 L135 32 L116 48" fill="#faf9f6"/>
        <!-- 超大星星眼(渴望关注) -->
        <circle cx="88" cy="66" r="8" fill="white"/>
        <circle cx="112" cy="66" r="8" fill="white"/>
        <circle cx="90" cy="65" r="4.5" fill="#7c3aed"/>
        <circle cx="114" cy="65" r="4.5" fill="#7c3aed"/>
        <circle cx="92" cy="63" r="2" fill="white"/>
        <circle cx="116" cy="63" r="2" fill="white"/>
        <path d="M97 78 L100 81 L103 78" fill="#f0abfc"/>
        <path d="M100 81 L100 83"/>
        <path d="M94 83 Q100 88 106 83"/>
        <line x1="68" y1="72" x2="78" y2="72"/>
        <line x1="132" y1="72" x2="122" y2="72"/>
        <!-- 身体 -->
        <path d="M78 90 Q75 135 88 155 Q100 162 112 155 Q125 135 122 90" fill="#faf9f6"/>
        <!-- 张开的前爪(求抱) -->
        <path d="M78 100 Q55 85 48 95" stroke-width="3"/>
        <path d="M45 92 Q48 88 52 92" stroke-width="2"/>
        <path d="M122 100 Q145 85 152 95" stroke-width="3"/>
        <path d="M148 92 Q152 88 156 92" stroke-width="2"/>
        <ellipse cx="90" cy="158" rx="7" ry="5" fill="#faf9f6"/>
        <ellipse cx="110" cy="158" rx="7" ry="5" fill="#faf9f6"/>
        <!-- 小心心 -->
        <path d="M50 78 C49 76 46 76 46 78 C46 80 50 82 50 82 C50 82 54 80 54 78 C54 76 51 76 50 78Z" fill="#f472b6" stroke="none"/>
        <path d="M150 78 C149 76 146 76 146 78 C146 80 150 82 150 82 C150 82 154 80 154 78 C154 76 151 76 150 78Z" fill="#f472b6" stroke="none"/>
      </g>
    </svg>`,
    ENFP: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <!-- 小丑猫: 追尾巴转圈+吐舌 -->
      <g fill="none" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <!-- 运动线 -->
        <path d="M42 100 Q30 80 42 60" stroke="#c4b5fd" stroke-width="1.5" stroke-dasharray="4 3"/>
        <path d="M158 100 Q170 80 158 60" stroke="#c4b5fd" stroke-width="1.5" stroke-dasharray="4 3"/>
        <!-- 头(微歪) -->
        <ellipse cx="100" cy="78" rx="30" ry="25" fill="#faf9f6" transform="rotate(8 100 78)"/>
        <path d="M74 66 L65 42 L84 58" fill="#faf9f6"/>
        <path d="M124 66 L135 42 L116 58" fill="#faf9f6"/>
        <!-- 一大一小眼+吐舌 -->
        <circle cx="88" cy="74" r="7" fill="white"/>
        <circle cx="112" cy="74" r="6" fill="white"/>
        <circle cx="90" cy="73" r="4" fill="#7c3aed"/>
        <circle cx="113" cy="73" r="3" fill="#7c3aed"/>
        <circle cx="91" cy="72" r="1.5" fill="white"/>
        <circle cx="114" cy="72" r="1" fill="white"/>
        <path d="M97 84 L100 87 L103 84" fill="#f0abfc"/>
        <path d="M96 89 Q100 92 104 89"/>
        <!-- 吐舌头 -->
        <ellipse cx="100" cy="94" rx="4" ry="5" fill="#f472b6" stroke="#e11d48" stroke-width="1"/>
        <line x1="68" y1="80" x2="78" y2="80"/>
        <line x1="132" y1="80" x2="122" y2="80"/>
        <!-- 身体(动态跑姿) -->
        <ellipse cx="100" cy="128" rx="30" ry="22" fill="#faf9f6" transform="rotate(-5 100 128)"/>
        <!-- 前后腿(跑姿) -->
        <path d="M76 140 L60 162" stroke-width="3"/>
        <path d="M88 145 L80 168" stroke-width="3"/>
        <path d="M115 140 L130 160" stroke-width="3"/>
        <path d="M122 142 L140 155" stroke-width="3"/>
        <!-- 尾巴(它在追的) -->
        <path d="M128 120 Q155 105 160 120 Q162 140 145 150 Q130 155 120 148" stroke-width="3" stroke="#7c3aed"/>
        <!-- 星星特效 -->
        <text x="55" y="55" font-size="16" fill="#fbbf24" stroke="none">✦</text>
        <text x="145" y="50" font-size="12" fill="#fbbf24" stroke="none">✦</text>
        <text x="40" y="130" font-size="10" fill="#fbbf24" stroke="none">✦</text>
      </g>
    </svg>`,
  };
  // 统一把原紫色系换成暖棕墨线 + 粉橙点缀（贴纸手绘风）
  const svg = cats[typeCode] || cats.ENFP;
  return svg
    .replaceAll('#7c3aed', '#46342a')   // 墨线 & 瞳孔 → 深棕
    .replaceAll('#f0abfc', '#ff9db5')   // 鼻子/耳内 → 蜜桃粉
    .replaceAll('#faf9f6', '#fffdf8')   // 身体填色 → 奶白
    .replaceAll('#e9d5ff', '#ffe3c2')   // 道具浅紫 → 浅杏
    .replaceAll('#ddd6fe', '#ffd9a8')   // 书本紫 → 杏黄
    .replaceAll('#c4b5fd', '#e0b98a')   // 线条浅紫 → 浅棕
    .replaceAll('#f5f3ff', '#fff4e0');  // 背景紫白 → 奶油
}
