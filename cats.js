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
  { id: 13, text: '吃饭时护食——你的手或其他宠物靠近它的碗，它会挡开、哈气或加速吞咽', dim: 'TF', dir: 1 },
  { id: 14, text: '和你或其他宠物玩闹时出手没轻没重，玩着玩着就动真格', dim: 'TF', dir: 1 },
  { id: 15, text: '没有按时喂饭或者被忽视时，会大声叫唤甚至发脾气', dim: 'TF', dir: 1 },
  { id: 16, text: '只要你呼唤它、摸摸它，它基本都会温和地回应你', dim: 'TF', dir: -1 },
  { id: 17, text: '见到陌生的猫——不管是现实里、窗外还是屏幕里的——会炸毛、哈气或上爪，摆出强势姿态', dim: 'TF', dir: 1 },
  { id: 18, text: '想要某样东西的时候非常执着，不达目的不罢休', dim: 'TF', dir: 1 },
  { id: 19, text: '你的注意力在别处时（手机、电脑、客人或别的宠物），它会强行挤进来打断你', dim: 'TF', dir: 1 },
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
    // 归一化到 0-1，且"不确定"(3分) 恰好落在 0.5 中线，避免中庸作答整体偏向高分侧
    pct[k] = arr.length > 0 ? (sum - arr.length) / (arr.length * 4) : 0.5;
  }
  return pct; // 0-1, higher = E/N/T/J side
}

function getTypeCode(scores) {
  // 平局（正好 0.5）判给温和侧 I/S/F/P，避免中庸作答集中到强势类型
  return (
    (scores.EI > 0.5 ? 'E' : 'I') +
    (scores.SN > 0.5 ? 'N' : 'S') +
    (scores.TF > 0.5 ? 'T' : 'F') +
    (scores.JP > 0.5 ? 'J' : 'P')
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

// --- 猫咪头像图片（16型猫咪头像 PNG）---
const CAT_IMG_FILES = {
  ESTJ: '霸总猫·ESTJ·三花猫',
  ISTJ: '管家猫·ISTJ·英短蓝猫',
  ESFJ: '王子猫·ESFJ·白猫',
  ISFJ: '学者猫·ISFJ·英短蓝白',
  ESTP: '侦探猫·ESTP·美短',
  ISTP: '隐士猫·ISTP·狸花猫',
  ESFP: '叛逆猫·ESFP·无毛猫',
  ISFP: '跟班猫·ISFP·布偶猫',
  INTJ: '科学家猫·INTJ·玄猫',
  INTP: '影子猫·INTP·玄猫',
  ENTJ: '独裁猫·ENTJ·橘猫',
  ENTP: '黑帮猫·ENTP·狸花猫',
  INFJ: '面包师猫·INFJ·金渐层',
  INFP: '迷糊猫·INFP·加菲猫',
  ENFJ: '戏精猫·ENFJ·暹罗猫',
  ENFP: '小丑猫·ENFP·奶牛猫',
};

// 资源基路径：根据 cats.js 的加载位置自动推断
// 根版页面得到 "16型猫咪头像/"，v2 版页面得到 "../16型猫咪头像/"
const CAT_IMG_BASE = (function () {
  try {
    const cur = document.currentScript && document.currentScript.src;
    if (cur) return cur.replace(/[^/]*$/, '') + '16型猫咪头像/';
  } catch (e) { /* ignore */ }
  return '16型猫咪头像/';
})();

// 返回类型对应的头像图片 URL（供 canvas / img 共用）
function catImgSrc(typeCode) {
  const code = CAT_IMG_FILES[typeCode] ? typeCode : 'ENFP';
  return CAT_IMG_BASE + encodeURIComponent(CAT_IMG_FILES[code]) + '.png';
}

// 返回 <img> 标签（函数名沿用 catSVG 以兼容全部调用点）
function catSVG(typeCode) {
  const code = CAT_IMG_FILES[typeCode] ? typeCode : 'ENFP';
  return '<img class="cat-pic" src="' + catImgSrc(code) + '" alt="' + CAT_IMG_FILES[code] + '" draggable="false">';
}
