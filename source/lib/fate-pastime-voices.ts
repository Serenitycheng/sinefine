import type { DailyLife } from './fate-life';
import type { Pastime } from './fate-pastimes';
import { fatePerson, type PartnerId } from './fate-cast';

type Moment =
  | 'meal'
  | 'vegetable'
  | 'avoids'
  | 'listen'
  | 'look'
  | 'repaired'
  | 'adjusted';
const VOICES: Partial<Record<PartnerId, Record<Moment, string>>> = {
  illya: {
    meal: '普通的饭也很好吃嘛。下次还要坐我旁边哦！',
    vegetable: '你特地带的配菜呀。那我也尝一口，下次换我来选！',
    avoids: '唔，我不太想吃这个。不过能和你一起吃饭就很好，下次一起选吧。',
    listen: '刚刚还亮着，碰一下就不亮了。你看，就是这里！',
    look: '先看看也行，可是有时候明明看着好好的，也会突然不亮哦。',
    repaired: '真的好了！下次读到好玩的那页，我来叫你。',
    adjusted: '亮起来啦！那我们试着翻几页，看看还会不会灭？',
  },
  kiritsugu: {
    meal: '这样就够了。……你也坐下，普通的饭别凉了。',
    vegetable: '嗯，配菜留着。你也吃，不用一直顾着我。',
    avoids: '谢谢。这份配菜我不太习惯，简餐就好。下次不必特地准备。',
    listen: '路上颠簸后，声音会断一下。先查连接处，别急着全拆。',
    look: '外壳没有明显损坏。通电时也看一下，问题不一定在外面。',
    repaired: '声音稳了。谢谢，路上还能继续用。',
    adjusted: '连接稳了一些。先这样用，有问题再告诉你。',
  },
  irisviel: {
    meal: '偶尔一起吃顿普通的饭，倒比特地安排什么还开心呢。',
    vegetable: '你特地带来的呀？那我们一起分吧，下次让我也帮忙。',
    avoids: '谢谢你记挂着我。不过这份配菜我不太喜欢，我们下次一起挑好不好？',
    listen: '读着读着会闪一下，换个位置又好了。我们慢慢找原因吧。',
    look: '看起来没坏呢。还要实际用一下，可别被它的样子骗了。',
    repaired: '这下能安心看书了。谢谢你陪我一起弄好它。',
    adjusted: '现在亮得稳一些了。谢谢，下次也一起检查吧。',
  },
};
const FALLBACK: Record<Moment, string> = {
  meal: '这样一起吃顿普通的饭，也挺好的。',
  vegetable: '配菜正好，谢谢你特地准备。下次我也来帮忙。',
  avoids: '谢谢你。我还是选平常的简餐，能一起坐下来吃就很好。',
  listen: '用的时候偶尔会不顺手，移动连接处又恢复了。先找找松动的地方吧。',
  look: '表面没有明显损坏，还要试用一下才能确认。',
  repaired: '换过零件以后顺手多了，谢谢。',
  adjusted: '松动的地方调好了，谢谢你。下次还不顺手，再找零件来换。',
};

export function pastimeVoice(life: DailyLife, p: Pastime, moment: Moment) {
  return `${fatePerson(p.target, life.waverStage)!.name}：${VOICES[p.target]?.[moment] ?? FALLBACK[moment]}`;
}

/** The selected NPC recalls their own role, never swaps helper and recipient. */
export function pastimeRecollection(
  life: DailyLife,
  speaker: PartnerId,
  target: PartnerId,
  kind: 'meal' | 'repair',
  atMinute: number,
) {
  const p = life.pastimes?.findLast(
    (p) =>
      p.phase === 'done' &&
      p.kind === kind &&
      Math.abs(p.updatedAt - atMinute) < 1e-5 &&
      [p.host, p.target].includes(speaker) &&
      [p.host, p.target].includes(target) &&
      (p.stage === null || p.stage === life.waverStage),
  );
  if (!p) return undefined;
  if (p.kind === 'meal') {
    if (target === 'illya')
      return '当然记得！那次确实一起吃了饭，下次换我选座位，你还要来哦。';
    if (target === 'kiritsugu')
      return '嗯，记得。那次确实一起吃了饭。下次你也别站着，坐下来吃。';
    if (target === 'irisviel')
      return '记得呀，我们确实一起吃了饭。下次让我也准备一点，不然总是你忙。';
    return '记得。那次我们确实一起吃了饭，下次可以再商量吃什么。';
  }
  if (p.host === target) return '记得，那次是我帮你检修的。现在用着还顺手吗？';
  if (target === 'illya')
    return '记得！你帮我弄好了阅读灯，下次看到好玩的故事我来叫你。';
  if (target === 'kiritsugu')
    return '嗯。你修过那台收音机，路上用起来稳了一些。';
  if (target === 'irisviel')
    return '当然记得，那盏灯现在用起来顺手多了。谢谢你陪我一起检查。';
  return '记得。你帮我检修过器具，用起来顺手了一些。';
}
