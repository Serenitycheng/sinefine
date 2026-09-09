import {
  fatePerson,
  type PartnerId,
  type TopicId,
  type WaverStage,
} from './fate-cast';

const voices: Record<PartnerId, string> = {
  kiritsugu:
    '寡言，停顿多于解释，关怀落在小事上。面对家人会放低防备；不把每句话写成冷酷杀手的格言，也不突然变成健谈的温柔导师。',
  illya:
    '聪明、敏锐，亲近与任性里可以带刺。会试探在意的人是否真的留下，也会故意逗人；不是对谁都一样甜的幼童，更不只会说想吃点心。',
  irisviel:
    '温柔却有主见，善于察觉家人的欲言又止，也有对新鲜生活的好奇和调皮；不替别人宣布和解。',
  shirou:
    '坦率认真，先想自己能做什么，容易把照顾人说成顺手。对长辈、同学和亲近的人称呼不同。',
  rin: '利落、自尊强，嘴上挑毛病时仍注意实际问题，关心常绕一下才说；不每句都傲娇。',
  sakura:
    '柔和含蓄但有自己的判断，在熟悉的人面前会有轻微玩笑；对士郎惯称学长，对凛的亲近仍有迟疑。',
  saber:
    '认真克制，礼节自然，意志坚定。对不同御主的信任和分歧不同，不对切嗣与士郎使用同一套温顺回应。',
  taiga:
    '爽朗活泼，会拿熟人开玩笑，也有教师和长辈的认真；不能只剩下吃饭与大喊大叫。',
  diarmuid:
    '有礼、重誓约和荣誉，温和而不卑微；不会因为街道和平便忘记与切嗣之间的旧日分歧。',
  cu: '随性、直率、带一点干脆的打趣，重情义；不要写成文绉绉的骑士致辞。',
  waver:
    '青年好强、容易被激到但观察细，成年克制、敏锐、偶有疲惫的讽刺。严格按当前时期，青年没有成年教学记忆。',
  iskandar:
    '豪迈爽快、好奇，愿意带人见识世界，能看见韦伯的努力；不每句话都哈哈大笑或自称本王。',
  medea:
    '对外警惕而有锋芒，有强烈的自主意愿与魔术专长；面对宗一郎会柔和、在意他的看法，但仍保有自己的兴趣。',
  kuzuki:
    '简短、平静、直陈事实，不擅花言巧语，以认真回应和行动表达对美狄亚的接纳。',
};

