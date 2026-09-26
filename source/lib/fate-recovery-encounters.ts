import { fatePerson, type PartnerId, type WaverStage } from './fate-cast';
import type { LifeDialogue } from './fate-life';
import { RECOVERY_IDS, type RecoveryPartnerId } from './fate-recovery-presets';

type Opening = {
  pair: readonly [PartnerId, PartnerId];
  message: string;
  reply: string;
};
const openings: Opening[] = [
  {
    pair: ['tokiomi', 'rin'],
    message: '凛，最近有什么自己想研究的问题吗？不妨先说说你的判断。',
    reply: '父亲，我会认真想清楚。不过，最后怎么做，我也想由自己来决定。',
  },
  {
    pair: ['tokiomi', 'sakura'],
    message: '樱，今天……有什么你自己想做的事吗？',
    reply: '有的。父亲，我想先按自己的步调试一试。有些话，还需要一点时间。',
  },
  {
    pair: ['kariya', 'sakura'],
    message: '樱，今天有给自己留一点空闲吗？想做什么，可以按自己的意思来。',
    reply:
      '谢谢雁夜叔叔。我想看看书，也想自己挑些东西。您也安排一点自己的事吧。',
  },
  {
    pair: ['medusa', 'sakura'],
    message: '樱，若想找个安静的地方，我可以陪你。不过，去哪里由你来选。',
    reply: '嗯，Rider。今天想慢慢看看书。你也挑自己喜欢的，不用一直顾着我。',
  },
  {
    pair: ['medusa', 'rin'],
    message: '凛，若有想问樱的事，可以直接听听她的想法。她也会认真考虑。',
    reply:
      '我知道。我会自己和她说，也不会替她决定所有事。你也是，有自己的安排就去做。',
  },
  {
    pair: ['shirou', 'medusa'],
    message: 'Rider，今天想去哪里？要是想看书，街角可以坐一会儿。',
    reply: '谢谢，士郎。我会自己过去。你也先把自己的事情安排好。',
  },
  {
    pair: ['rin', 'emiya'],
    message: 'Archer，难得有空，别又把所有闲事都揽过去。你自己没有想做的事？',
    reply:
      '当然有，凛。只是有些东西随手整理一下更省心。你也不必把休息当成一场考核。',
  },
  {
    pair: ['emiya', 'shirou'],
    message: '卫宫士郎，替别人答应事情之前，先看看你自己的安排。',
    reply:
      '我知道，Archer。不过我会自己判断的。你也有自己的事吧，不用一直盯着我。',
  },
  {
    pair: ['emiya', 'saber'],
    message: 'Saber，休息时也不必站得那么笔直。今天的事可以按你的意愿来。',
    reply: '我会考虑，Archer。你也不必总把照顾旁人当作自己的责任。',
  },
  {
    pair: ['taiga', 'emiya'],
    message: 'Archer，你看起来也闲不下来呢。偶尔坐下聊聊，不耽误什么吧？',
    reply: '可以，藤村老师。不过您也别光顾着提醒别人，自己的休息一样要安排。',
  },
  {
    pair: ['natalia', 'kiritsugu'],
    message: '切嗣，还是什么都想自己扛着？先把饭吃好，再谈那些做不完的事。',
    reply: '……知道了，娜塔莉亚。你也一样，不用总替我操心。',
  },
  {
    pair: ['natalia', 'irisviel'],
    message: '爱丽丝菲尔，照顾家人之外，也得留些时间给自己。你有什么想做的？',
    reply:
      '我想慢慢认识这里的生活。娜塔莉亚，你也说说自己的打算吧，不必只聊切嗣。',
  },
  {
    pair: ['natalia', 'illya'],
    message: '伊莉雅，你自己想看什么？可以说清楚，不必先猜大人想听哪一种答案。',
    reply:
      '那我要慢慢挑。娜塔莉亚，你也不许像切嗣那样，问完一句就又去忙别的哦。',
  },
  {
    pair: ['natalia', 'shirou'],
    message: '士郎，想帮人是好事，也要知道自己什么时候该停下来。',
    reply: '嗯，我会认真想的。娜塔莉亚，我也想听听您平时怎样给自己留时间。',
  },
  {
    pair: ['tokiomi', 'kirei'],
    message: '绮礼，闲暇时也可以读些自己感兴趣的东西。你有想谈的问题吗？',
    reply: '老师，我会自己选择。若谈到判断的依据，或许还值得再想一想。',
  },
  {
    pair: ['tokiomi', 'kariya'],
    message: '雁夜，有话可以直说。不必借别人的安排替自己开口。',
    reply:
      '那我就直说。樱有自己的意愿，应该先听她说。别把所有事都当成已经安排好了。',
  },
  {
    pair: ['rin', 'kirei'],
    message: '绮礼，今天我有自己的安排。你若有什么事，就直接说。',
    reply: '凛，既然安排妥当，照你的判断做便是。我也并非每次都要给你布置功课。',
  },
  {
    pair: ['kirei', 'kiritsugu'],
    message: '卫宫切嗣，如今空下来的时间，你打算怎样度过？',
    reply: '这是我自己的事。……今天只想安静走一会儿。',
  },
  {
    pair: ['cu', 'kirei'],
    message: '绮礼，休息的时候就别把什么都问个究竟了。你自己想干什么？',
    reply: '读书，或四处走走。Lancer，你也可以保留自己的答案。',
  },
  {
    pair: ['tokiomi', 'gilgamesh'],
    message: '王，若想看看此地的日常，街角与侧巷都可一行。',
    reply: '时臣，本王自会判断哪里值得停步。你也不妨看看账目之外的东西。',
  },
  {
    pair: ['kirei', 'gilgamesh'],
    message: '吉尔伽美什，寻常的街道，也有能让你停步的东西吗？',
    reply:
      '绮礼，是否有趣，要亲眼看过才知道。只盯着旁人的反应，可看不清自己的选择。',
  },
  {
    pair: ['gilgamesh', 'saber'],
    message: '骑士王，离开职责片刻，你又会选什么来打发时间？',
    reply: '那应由我自己决定，吉尔伽美什。普通生活也有值得认真对待的事。',
  },
  {
    pair: ['gilgamesh', 'iskandar'],
    message: '征服王，寻常店铺也值得你如此留意？',
    reply:
      '当然！时代怎样变化，看看人们把心思用在哪儿就知道了。你也用自己的眼睛看看吧。',
  },
  {
    pair: ['gilgamesh', 'emiya'],
    message: '连闲暇也要用来整理那些器具么？你的消遣倒是简单。',
    reply: '够用就好。怎样打发自己的时间，我还不需要向你请示。',
  },
];

