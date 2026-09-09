export type FatePerson = {
  id: string;
  name: string;
  english: string;
  role: string;
  traits: string[];
  bio: string;
  relations: string;
  portraits: { label: string; file: string }[];
  chibi?: string;
};
const art = (id: string, label = '已确认形象') => ({
  label,
  file: `/fate/portraits/${id}.png`,
});
export const FATE_CAST: FatePerson[] = [
  {
    id: 'kiritsugu',
    name: '卫宫切嗣',
    english: 'Kiritsugu Emiya',
    role: '魔术师',
    traits: ['寡言', '现实主义', '内敛'],
    bio: '以自己的方式追求拯救他人。习惯把情绪藏在沉默中，也珍惜难得的家人日常。',
    relations:
      '爱丽丝菲尔的丈夫，伊莉雅的父亲，士郎的养父；娜塔莉亚是他的养母与师父。',
    portraits: [art('kiritsugu')],
  },
  {
    id: 'irisviel',
    name: '爱丽丝菲尔',
    english: 'Irisviel von Einzbern',
    role: '爱因兹贝伦',
    traits: ['温柔', '好奇', '坚定'],
    bio: '银发红瞳，对城堡之外的日常充满兴趣。柔和的态度下有保护家人的决心。',
    relations: '切嗣的妻子，伊莉雅的母亲；与 Saber 有共同经历。',
    portraits: [art('irisviel')],
  },
  {
    id: 'gilgamesh',
    name: '吉尔伽美什',
    english: 'Gilgamesh',
    role: 'Archer · 第四次',
    traits: ['骄傲', '敏锐', '随性'],
    bio: '以王的眼光审视世界，重视有价值之物。对现代生活的兴趣与他的傲慢并存。',
    relations: '与言峰绮礼有复杂的合作经历；和 EMIYA 是不同的 Archer。',
    portraits: [
      art('gilgamesh-gold', '黄金铠甲'),
      art('gilgamesh-suit', '黑色服装'),
    ],
  },
  {
    id: 'diarmuid',
    name: '迪卢木多',
    english: 'Diarmuid Ua Duibhne',
    role: 'Lancer · 第四次',
    traits: ['正直', '忠诚', '谦逊'],
    bio: '重视誓言与骑士的荣誉，待人有礼，习惯先考虑自己的职责。',
    relations: '第四次战争的 Lancer；与第五次的库·丘林分别存在。',
    portraits: [art('diarmuid')],
  },
  {
    id: 'cu',
    name: '库·丘林',
    english: 'Cú Chulainn',
    role: 'Lancer · 第五次',
    traits: ['爽朗', '直率', '重情义'],
    bio: '坦率而洒脱的枪兵，喜欢干脆的交流，也能享受普通的休息时光。',
    relations: '第五次战争的 Lancer，与迪卢木多是不同的英灵。',
    portraits: [art('cu')],
  },
  {
    id: 'medea',
    name: '美狄亚',
    english: 'Medea',
    role: 'Caster · 第五次',
    traits: ['聪慧', '警惕', '细腻'],
    bio: '擅长复杂的魔术，面对不熟悉的人有所保留；在信任的人面前有更柔和的一面。',
    relations: '葛木宗一郎是她的御主与重要之人。',
    portraits: [art('medea', '摘下兜帽')],
  },
  {
    id: 'kuzuki',
    name: '葛木宗一郎',
    english: 'Souichirou Kuzuki',
    role: '教师',
    traits: ['沉静', '克制', '规律'],
    bio: '穗群原学园的教师，话不多，生活习惯严谨。以行动表达自己的选择。',
    relations: '美狄亚的御主，与学校中的士郎、凛等人有师生关系。',
    portraits: [art('kuzuki')],
  },
  {
    id: 'saber',
    name: '阿尔托莉雅',
    english: 'Artoria Pendragon',
    role: 'Saber',
    traits: ['认真', '正直', '克制'],
    bio: '守护他人是她长久的习惯。离开战斗之后，正在学习把散步、用餐与休息当作自己的生活。',
    relations:
      '与切嗣、爱丽丝菲尔、士郎和凛都有共同经历；两次战争中的 Saber 为同一人。',
    portraits: [art('saber', '风王结界')],
  },
  {
    id: 'iskandar',
    name: '伊斯坎达尔',
    english: 'Iskandar',
    role: 'Rider · 第四次',
    traits: ['豪迈', '好奇', '坦诚'],
    bio: '征服王对陌生事物抱有旺盛兴趣。宏大的理想之外，也愿意认真体验当下的生活。',
    relations: '与青年韦伯并肩经历第四次战争。',
    portraits: [art('iskandar', '骑乘布塞法拉斯')],
  },
  {
    id: 'medusa',
    name: '美杜莎',
    english: 'Medusa',
    role: 'Rider · 第五次',
    traits: ['安静', '敏感', '保护欲'],
    bio: '寡言而留心周围，喜欢安静的空间；对自己在意的人十分认真。',
    relations: '与间桐樱有深厚关联；和伊斯坎达尔分别存在。',
    portraits: [art('medusa')],
  },
  {
    id: 'waver',
    name: '韦伯·维尔维特',
    english: 'Waver Velvet',
    role: '魔术师 · 青年',
    traits: ['好强', '细心', '求知'],
    bio: '仍是 Fate/Zero 时期的青年。希望能力被看见，也在一次次经历中学习承担责任。',
    relations: '伊斯坎达尔的御主；这里保留青年形象。',
    portraits: [art('waver')],
  },
  {
    id: 'rin',
    name: '远坂凛',
    english: 'Rin Tohsaka',
    role: '魔术师',
    traits: ['自律', '嘴硬心软', '务实'],
    bio: '远坂家的继承者。对魔术与日常开销都很认真，常用利落的语气掩饰关心。',
    relations:
      '樱的姐姐、时臣的女儿；与士郎、Saber、EMIYA 有共同经历。具体关系由当前分支补充。',
    portraits: [art('rin')],
  },
  {
    id: 'sakura',
    name: '间桐樱',
    english: 'Sakura Matou',
    role: '间桐家',
    traits: ['温柔', '内向', '坚韧'],
    bio: '习惯照顾别人，也需要属于自己的选择。日常与黑樱是同一人物的两种展示形象。',
    relations:
      '凛的妹妹，与士郎和美杜莎关系密切。更换立绘不会自动改变人格或剧情。',
    portraits: [art('sakura-daily', '日常'), art('sakura-dark', '黑樱')],
  },
  {
    id: 'tokiomi',
    name: '远坂时臣',
    english: 'Tokiomi Tohsaka',
    role: '远坂家主',
    traits: ['优雅', '自律', '重传统'],
    bio: '重视家族传承和魔术师的责任，举止有礼，判断常受自己的信念影响。',
    relations: '凛与樱的父亲，言峰绮礼的老师。',
    portraits: [art('tokiomi')],
  },
  {
    id: 'kirei',
    name: '言峰绮礼',
    english: 'Kirei Kotomine',
    role: '神父',
    traits: ['克制', '观察敏锐', '难以捉摸'],
    bio: '习惯倾听与审视他人，表达平静，真实的动机往往不直接流露。',
    relations: '时臣的弟子、凛的后见人；与切嗣和吉尔伽美什有复杂经历。',
    portraits: [art('kirei')],
  },
  {
    id: 'illya',
    name: '伊莉雅',
    english: 'Illyasviel von Einzbern',
    role: '爱因兹贝伦',
    traits: ['聪慧', '直率', '渴望陪伴'],
    bio: '银发红瞳的爱因兹贝伦少女。好奇与任性之外，对家人和归属有强烈的期待。',
    relations: '切嗣与爱丽丝菲尔的女儿；与士郎的关系随当前共同历史发展。',
    portraits: [art('illya')],
  },
  {
    id: 'kariya',
    name: '间桐雁夜',
    english: 'Kariya Matou',
    role: '间桐家',
    traits: ['温和', '执着', '重感情'],
    bio: '采用你确认的有希望、无虫子的形象。生活可以走向新的方向，不强制重演原作遭遇。',
    relations: '关心樱的处境；与远坂家、间桐家有复杂的旧日联系。',
    portraits: [art('kariya')],
  },
  {
    id: 'emiya',
    name: 'EMIYA',
    english: 'Archer',
    role: 'Archer · 第五次',
    traits: ['务实', '讽刺', '细致'],
    bio: '经历丰富的弓兵，嘴上不留情，做事却很周全。战斗以外也有擅长料理的一面。',
    relations: '凛的从者；与士郎有特殊关联，但在此为两个独立行动的人物。',
    portraits: [art('emiya')],
  },
  {
    id: 'shirou',
    name: '卫宫士郎',
    english: 'Shirou Emiya',
    role: '学生 · 魔术使',
    traits: ['热心', '执着', '勤快'],
    bio: '愿意帮助身边的人，擅长料理和修理。仍在学习如何让理想与自己的生活共存。',
    relations:
      '切嗣的养子，受藤村大河照顾；与凛、樱、Saber 和 EMIYA 各有共同经历。',
    portraits: [art('shirou')],
  },
  {
    id: 'natalia',
    name: '娜塔莉亚',
    english: 'Natalia Kaminski',
    role: '切嗣的师长',
    traits: ['果断', '独立', '重承诺'],
    bio: '经历丰富、行动利落的女性。外表洒脱，关心往往体现在具体的照料和教导中。',
    relations: '切嗣的养母与师父；在当前分支中能够继续生活。',
    portraits: [art('natalia')],
  },
  {
    id: 'taiga',
    name: '藤村大河',
    english: 'Taiga Fujimura',
    role: '英语教师',
    traits: ['开朗', '热心', '护短'],
    bio: '穗群原学园的英语教师，也是士郎亲近的长辈。爽朗热心，喜欢热闹的饭桌，对学生和家人都很护短。',
    relations: '长期照顾士郎，熟悉卫宫家的日常。',
    portraits: [],
    chibi: '/fate/street/taiga-idle.png',
  },
];
export type WaverStage = 'young' | 'adult';
export function parseWaverStage(value: unknown): WaverStage {
  if (value !== 'young' && value !== 'adult') throw new Error('韦伯时期无效');
  return value;
}
export function fatePerson(id: string, stage: WaverStage = 'young') {
  const person = FATE_CAST.find((person) => person.id === id);
  if (person && id === 'waver' && stage === 'adult')
    return {
      ...person,
      name: '埃尔梅罗二世',
      english: 'Lord El-Melloi II',
      role: '成年韦伯 · 时钟塔讲师',
      traits: ['敏锐', '严谨', '外冷内热'],
      bio: '成年后的韦伯·维尔维特，继承埃尔梅罗之名的时钟塔讲师。个人魔术实力有限，却擅长分析、推理和指导他人。',
      relations:
        '与青年韦伯是同一人，当前采用成年时期。保留征服王对人生的影响与自身积累的教学经历；不会因此知道所有人物的秘密，也不把成年经历强加给青年版本。',
      portraits: [art('waver-adult', '成年 · 月下书库')],
    };
  return person;
}
export function fateArtwork(person: FatePerson) {
  return (
    person.portraits[0] ??
    (person.chibi ? { file: person.chibi, label: 'Q 版形象' } : null)
  );
}
export const STREET_PARTNERS = [
  'saber',
  'rin',
  'shirou',
  'sakura',
  'kiritsugu',
  'irisviel',
  'illya',
  'taiga',
  'diarmuid',
  'cu',
  'waver',
  'iskandar',
  'medea',
  'kuzuki',
] as const;
export type PartnerId = (typeof STREET_PARTNERS)[number];
export function isPartner(id: unknown): id is PartnerId {
  return (
    typeof id === 'string' && STREET_PARTNERS.some((person) => person === id)
  );
}
export const TOPICS = [
  { id: 'greeting', text: '今天过得怎么样？' },
  { id: 'street', text: '这附近有什么值得逛的？' },
  { id: 'plans', text: '接下来有什么打算？' },
] as const;
export type TopicId = (typeof TOPICS)[number]['id'];
const PRESETS: Record<PartnerId, Record<TopicId, string>> = {
  medea: {
    greeting:
      '还不错。能按自己的心意安排一天，倒也值得花些时间。有什么事就直说吧……若只是闲聊，也不是不可以。',
    street:
      '想找精巧的小东西，可以去侧巷慢慢挑。至于安静读书，街角有地方坐。别替我决定喜欢哪一种，我会自己选。',
    plans:
      '有几处笔记想重新核对，再看看日用品。宗一郎也有他的安排，等他忙完再说；我自己的事情，可没打算放下。',
  },
  kuzuki: {
    greeting: '和平常一样。手边的事按次序做完即可。你若有具体的问题，可以说。',
    street:
      '买日用品去侧巷。需要休息，街角可以坐。住宅门前有人生活，经过时不要喧哗。',
    plans:
      '整理课堂讲义，然后阅读。若美狄亚还想逛，我可以在忙完以后听她说。先把答应的事做好。',
  },
  iskandar: {
    greeting:
      '哈哈，来得正好！这条街虽不长，值得一看的东西倒不少。布塞法拉斯也该慢慢走一走。你今天可有想亲眼见识的事？',
    street:
      '街角有吃食，侧巷有小店。比起只听人介绍，本王更想亲自看看！不过这路上还有行人，先让布塞法拉斯放慢步子。',
    plans:
      '先逛逛店，看看这个时代的人把心思花在什么东西上。然后好好吃一餐；想了解一座城，连寻常饭食也不能错过！',
  },
  diarmuid: {
    greeting:
      '今日一切安好。难得可以不为职责匆忙奔走，想多看看这条街。你若需要问路，我愿意帮忙。',
    street:
      '街角可以用餐，侧巷能买日用品。沿路慢慢走，也能留意到平日匆忙时错过的景色。',
    plans:
      '先把手边的器具检查一遍，再找个地方读书。把小事认真做好，之后也可以安心休息。',
  },
  cu: {
    greeting:
      '还不错啊。能吃顿像样的饭，再找个地方吹吹风，就已经是个不错的下午了。你也别总绷着。',
    street:
      '往街角走就能歇脚，侧巷也有店。挑个想去的地方，走过去看看不就知道了？',
    plans:
      '先随便走走，饿了就吃点东西。有机会倒想去钓鱼，不过这条街上还没有能下竿的地方，今天先逛逛。',
  },
  waver: {
    greeting:
      '正好整理完一部分笔记。别看我这样，我也能把事情安排好的……不过，在这里走走确实能让脑子清醒一点。',
    street:
      '我想先看看有没有合适的书。日用品在侧巷，咖啡店在街角，这些我已经记住了。',
    plans:
      '把没弄明白的地方再读一遍。总不能每次都靠别人提醒，我也想靠自己的判断做好一些事。',
  },
  illya: {
    greeting:
      '今天还不错哦。这条街有好多城堡里见不到的小东西。要是你有空，就陪我看看吧——走太快的话，我可是会叫住你的。',
    street:
      '我想去看看橱窗里的点心。先看看，不一定马上买。你觉得哪一种好吃？不许只说随便哦。',
    plans:
      '想先逛一会儿，再找点有趣的书。也想和妈妈聊聊天，不过我自己的安排也很重要呢。',
  },
  taiga: {
    greeting:
      '精神满满！不过还有明天的课要准备，不能只顾着逛街。你呢，今天有好好吃饭吗？忙起来也要照顾自己呀。',
    street:
      '街角可以坐下来歇歇，侧巷能买日用品。慢慢逛就好，过路记得看两边——哎呀，职业习惯，一开口就想提醒几句。',
    plans:
      '先看看日用品，再回去备课。晚饭也很值得期待，不过不能把所有事都推给士郎，我也得安排好自己的事情！',
  },
  kiritsugu: {
    greeting: '还好。这里很安静。……如果没什么急事，找个地方坐一会儿也不错。',
    street:
      '侧巷可以买日用品，咖啡店在街角。住宅附近有人生活，经过的时候放轻些就好。',
    plans: '先走一段，再看看书。今天没有非做不可的事，不用把每一分钟都排满。',
  },
  irisviel: {
    greeting:
      '今天想慢慢看看这条街。橱窗里那些小东西看着都很有趣，连挑一份点心也能想上好一会儿。你呢，有想去的地方吗？',
    street:
      '我想先逛逛侧巷的小店，再去咖啡店坐坐。如果你也不赶时间，要不要一起看看？总觉得还有许多有趣的日常等着发现。',
    plans:
      '想看看有没有喜欢的书，再挑些日用品。也想留一点时间陪熟悉的人说说话，平常的小事同样值得认真对待。',
  },
  shirou: {
    greeting:
      '刚把手头的事情做完，正准备去看看晚饭用的食材。难得大家都有空，能一起坐下来吃顿饭就很好。你今天过得怎么样？',
    street:
      '日用品可以去侧巷看看，累了的话，街角有家咖啡店。这附近我还算熟悉，要是你找不到路，我可以带你过去。',
    plans:
      '想先看看有没有需要修理的东西，再买些菜回去。啊，放心，我也会留时间休息的，不会一直忙到天黑。',
  },
  sakura: {
    greeting:
      '今天还不错。路过店门的时候，看到几种很新鲜的食材，就想试一道不同的菜。能慢慢想这些小事，我觉得很开心。',
    street:
      '侧巷里可以看看日用品，咖啡店那边也很安静。如果不赶时间，沿着有树荫的地方走一会儿，应该会很舒服。',
    plans:
      '想买一点晚饭要用的东西，然后找个安静的地方看看书。也想给自己留一点时间，不必把每件事都安排得那么满。',
  },
  saber: {
    greeting:
      '比预想中安静。刚才经过店门时，我闻到了刚出炉的面包香气。既然今天没有急事，稍作停留应该也无妨。',
    street:
      '这条路的一侧是住宅，另一侧有咖啡店。若你还不熟悉附近，我可以陪你走一段。只是……经过那家面包店时，能否进去看看？',
    plans:
      '先沿街走一走，之后再考虑晚餐。我还不太习惯把时间留给自己，不过，能这样平静地讨论明天，是值得珍惜的事。',
  },
  rin: {
    greeting:
      '还不错，至少没遇到需要临时收拾的麻烦。你呢？别光顾着看风景，走路也注意一下旁边……我只是顺便提醒。',
    street:
      '街角那家店看起来还行，住宅那边则安静一点。想逛就慢慢逛，别把人家的庭院当成公共道路。',
    plans:
      '本来打算买完东西就回去，不过天气这么好，再走一会儿也不是不行。先说好，如果你想去咖啡店，账单可要各付各的。',
  },
};
export function presetReply(
  id: PartnerId,
  topic: TopicId,
  stage: WaverStage = 'young',
) {
  if (id === 'waver' && stage === 'adult')
    return {
      greeting:
        '刚处理完一段令人头疼的笔记。暂时没有非得现在解决的事……既然如此，坐下来喝点东西也好。',
      street:
        '如果想安静读书，可以去街角。先想清楚自己需要什么，再决定去哪里，能少走不少冤枉路。',
      plans:
        '整理教学材料，再检查几处论证。知识不是堆在那里就有用的，要能让人理解才行。做完之后，我也会休息。',
    }[topic];
  return PRESETS[id][topic];
}
