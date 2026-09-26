import { fatePerson, type PartnerId, type WaverStage } from './fate-cast';
import { dialogueLines, type DialogueTurn } from './fate-dialogue';
import type { DailyLife, LifeDialogue } from './fate-life';
import { currentBond } from './fate-social';

type Voice = {
  pause: string;
  pauseReply: string;
  interest: string;
  interestReply: string;
  listen: string;
  listenReply: string;
};

const voices: Record<PartnerId, Voice> = {
  saber: {
    pause: '我也该学着留一点休息的时间。你平时会怎样放松？',
    pauseReply: '我习惯留意四周。不过，停下来专心听人说话也是一种休息。',
    interest: '除了必须完成的事，你有什么特别想做的事吗？',
    interestReply:
      '我想多了解这里普通的生活。食物之外，还有许多值得认真看待的事。',
    listen: '若有想说的话，我愿意听。不必急着把事情说清楚。',
    listenReply: '谢谢。我还在学习按自己的意愿安排一天，想慢慢试一试。',
  },
  rin: {
    pause: '安排里也得留点空当吧。你不会连休息都忘了算进去？',
    pauseReply: '我当然有留。计划是为了省心，可不是拿来把自己逼得团团转的。',
    interest: '如果只按自己的喜好选，你最想把时间花在哪件事上？',
    interestReply: '想把感兴趣的问题研究明白。至于花多少时间，我会自己拿捏。',
    listen: '有什么话就说吧。……我在听，又没催你。',
    listenReply: '也没什么大事。只是觉得，有些安排不必一个人全想好。',
  },
  shirou: {
    pause: '我也想让自己歇一会儿。你平时空下来会做什么？',
    pauseReply: '做点不用赶时间的小事吧。不过今天，先这样聊一会儿也很好。',
    interest: '有没有什么是你自己想做、还没来得及试的？',
    interestReply:
      '我想弄懂器具的构造，也想试些不同的料理。不是谁拜托，自己也觉得有趣。',
    listen: '想聊什么都可以。今天我也想听听你的打算。',
    listenReply: '那我就说自己的事吧。有时太快答应帮忙，反而忘了先想想自己。',
  },
  sakura: {
    pause: '不用一直忙下去也可以吧。你会怎样给自己留一点空闲呢？',
    pauseReply: '我想读自己喜欢的书。有时不做什么，只安静待一会儿也很好。',
    interest: '选自己喜欢的事，好像也需要练习。你会先选哪一样呢？',
    interestReply: '料理和阅读我都喜欢。不过这一次，想先按自己的心情来选。',
    listen: '如果你愿意说，我想听听。不用只挑让人放心的事。',
    listenReply: '谢谢。有些想法我还没理清楚，不过，我会慢慢说的。',
  },
  kiritsugu: {
    pause: '……不必一直忙。你会怎样休息？',
    pauseReply: '找个安静的地方。书也可以晚些再看。',
    interest: '有自己想做的事吗？小事也可以。',
    interestReply: '阅读，修理小东西。能慢慢做完就好。',
    listen: '……你说。我在听。',
    listenReply: '我不太擅长说这些。先听你讲吧。',
  },
  irisviel: {
    pause: '把忙碌先放一小会儿，你最想怎样度过这点空闲？',
    pauseReply: '慢慢看看身边的小东西。自己决定要看什么，就已经很有趣了。',
    interest: '我想知道你的喜好。没有别人的安排时，你会选什么呢？',
    interestReply:
      '我想多认识这里的生活。普通的店铺和日用品，都有值得好奇的地方。',
    listen: '不用急着回答呀。你想说的，我会认真听。',
    listenReply: '那我就慢慢说。能把自己的想法说出来，我也很高兴。',
  },
  illya: {
    pause: '你会休息吗？还是非得有人提醒，才肯给自己放假？',
    pauseReply: '我当然会呀。做自己想做的事，可不能全听别人的安排。',
    interest: '这次只准说自己喜欢的事哦。你会先选什么？',
    interestReply: '我想选本有趣的书，再看看没见过的小东西。让我自己挑就好。',
    listen: '想说就说嘛。我也不是只会让别人听我说的。',
    listenReply: '那你可要认真听。我还没想好从哪里讲，不许催。',
  },
  taiga: {
    pause: '休息也得认真安排哦！你给自己留时间了没有？',
    pauseReply: '老师当然也要休息！不过真空下来，有时候还得想想做什么呢。',
    interest: '先不说功课和任务，你自己最喜欢做什么？',
    interestReply: '好吃的东西、剑道，还有把课讲得有趣一点。老师的爱好可不少！',
    listen: '想聊什么就聊吧。这会儿不用像交作业一样想好答案。',
    listenReply: '那就随便聊聊。有些小事，说出来也挺有意思的。',
  },
  diarmuid: {
    pause: '尽心做事之外，也应留些休息的余地。你平时如何放松？',
    pauseReply: '安静阅读，或仔细看看周围。把步子放缓，我也还在学习。',
    interest: '若不考虑职责，你自己有什么想做的事吗？',
    interestReply: '我喜欢把器具仔细养护好，也愿意读些未曾读过的书。',
    listen: '若愿意说说自己的想法，我会认真听。',
    listenReply: '多谢。比起贸然替别人决定，我更想先了解彼此的意愿。',
  },
  cu: {
    pause: '绷太紧也累吧。你歇下来的时候喜欢干点什么？',
    pauseReply: '找点轻松的事呗。实在没想法，发会儿呆也不丢人。',
    interest: '别管该做什么，你自己觉得什么最有意思？',
    interestReply: '户外的事我都乐意试试。没必要把休息也弄成任务，对吧？',
    listen: '有话直说就行。想好了再说也成，我又不赶你。',
    listenReply: '行，那就随便聊聊。不用每句话都想出个大道理来。',
  },
  waver: {
    pause: '我知道该休息！只是有时想问题会忘了。你通常怎么停下来？',
    pauseReply: '先把想到的记下来吧。不然休息时还惦记着，反而更累。',
    interest: '除了别人安排的事，你自己有什么想弄明白的问题吗？',
    interestReply: '当然有。只是我想先自己理一理，再把判断说清楚。',
    listen: '你可以说说看。我不一定赞同，但会认真听的。',
    listenReply: '那先听我讲完。不用急着帮我下结论，我也在想呢。',
  },
  iskandar: {
    pause: '一味埋头可不成！闲下来时，你最想怎样消遣？',
    pauseReply: '看看没见过的东西，再听人讲讲见闻。这世上有趣的事可不少。',
    interest: '说说你自己的愿望吧，哪怕只是眼前的一件小事！',
    interestReply: '本王想见识的东西多着呢！先认真看看身边，再决定下一步。',
    listen: '把你的想法讲来听听！不必照着谁的答案说。',
    listenReply: '好！有不同看法也尽管说，听见自己的判断才有意思。',
  },
  medea: {
    pause: '总有做不完的事吧。你倒是会给自己留点余地吗？',
    pauseReply: '我会自己安排。能安静做点喜欢的事，就足够了。',
    interest: '不谈职责和别人的期待，你真正感兴趣的是什么？',
    interestReply: '研究和手作，各有各的乐趣。我喜欢按自己的想法把细节做好。',
    listen: '有话可以直说。是否赞同，我会自己判断。',
    listenReply: '那我也照实说。能自己选择的生活，我不打算草率对待。',
  },
  kuzuki: {
    pause: '事情可以稍后继续。你如何休息？',
    pauseReply: '安静坐一会儿。这样就好。',
    interest: '你自己想做什么？',
    interestReply: '读书。把要讲的东西想清楚，也很重要。',
    listen: '你说。我听着。',
    listenReply: '我会直接说。没有特别的事，也可以在这里坐一会儿。',
  },
  gilgamesh: {
    pause: '闲暇也有值得品味之处。你打算怎样消遣？',
    pauseReply: '本王自有安排。能否看出平常事物的趣味，也取决于眼光。',
    interest: '不必照着旁人的评价说。你自己的眼光看中了什么？',
    interestReply: '这个时代的消遣尚可一观。至于值得留下什么，本王自会判断。',
    listen: '若有自己的见解，就说来听听。',
    listenReply: '有趣与否，总要亲自看过。只复述旁人的判断，未免无聊。',
  },
  medusa: {
    pause: '安静休息一会儿也很好。你喜欢怎样度过空闲？',
    pauseReply: '读自己喜欢的书。不赶着看完，慢慢读就好。',
    interest: '不用考虑旁人的安排，你自己有什么想做的吗？',
    interestReply: '阅读，或找个安静的地方走走。我想按自己的步调来。',
    listen: '如果想说，我会听。不必勉强自己让话题热闹。',
    listenReply: '谢谢。安静些也能好好交谈，我并不觉得无趣。',
  },
  tokiomi: {
    pause: '安排也应当留有余地。你习惯如何休息？',
    pauseReply: '读书，整理思路。不过，也不能让笔记占去所有闲暇。',
    interest: '暂且放下已有的安排，你自己最想弄清楚什么？',
    interestReply: '研究值得细究，生活也有需要重新理解的地方。我想逐一看清。',
    listen: '不妨说说你的想法。我会先听完。',
    listenReply: '有些习惯需要重新考虑。我尚未想好，不急于给出结论。',
  },
  kirei: {
    pause: '空下来的时间，也未必需要立刻填满。你会如何选择？',
    pauseReply: '读书，或沿街走走。没有特别的目的，也可以停留片刻。',
    interest: '若不先考虑旁人的评价，你自己对什么感兴趣？',
    interestReply: '人的选择值得观察。不过，每个人未说出口的部分，仍归他自己。',
    listen: '想说的便说。不愿回答，也可以直言。',
    listenReply: '那么，就谈眼前的事吧。并非每一个问题都需要现在回答。',
  },
  kariya: {
    pause: '我也想把日子过得从容些。你平时怎样休息？',
    pauseReply: '看看书，或者随便走走。不非得替谁做点什么，也可以。',
    interest: '先说说自己的喜好吧。你现在最想做什么？',
    interestReply: '读些感兴趣的东西，整理自己的日常。我还在慢慢找合适的步调。',
    listen: '你说吧。我想先听听你的意思。',
    listenReply: '谢谢。有些话不容易说清，我会试着慢慢说。',
  },
  emiya: {
    pause: '忙完一件又找一件，也不算休息。你通常怎么停下来？',
    pauseReply: '把器具放回原处，然后坐下。说起来简单，做起来倒未必。',
    interest: '没有谁拜托的时候，你自己打算做什么？',
    interestReply:
      '试些料理，整理器具。自己的兴趣，倒不用找太多冠冕堂皇的理由。',
    listen: '有话就说。先说明白，再谈是否需要帮忙。',
    listenReply: '那就照实说吧。让别人猜来猜去，也费时间。',
  },
  natalia: {
    pause: '休息也得自己拿主意。你想怎么用这点空闲？',
    pauseReply: '放下手边的东西，看看书，再出去走走。不必把每一分钟都安排满。',
    interest: '不谈该做什么，你自己对什么有兴趣？',
    interestReply: '器具养护和阅读都不错。偶尔试点没做过的小事，也有意思。',
    listen: '说说看。不用替我挑一个好听的答案。',
    listenReply: '好，那就直说。有不同的看法也可以谈，不必急着点头。',
  },
};