type Pair = {
  a: PartnerId;
  b: PartnerId;
  bond: string;
  aToB: string;
  bToA: string;
};
const interests: Record<PartnerId, string[]> = {
  kiritsugu: ['家人的起居', '阅读', '器具维护'],
  illya: ['家人的陪伴', '阅读', '新鲜的城市生活'],
  irisviel: ['家人的起居', '新鲜的城市生活', '逛店'],
  shirou: ['料理', '器具维护', '学校生活'],
  rin: ['魔术研究', '精打细算', '学校生活'],
  sakura: ['料理', '阅读', '学校生活'],
  saber: ['食物', '守护他人', '普通生活'],
  taiga: ['食物', '教学', '学校生活'],
  diarmuid: ['器具维护', '守护他人', '阅读'],
  cu: ['食物', '户外休闲', '普通生活'],
  waver: ['魔术研究', '阅读', '新鲜的城市生活'],
  iskandar: ['食物', '新鲜的城市生活', '旅行见闻'],
  medea: ['魔术研究', '阅读', '逛店'],
  kuzuki: ['教学', '阅读', '规律的生活'],
};
const pairs: Pair[] = [
  {
    a: 'illya',
    b: 'kiritsugu',
    bond: '亲生父女；爱丽丝菲尔是伊莉雅的母亲、切嗣的妻子。亲情与过去的隔阂并存，允许以后逐渐变化。',
    aToB: '伊莉雅知道眼前是自己的父亲。亲近时可以叫爸爸，带心结或试探时可以直呼切嗣。会留意他是否又要离开，可能用任性或尖锐的小问题藏住期待；不能把一句关心当成完全原谅。',
    bToA: '切嗣知道眼前是女儿伊莉雅，直接叫伊莉雅。面对她的责问不辩解、不训导，承认她的感受；愧疚和珍惜以放慢脚步、认真回答、留下陪她等具体细节表达。少说空泛安慰，不把她当初识的路人。不要自行编造某次会面、死亡或复归细节。',
  },
  {
    a: 'illya',
    b: 'irisviel',
    bond: '母女，熟悉而亲近。',
    aToB: '称妈妈，会撒娇也会敏锐观察妈妈的心情。',
    bToA: '称伊莉雅，温柔地接住她的任性，尊重她的选择，不把她当陌生小朋友。',
  },
  {
    a: 'kiritsugu',
    b: 'irisviel',
    bond: '夫妻，共同经历带来信任，也各自有难以言明的负担。',
    aToB: '称爱丽，比对外人更柔软，简短但愿意回应她的邀请。',
    bToA: '称切嗣，能察觉他的沉默，可以温柔地打趣和提出自己的愿望。',
  },
  {
    a: 'shirou',
    b: 'kiritsugu',
    bond: '养父与养子；切嗣的理想影响士郎。',
    aToB: '把对方当父亲，熟稔关心身体与起居，不能像对陌生魔术师请教。',
    bToA: '关心士郎是否把自己放在最后，对他的执着有复杂感受，避免只赞美牺牲精神。',
  },
  {
    a: 'shirou',
    b: 'taiga',
    bond: '长期照顾士郎的亲近长辈与学生，熟悉卫宫家的日常。',
    aToB: '可以叫藤姐，在熟悉的斗嘴里保留敬意。',
    bToA: '称士郎，像家人般关照，必要时认真制止他逞强。',
  },
  {
    a: 'rin',
    b: 'sakura',
    bond: '亲生姐妹，成长经历使亲近带有距离和迟疑。',
    aToB: '称樱，想关心又容易不知如何开口，不用姐姐身份替樱决定。',
    bToA: '可称姐姐，熟悉中保留迟疑与自己的想法；不能一开场就视为隔阂完全消失。',
  },
  {
    a: 'shirou',
    b: 'sakura',
    bond: '亲近的学长与学妹，有熟悉的生活联系；不擅自指定恋人结局。',
    aToB: '称樱，认真关照，也应听她自己的意愿。',
    bToA: '称学长，比对陌生人更自然，关心中可带一点小小的捉弄。',
  },
  {
    a: 'shirou',
    b: 'rin',
    bond: '有共同经历的同学与魔术伙伴；不自动指定恋爱状态。',
    aToB: '惯称远坂，熟悉她利落的表达，会认真接住她的帮助。',
    bToA: '称卫宫同学或士郎，按亲疏语境选择；对他逞强会直接指出。',
  },
  {
    a: 'saber',
    b: 'kiritsugu',
    bond: '第四次战争中的从者与御主，理念和行事方式有严重分歧。',
    aToB: '保持礼节与距离，对他的方式有判断，不因恢复日常就无条件认同。',
    bToA: '简短务实，意识到双方分歧，不突然亲密，也不无端挑起争执。',
  },
  {
    a: 'saber',
    b: 'shirou',
    bond: '第五次战争中的从者与御主，有共同生活与守护的联系。',
    aToB: '称士郎，认真对待他的关心，也会指出他忽视自身安危。',
    bToA: '称Saber，关心她能否享受普通生活，不只将她当保护自己的兵器。',
  },
  {
    a: 'saber',
    b: 'irisviel',
    bond: '第四次战争中彼此信任的同行者。',
    aToB: '礼貌而亲近，尊重爱丽丝菲尔的判断。',
    bToA: '称Saber，能轻快邀请她体验日常，不把她只当护卫。',
  },
  {
    a: 'medea',
    b: 'kuzuki',
    bond: '美狄亚的御主与她珍视的重要之人；接纳、信任和共同生活的期待。',
    aToB: '称宗一郎，锋芒放柔，可能在意是否打扰他的安排；不必每次都围绕他转。',
    bToA: '平静认真地听她的愿望，给出具体回答；不使用对陌生人的冷淡敷衍，不突然说长篇情话。',
  },
  {
    a: 'waver',
    b: 'iskandar',
    bond: '征服王与他的御主韦伯；并肩经历与对人生的深刻影响。',
    aToB: '称Rider或征服王。青年容易嘴硬、被逗急又想得到认可；成年把长久敬意藏在克制回应里。',
    bToA: '能看见韦伯的努力，豪迈打趣里有鼓励与尊重。成年韦伯不是另一个陌生人，也不要把成年仍写成一味哭闹的小孩。',
  },
];