const fallback: Record<RecoveryPartnerId, { message: string; reply: string }> =
  {
    gilgamesh: {
      message: '若只按自己的眼光挑选，你觉得什么值得花时间？',
      reply: '本王会亲自判断。旁人的喜好，听听也就够了。',
    },
    medusa: {
      message: '安静读书和四处走走，你更喜欢哪一种？',
      reply: '我更喜欢安静些。可以先看一会儿书，再决定接下来的事。',
    },
    tokiomi: {
      message: '若有空闲，你会如何安排自己的阅读与休息？',
      reply: '读书也需要思考的余地。我愿意先把眼前的一件事看清楚。',
    },
    kirei: {
      message: '先不谈旁人的期待，你自己愿意怎样度过这段时间？',
      reply: '我会自行选择。若你有不同的看法，也可以说来听听。',
    },
    kariya: {
      message: '今天想慢慢做点自己的事。你有什么感兴趣的东西吗？',
      reply: '我想看看书，也给自己留一点空闲。别的事，可以慢慢考虑。',
    },
    emiya: {
      message: '把该做的事放在一边时，你会怎样休息？',
      reply: '做点料理，或整理器具。不过，偶尔什么都不做也未尝不可。',
    },
    natalia: {
      message: '难得空下来，你有什么自己想试试的事？',
      reply: '看看书，养护器具，再随意走走。小事也有自己的意思。',
    },
  };
const oldReplies: Partial<Record<PartnerId, string>> = {
  saber: '我想多了解普通的生活，也会给自己留出休息的时间。',
  rin: '先选自己真正感兴趣的，再看时间够不够。用不着每件事都挤到今天。',
  shirou: '料理和器具的构造都挺有意思。不过我也想学着留些空闲。',
  sakura: '我想读自己喜欢的书。慢慢选，不急着决定，也很好。',
  kiritsugu: '读书。……安静待一会儿也可以。',
  irisviel: '我想看看普通的小东西。按自己的心意慢慢挑，就很有趣。',
  illya: '先看看有趣的书和小东西吧。我想自己挑，不用替我决定。',
  taiga: '看看书，也给自己好好放个假！老师也得照顾自己的日常嘛。',
  diarmuid: '阅读与器具养护都值得认真对待，也不应忘记休息。',
  cu: '找点户外的消遣，再好好吃一餐。休息不用想得太复杂。',
  waver: '先把感兴趣的问题记下来，再慢慢查清楚。我也会留时间休息的。',
  iskandar: '看看没见过的东西，听听人的见闻！这世上值得一看的事还多着呢。',
  medea: '研究和手作都有可做的事，不过要按我自己的步调。',
  kuzuki: '读书，休息。按次序做就好。',
};

function isRecovery(id: PartnerId): id is RecoveryPartnerId {
  return (RECOVERY_IDS as readonly string[]).includes(id);
}

/** Preserve original openings for the first 14 residents; new pairs have safe local speech. */
export function recoveryEncounter(
  a: PartnerId,
  b: PartnerId,
  stage: WaverStage = 'young',
): LifeDialogue | undefined {
  if (a === b || (!isRecovery(a) && !isRecovery(b))) return undefined;
  const specific = openings.find(
    ({ pair }) => pair.includes(a) && pair.includes(b),
  );
  const speaker = specific?.pair[0] ?? (isRecovery(a) ? a : b);
  const target = specific?.pair[1] ?? (speaker === a ? b : a);
  const message =
    specific?.message ??
    `${fatePerson(target, stage)!.name}，${fallback[speaker as RecoveryPartnerId].message}`;
  const reply =
    specific?.reply ??
    (isRecovery(target)
      ? fallback[target].reply
      : target === 'waver' && stage === 'adult'
        ? '整理想研究的问题，分清事实与推测。休息也是必要的，我会自己安排。'
        : oldReplies[target]!);
  return {
    speaker,
    target,
    message,
    reply,
    source: 'preset',
    ...([speaker, target].includes('waver') ? { waverStage: stage } : {}),
  };
}