const adultWaver: Voice = {
  pause: '适当地停下来，反而更容易看清问题。你习惯怎样休息？',
  pauseReply: '先把未完成的思路记下。至少休息时，不必反复担心遗忘。',
  interest: '暂且放下职责，你自己还有什么想探究的事？',
  interestReply: '想弄明白的问题仍有很多。重要的是分清事实与自己的推测。',
  listen: '说说你的判断吧。不必先猜我想听什么。',
  listenReply: '……我会说清楚。若有不同意见，也不必急着收回。',
};

function address(from: PartnerId, to: PartnerId, stage: WaverStage) {
  const names: Partial<Record<PartnerId, Partial<Record<PartnerId, string>>>> =
    {
      illya: { kiritsugu: '爸爸', irisviel: '妈妈', shirou: '士郎' },
      shirou: {
        kiritsugu: '老爸',
        taiga: '藤姐',
        sakura: '樱',
        rin: '远坂',
        medusa: 'Rider',
        emiya: 'Archer',
      },
      sakura: {
        shirou: '学长',
        rin: '姐姐',
        taiga: '藤村老师',
        tokiomi: '父亲',
        kariya: '雁夜叔叔',
        medusa: 'Rider',
      },
      kiritsugu: {
        irisviel: '爱丽',
        illya: '伊莉雅',
        shirou: '士郎',
        natalia: '娜塔莉亚',
      },
      irisviel: { kiritsugu: '切嗣', illya: '伊莉雅' },
      rin: {
        shirou: '士郎',
        sakura: '樱',
        taiga: '藤村老师',
        tokiomi: '父亲',
        emiya: 'Archer',
        kirei: '绮礼',
      },
      saber: { shirou: '士郎', kiritsugu: '切嗣', emiya: 'Archer' },
      waver: { iskandar: 'Rider' },
      medea: { kuzuki: '宗一郎' },
      medusa: { sakura: '樱', shirou: '士郎', rin: '凛' },
      tokiomi: {
        rin: '凛',
        sakura: '樱',
        kirei: '绮礼',
        kariya: '雁夜',
        gilgamesh: '王',
      },
      kirei: {
        tokiomi: '老师',
        rin: '凛',
        kiritsugu: '卫宫切嗣',
        cu: 'Lancer',
      },
      kariya: { sakura: '樱', tokiomi: '时臣' },
      emiya: {
        rin: '凛',
        shirou: '卫宫士郎',
        saber: 'Saber',
        taiga: '藤村老师',
      },
      natalia: { kiritsugu: '切嗣', illya: '伊莉雅', shirou: '士郎' },
      gilgamesh: {
        tokiomi: '时臣',
        kirei: '绮礼',
        saber: '骑士王',
        iskandar: '征服王',
      },
      taiga: { shirou: '士郎', emiya: 'Archer' },
    };
  return names[from]?.[to] ?? fatePerson(to, stage)!.name;
}