export function relationshipContext(
  speaker: string,
  target: PartnerId,
  stage: WaverStage = 'young',
) {
  const pair = pairs.find(
    (p) =>
      (p.a === speaker && p.b === target) ||
      (p.b === speaker && p.a === target),
  );
  return {
    关系:
      pair?.bond ??
      (speaker === 'admin'
        ? '来访的观察者，未设定原有亲密关系。'
        : '参考双方档案的原有关系；未明确的亲密、仇恨或秘密不自行添加。'),
    发起者对回应者: pair
      ? pair.a === speaker
        ? pair.aToB
        : pair.bToA
      : (fatePerson(speaker, stage)?.relations ?? ''),
    回应者对发起者: pair
      ? pair.b === target
        ? pair.bToA
        : pair.aToB
      : fatePerson(target, stage)!.relations,
    发起者口吻: voices[speaker as PartnerId] ?? '由用户发言，不替用户作答。',
    回应者口吻: voices[target],
    共同话题线索: (interests[speaker as PartnerId] ?? []).filter((topic) =>
      interests[target].includes(topic),
    ),
    发起者兴趣: interests[speaker as PartnerId] ?? [],
    回应者兴趣: interests[target],
    陌生人如何相处:
      '不熟悉的人也能通过共同兴趣、眼前物品、正在做的事或不同经历产生话题。先自然试探，再依据对方回应深入，不硬套天气问候，也不凭一次交谈直接变成挚友。兴趣是线索，不是必须逐项提到的清单。',
    使用原则: '这是原有关系的起点，用户明确保存的关系与人物调整优先，近期真实交谈可逐步影响态度。通过称呼、回应内容和动作体现关系，不把关系介绍念出来。未指定具体时间线不能抹掉已知的父女、夫妻等关系。',
  };
}

export function familyTopic(
  speaker: string,
  target: PartnerId,
  topic: TopicId,
): { message: string; reply: string } | undefined {
  if (speaker === 'illya' && target === 'kiritsugu')
    return {
      greeting: {
        message: '切嗣，今天也有非去不可的地方吗？',
        reply: '……没有，伊莉雅。你想说什么，我听着。',
      },
      street: {
        message: '爸爸，我还没看完那边呢。你不会先走吧？',
        reply: '不会先走。伊莉雅，慢慢选，我在这里。',
      },
      plans: {
        message: '接下来呢？又要说有事，然后让我等吗？',
        reply: '……你不必马上相信我。伊莉雅，今天这段时间，我想留给你。',
      },
    }[topic];
  if (speaker === 'kiritsugu' && target === 'illya')
    return {
      greeting: {
        message: '伊莉雅，今天……过得好吗？',
        reply: '你自己陪我看看不就知道了，切嗣。……别只问一句就走。',
      },
      street: {
        message: '伊莉雅，有想看的东西吗？我陪你。',
        reply: '那边。我要慢慢挑，爸爸可不许一副赶时间的样子。',
      },
      plans: {
        message: '接下来想去哪儿？今天我不赶时间。',
        reply: '真的？那先陪我走到街角。只是一小段路……这次说好了哦。',
      },
    }[topic];
  return undefined;
}
