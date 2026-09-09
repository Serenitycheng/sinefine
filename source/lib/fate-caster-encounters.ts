import type { PartnerId, WaverStage } from './fate-cast';

type Opening = {
  pair: readonly [PartnerId, PartnerId];
  message: string;
  reply: string;
};

export function casterEncounters(stage: WaverStage): Opening[] {
  return [
    {
      pair: ['medea', 'kuzuki'],
      message:
        '宗一郎，我还想再看看。两样东西各有好处，一时倒不想将就……会耽误你的安排吗？',
      reply: '不急。我留了时间。你按自己的意思选。',
    },
    {
      pair: ['waver', 'medea'],
      message:
        stage === 'adult'
          ? 'Caster，严谨的推论需要先分清观察和假设。这一点，研究不同体系的人也能讨论。'
          : 'Caster，我想问的是整理推论的方法，不是让你替我做完。我也想靠自己把问题弄清楚。',
      reply: '想法可以谈，但别以为我会把所有笔记都交出来。先把你的问题说明白。',
    },
    {
      pair: ['waver', 'kuzuki'],
      message:
        stage === 'adult'
          ? '葛木老师，教案写得完，学生的问题却总能超出预想。你通常怎样安排课堂里的余地？'
          : '葛木老师，读过的东西要怎样才能讲清楚？我总觉得自己明白了，一开口又不是那么回事。',
      reply: '先确认对方已经理解的部分。一次讲清一件事，再继续。',
    },
    {
      pair: ['medea', 'saber'],
      message: 'Saber，今日我只是按自己的安排走走。你想去哪里，不必向我说明。',
      reply: '我明白。我也会保留应有的距离，平静相处需要彼此尊重边界。',
    },
    {
      pair: ['medea', 'rin'],
      message:
        '远坂，推论写得漂亮还不够，细节上的疏漏往往最容易被自己的自信遮住。',
      reply: '我会自己核对。你若有具体的意见，可以直说，不用先替我下结论。',
    },
    {
      pair: ['medea', 'shirou'],
      message: '卫宫，我要用的东西会自己挑。若真有需要帮忙的地方，我会开口。',
      reply: '知道了。我不会擅自替你决定，需要的时候再告诉我就好。',
    },
    {
      pair: ['medea', 'sakura'],
      message:
        '间桐，你喜欢哪一种，就多看一会儿。不必每次都先考虑别人会选什么。',
      reply: '嗯。我今天也想按自己的喜好慢慢挑，谢谢。',
    },
    {
      pair: ['medea', 'kiritsugu'],
      message: '卫宫切嗣，有话便直说吧。若没有，我们各自安静一会儿也好。',
      reply: '没有别的事。各自按原来的安排就好。',
    },
    {
      pair: ['medea', 'irisviel'],
      message:
        '爱丽丝菲尔女士，你会为了一个小小的花纹挑选很久吗？我倒不觉得那是浪费时间。',
      reply: '会呀。自己喜欢的细节，即使很小，也值得认真看一看。',
    },
    {
      pair: ['medea', 'illya'],
      message: '伊莉雅，若是好奇，可以问。至于愿不愿意回答，我会自己决定。',
      reply: '那就先问个简单的：你逛街时，最容易被什么样的小东西吸引？',
    },
    {
      pair: ['medea', 'taiga'],
      message: '藤村老师，你平时挑日用品，会先看实用，还是先看样子？',
      reply: '两样都想要呀！不过还是得看看用不用得上，不然家里可要堆满了。',
    },
    {
      pair: ['medea', 'diarmuid'],
      message: '迪卢木多，你检查器具时，倒像是不肯放过任何一个小地方。',
      reply: '把细节照顾好，使用时才更安心。不过不同的器具，也需要不同的方法。',
    },
    {
      pair: ['medea', 'cu'],
      message:
        '枪兵，漫无目的地走，也能让你觉得有意思？我通常更愿意先想好要看什么。',
      reply: '那就各有各的走法嘛。你挑你的，我逛我的，偶尔碰见再聊也不错。',
    },
    {
      pair: ['medea', 'iskandar'],
      message:
        '征服王，挑东西也不必弄得像出征一样。这里的店门，可容不下你随意纵马。',
      reply: '哈哈，说得有理！本王今日也想看看这些细小的趣味，自然要慢下步子。',
    },
    {
      pair: ['kuzuki', 'saber'],
      message: 'Saber。路在前面，我不会挡着。',
      reply: '多谢。今天各自按自己的安排就好，不必将平静误作过去已被忘记。',
    },
    {
      pair: ['kuzuki', 'rin'],
      message: '远坂。若没有急事，行程不必排得太满。',
      reply: '我有安排休息，老师。自己的事情，我会认真处理。',
    },
    {
      pair: ['kuzuki', 'shirou'],
      message: '卫宫。答应的事应当做好，也要先判断自己能承担多少。',
      reply: '是。我会先把手边的事做完，不再什么都一口答应下来。',
    },
    {
      pair: ['kuzuki', 'sakura'],
      message: '间桐。若是在挑东西，慢慢看即可。',
      reply: '谢谢老师。我想再比较一下，今天并不赶时间。',
    },
    {
      pair: ['kuzuki', 'kiritsugu'],
      message: '这里安静。你若要坐下，不必特意寒暄。',
      reply: '……这样就好。各自歇一会儿。',
    },
    {
      pair: ['kuzuki', 'irisviel'],
      message: '爱丽丝菲尔女士。找路的话，沿这条人行道可以到街角。',
      reply: '谢谢。我还想慢慢看看附近的小店，今天有许多可以留意的东西呢。',
    },
    {
      pair: ['kuzuki', 'illya'],
      message: '伊莉雅。有什么想问的，可以说明。',
      reply: '你总是这么简短呢。那我想知道，你自己休息时喜欢读什么？',
    },
    {
      pair: ['kuzuki', 'taiga'],
      message: '藤村老师。今日也在准备课程？',
      reply:
        '是呀，还想挑几段合适的英语读物。例子选得有趣一点，学生也更容易听进去！',
    },
    {
      pair: ['kuzuki', 'diarmuid'],
      message: '器具维护，先依照次序检查。急于动手容易漏掉问题。',
      reply: '我也赞同。先看清需要处理的地方，才不至于辜负手边的东西。',
    },
    {
      pair: ['kuzuki', 'cu'],
      message: '你不赶时间？',
      reply: '不赶。正好走走，等饿了再去吃饭。你也别把休息排成另一份差事啊。',
    },
    {
      pair: ['kuzuki', 'iskandar'],
      message: '征服王。马经过行人身边时，请慢一些。',
      reply: '放心，本王会留意！难得从容看看这些店铺，也不急着赶往哪里。',
    },
  ];
}