/** Use existing history rather than a new save field, including memories beyond the event window. */
export function varyEncounter(
  life: DailyLife,
  base: LifeDialogue,
  context: { indoors: boolean; dining: boolean },
): LifeDialogue {
  const { speaker, target } = base;
  const voice = (id: PartnerId) =>
    id === 'waver' && life.waverStage === 'adult' ? adultWaver : voices[id];
  const a = voice(speaker),
    b = voice(target);
  const time = life.minutes % 1440;
  const setting = context.dining
    ? '吃饭时也不用着急。'
    : context.indoors
      ? '在屋里坐一会儿也好。'
      : time < 720
        ? '一天才慢慢开始。'
        : time < 1080
          ? '这个时候，脚步也可以放慢些。'
          : '天色渐晚，事情可以慢慢来。';
  const name = address(speaker, target, life.waverStage);
  const candidates = [
    base,
    { ...base, message: `${name}，${setting}${a.pause}`, reply: b.pauseReply },
    { ...base, message: `${name}，${a.interest}`, reply: b.interestReply },
    { ...base, message: `${name}，${a.listen}`, reply: b.listenReply },
  ];
  const recent = new Map<number, DialogueTurn[]>();
  const bond = currentBond(life, speaker, target);
  const cutoff = bond?.cutoff ?? 0;
  for (const memory of bond?.memories ?? [])
    if (memory.kind === 'conversation' && memory.id >= cutoff)
      recent.set(memory.id, memory.quotes);
  for (const event of life.events) {
    const d = event.dialogue;
    if (
      !d ||
      event.id < cutoff ||
      ![d.speaker, d.target].includes(speaker) ||
      ![d.speaker, d.target].includes(target) ||
      ([speaker, target].includes('waver') &&
        (event.waverStage ?? d.waverStage ?? 'young') !== life.waverStage)
    )
      continue;
    recent.set(event.id, dialogueLines(d));
  }
  const history = [...recent.entries()].sort((x, y) => y[0] - x[0]).slice(0, 6);
  const lastUsed = (candidate: LifeDialogue) => {
    const match = history.find(
      ([, turns]) =>
        turns.some(
          (t) =>
            t.speaker === speaker && t.text === candidate.message.slice(0, 120),
        ) ||
        turns.some(
          (t) =>
            t.speaker === target && t.text === candidate.reply.slice(0, 120),
        ),
    );
    return match?.[0] ?? -1;
  };
  // Prefer an unused scene, otherwise the least recent; stable ordering keeps the first encounter familiar.
  return candidates.reduce((best, candidate) =>
    lastUsed(candidate) < lastUsed(best) ? candidate : best,
  );
}
