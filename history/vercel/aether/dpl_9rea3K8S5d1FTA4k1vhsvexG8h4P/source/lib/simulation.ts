import {
  type World,
  type Resident,
  type Action,
  type SpecialEvent,
  PLACES,
  JOBS,
  clamp,
  random,
  pick,
  event,
  createResident,
} from './world';
type Point = { x: number; y: number };
const roads: Point[] = [
  { x: 5, y: 19 },
  { x: 24, y: 19 },
  { x: 43, y: 19 },
  { x: 50, y: 19 },
  { x: 5, y: 44 },
  { x: 15, y: 44 },
  { x: 36, y: 44 },
  { x: 43, y: 44 },
  { x: 50, y: 43 },
  { x: 59, y: 44 },
  { x: 74, y: 44 },
  { x: 95, y: 44 },
  { x: 5, y: 68 },
  { x: 5, y: 95 },
  { x: 30, y: 95 },
  { x: 43, y: 95 },
  { x: 50, y: 95 },
  { x: 59, y: 95 },
  { x: 67, y: 95 },
  { x: 77, y: 95 },
  { x: 95, y: 95 },
  { x: 43, y: 54 },
  { x: 44, y: 65 },
  { x: 50, y: 70 },
  { x: 58, y: 65 },
  { x: 59, y: 54 },
  { x: 13, y: 68 },
  { x: 30, y: 88 },
  { x: 38, y: 86 },
  { x: 67, y: 90 },
  { x: 77, y: 84 },
  { x: 15, y: 39 },
  { x: 36, y: 39 },
  { x: 74, y: 38 },
  { x: 46, y: 65 },
];
const edges = [
  [0, 1],
  [1, 2],
  [2, 3],
  [0, 4],
  [2, 7],
  [3, 8],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [8, 9],
  [9, 10],
  [10, 11],
  [4, 12],
  [12, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [16, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [11, 20],
  [7, 21],
  [21, 22],
  [22, 23],
  [23, 24],
  [24, 25],
  [25, 9],
  [23, 16],
  [12, 26],
  [14, 27],
  [27, 28],
  [18, 29],
  [19, 30],
  [5, 31],
  [6, 32],
  [10, 33],
  [22, 34],
];
function nearest(p: Point) {
  let best = 0;
  for (let i = 1; i < roads.length; i++)
    if (
      Math.hypot(p.x - roads[i].x, p.y - roads[i].y) <
      Math.hypot(p.x - roads[best].x, p.y - roads[best].y)
    )
      best = i;
  return best;
}
export function pathBetween(start: Point, end: Point): Point[] {
  const a = nearest(start),
    b = nearest(end),
    dist = roads.map(() => Infinity),
    prev = roads.map(() => -1),
    used = new Set<number>();
  dist[a] = 0;
  for (let i = 0; i < roads.length; i++) {
    let u = -1;
    for (let j = 0; j < roads.length; j++)
      if (!used.has(j) && (u < 0 || dist[j] < dist[u])) u = j;
    if (u === b || u < 0) break;
    used.add(u);
    for (const e of edges) {
      const v = e[0] === u ? e[1] : e[1] === u ? e[0] : -1;
      if (v < 0) continue;
      const d =
        dist[u] + Math.hypot(roads[u].x - roads[v].x, roads[u].y - roads[v].y);
      if (d < dist[v]) {
        dist[v] = d;
        prev[v] = u;
      }
    }
  }
  const ids = [b];
  for (let u = b; u !== a && prev[u] >= 0;) {
    u = prev[u];
    ids.unshift(u);
  }
  return [...ids.map((i) => ({ ...roads[i] })), end];
}
function setPlan(
  w: World,
  p: Resident,
  action: Action,
  target: string,
  thought: string,
) {
  if (p.target !== target) {
    p.target = target;
    const place = PLACES.find((x) => x.id === target)!;
    p.route = pathBetween(p, {
      x: place.x + (random(w) - 0.5) * 3,
      y: place.y + (random(w) - 0.5) * 2,
    });
  }
  p.action = action;
  p.thought = thought;
  p.source = 'local';
}
const workPlace = (p: Resident) =>
  p.job === '医师'
    ? 'clinic'
    : p.job === '教师' || p.job === '研究员' || p.job === '魔法学徒'
      ? 'academy'
      : p.job === '咖啡师'
        ? 'cafe'
        : p.job === '花艺师' || p.job === '园艺师'
          ? 'garden'
          : 'market';
function plan(w: World, p: Resident) {
  const hour = Math.floor(w.minutes / 60) % 24;
  if (p.energy < 18 || hour < 6 || hour >= 23) {
    setPlan(w, p, '休息', p.home, '先睡个好觉，明天再继续。');
    return;
  }
  if (p.hunger < 32) {
    setPlan(
      w,
      p,
      '进食',
      'market',
      p.money < w.rules.foodPrice
        ? '得想办法解决下一顿饭。'
        : '先吃点东西，才能继续今天的计划。',
    );
    return;
  }
  if (
    (p.health < 55 && p.money >= 16) ||
    (p.health < 55 && w.rules.freeHealing)
  ) {
    setPlan(w, p, '治疗', 'clinic', '身体不太舒服，去诊所问问。');
    return;
  }
  if (p.aiUntil && p.aiUntil > w.minutes) return;
  if (p.age < 6) {
    setPlan(w, p, '休息', p.home, '在家人的照料下慢慢长大。');
    return;
  }
  if (p.age < 18 && hour >= 8 && hour < 15) {
    setPlan(w, p, '学习魔法', 'academy', '今天也有许多新知识可以学习。');
    return;
  }
  if (
    w.special.active &&
    w.special.participants.includes(p.id) &&
    hour >= 16 &&
    hour < 19 &&
    random(w) < 0.65
  ) {
    setPlan(
      w,
      p,
      '参与事件',
      'park',
      p.ambition > 0.6
        ? '想在这次事件中取得更好的成果。'
        : '想弄清这件事，也愿意听听别人的想法。',
    );
    return;
  }
  if (p.age >= 18 && p.age < 70 && hour >= 9 && hour < 16) {
    setPlan(w, p, '工作', workPlace(p), '把今天的工作做好，生活需要一点积累。');
    return;
  }
  if (
    hour >= 18 &&
    hour < 20 &&
    p.curiosity > 0.45 &&
    p.mana > w.rules.magicCost
  ) {
    setPlan(
      w,
      p,
      '学习魔法',
      'academy',
      '再练习一次，也许今天能找到新的窍门。',
    );
    return;
  }
  if (p.dragon < 90 && p.school === '自然' && hour === 17) {
    setPlan(w, p, '驯养', 'garden', '慢慢靠近，先让它熟悉我的气味。');
    return;
  }
  if (
    p.target === p.home ||
    p.action === '工作' ||
    p.action === '学习魔法' ||
    random(w) < 0.15
  ) {
    const friends = w.residents.filter(
      (q) =>
        q.alive &&
        (p.relations[q.id] || 0) > 12 &&
        ['park', 'cafe', 'library'].includes(q.target),
    );
    const q =
      friends.length && random(w) < 0.7
        ? pick(w, friends).target
        : pick(w, ['park', 'cafe', 'library']);
    setPlan(
      w,
      p,
      p.mood < 55 ? '散步' : '交谈',
      q,
      p.mood < 55
        ? '出去走走，换换心情。'
        : '也许会遇到熟悉的人，聊聊今天的事。',
    );
  }
}
function travel(p: Resident, minutes: number) {
  let remaining = minutes * 2;
  while (p.route?.length && remaining > 0) {
    const point = p.route[0],
      dx = point.x - p.x,
      dy = point.y - p.y,
      d = Math.hypot(dx, dy);
    if (d <= remaining) {
      p.x = point.x;
      p.y = point.y;
      remaining -= d;
      p.route.shift();
    } else {
      p.x += (dx / d) * remaining;
      p.y += (dy / d) * remaining;
      remaining = 0;
    }
  }
}
export function relationship(a: Resident, b: Resident) {
  return Math.min(a.relations[b.id] || 0, b.relations[a.id] || 0);
}
function bond(a: Resident, b: Resident, amount: number) {
  a.relations[b.id] = clamp((a.relations[b.id] || 0) + amount, -100, 100);
  b.relations[a.id] = clamp((b.relations[a.id] || 0) + amount, -100, 100);
}
function interact(w: World, p: Resident, hours: number) {
  if (random(w) > (p.focus ? 0.26 : 0.06) * hours || p.age < 6) return;
  const near = w.residents.filter(
    (q) =>
      q.alive &&
      q.id !== p.id &&
      q.age >= 6 &&
      Math.hypot(q.x - p.x, q.y - p.y) < 13,
  );
  if (!near.length) return;
  const known = near.filter((q) => (p.relations[q.id] || 0) > 10);
  const q = pick(w, known.length && random(w) < 0.7 ? known : near),
    conflict = random(w) > 0.7 + (p.empathy + q.empathy) * 0.1;
  bond(p, q, conflict ? -6 : 6 + random(w) * 6);
  p.mood = clamp(p.mood + (conflict ? -5 : 3));
  q.mood = clamp(q.mood + (conflict ? -5 : 3));
  if (p.focus || q.focus)
    event(
      w,
      '关系',
      conflict
        ? `${p.name}与${q.name}对${pick(w, ['魔法课程的收费', '公共资源的分配', '街区最近的变化'])}意见不同，谈话不欢而散。`
        : `${p.name}和${q.name}${pick(w, ['聊起各自想要的生活，发现了一点共同之处。', '分享了今天的小收获，关系近了一些。', '在广场一起休息，约好下次再见。'])}`,
      [p.id, q.id],
    );
  if (!conflict && p.money > 100 && q.money < 20 && p.empathy > 0.6) {
    const amount = 15;
    p.money -= amount;
    q.money += amount;
    event(w, '关系', `${p.name}借给${q.name}15枚星币，帮对方度过眼前的难关。`, [
      p.id,
      q.id,
    ]);
  }
}
function activity(w: World, p: Resident, hours: number) {
  p.hunger = clamp(p.hunger - 3 * hours);
  p.energy = clamp(p.energy - 1.8 * hours);
  p.mana = clamp(p.mana + 1.5 * hours);
  if (p.hunger < 5) p.health = clamp(p.health - 2 * hours);
  if (p.energy < 3) p.health = clamp(p.health - 0.4 * hours);
  if (p.health <= 0) {
    die(w, p, '健康恶化');
    return;
  }
  if (p.age < 6 && p.hunger < 60 && w.food > 0) {
    w.food--;
    p.hunger = 100;
  }
  if (p.route?.length) return;
  switch (p.action) {
    case '休息':
      p.energy = clamp(p.energy + 12 * hours);
      p.health = clamp(p.health + 0.15 * hours);
      break;
    case '进食':
      if (p.hunger < 60 && w.food >= 1) {
        const cost = w.rules.equalFood || p.age < 18 ? 0 : w.rules.foodPrice;
        if (p.money >= cost) {
          p.money -= cost;
          w.treasury += cost * 0.1;
          w.food--;
          p.hunger = clamp(p.hunger + 65);
          p.mood = clamp(p.mood + 2);
        } else if (random(w) < 0.15 * hours && p.empathy < 0.45) {
          w.food--;
          p.hunger = clamp(p.hunger + 45);
          p.belief = clamp(p.belief + 1);
          event(
            w,
            '世界',
            `${p.name}因无力购买食物拿走了集市的面包，引起居民争议。`,
            [p.id],
          );
        }
      }
      break;
    case '工作': {
      const income = (w.rules.wage / 7) * hours,
        tax = income * w.rules.tax;
      p.money += income - tax;
      w.treasury += tax;
      p.energy = clamp(p.energy - hours);
      if (['园艺师', '花艺师', '店员'].includes(p.job))
        w.food = clamp(w.food + 1.2 * hours, 0, 10000);
      break;
    }
    case '学习魔法':
      if (p.mana >= w.rules.magicCost * hours) {
        const before = Math.floor(p.magic / 10);
        p.mana = clamp(p.mana - w.rules.magicCost * hours);
        p.magic = clamp(
          p.magic + w.rules.learning * (0.025 + p.talent / 1400) * hours,
        );
        if (Math.floor(p.magic / 10) > before)
          event(
            w,
            '魔法',
            `${p.name}的${p.school}系魔法达到了${Math.floor(p.magic / 10) * 10}级，持续练习有了成果。`,
            [p.id],
            true,
          );
      }
      break;
    case '治疗':
      if (p.health < 90 && (w.rules.freeHealing || p.money >= 16)) {
        if (!w.rules.freeHealing) p.money -= 16;
        p.health = clamp(p.health + 25);
        p.mana = clamp(p.mana - 3);
      }
      break;
    case '驯养':
      if (w.rules.dragonBan && p.empathy > 0.45) {
        p.thought = '街区禁止私人驯龙，先保持距离。';
        break;
      }
      p.dragon = clamp(p.dragon + (0.2 + p.empathy * 0.6) * hours);
      p.mana = clamp(p.mana - 3 * hours);
      if (p.dragon >= 60 && p.dragon - (0.2 + p.empathy * 0.6) * hours < 60)
        event(
          w,
          '魔法',
          `${p.name}获得了庭院幼龙的信任，建立了稳定的驯养关系。`,
          [p.id],
          true,
        );
      break;
    case '散步':
      p.mood = clamp(p.mood + 1.4 * hours);
      break;
    case '交谈':
      interact(w, p, hours);
      break;
    case '参与事件':
      if (w.special.active && w.special.participants.includes(p.id)) {
        const s = w.special;
        let progress =
          s.objective === '研究'
            ? 0.3 + p.magic / 100 + p.curiosity
            : s.objective === '合作'
              ? 0.3 +
                p.empathy +
                Object.values(p.relations).filter((v) => v > 30).length * 0.08
              : 0.3 + p.magic / 80 + p.ambition;
        if (p.energy < 30) progress *= 0.4;
        s.scores[p.id] = (s.scores[p.id] || 0) + progress * hours;
        p.energy = clamp(p.energy - 3 * hours);
        if (s.objective === '合作') interact(w, p, hours * 2);
      }
      break;
  }
  if (p.health <= 0) die(w, p, '健康恶化');
}
function die(w: World, p: Resident, reason: string) {
  if (!p.alive) return;
  p.alive = false;
  p.death = w.minutes;
  p.aiUntil = 0;
  p.route = [];
  w.stats.deaths++;
  event(
    w,
    '人生',
    `${p.name}因${reason}离世，享年${Math.floor(p.age)}岁。留下的关系与经历仍属于这个街区。`,
    [p.id, ...p.children, ...(p.partner ? [p.partner] : [])],
    true,
  );
  if (p.partner) {
    const q = w.residents.find((q) => q.id === p.partner);
    if (q) {
      q.mood = clamp(q.mood - 25);
      q.partner = undefined;
    }
  }
}
function related(a: Resident, b: Resident) {
  return (
    a.parents.includes(b.id) ||
    b.parents.includes(a.id) ||
    a.parents.some((id) => b.parents.includes(id))
  );
}
function lifeDay(w: World) {
  const living = w.residents.filter((p) => p.alive);
  w.food = clamp(w.food + living.length * 0.35, 0, 10000);
  for (const p of living) {
    const before = Math.floor(p.age);
    p.age = (Math.round(p.age * 360) + 1) / 360;
    if (Math.floor(p.age) > before && p.focus)
      event(
        w,
        '人生',
        `${p.name}迎来${Math.floor(p.age)}岁生日。${p.age < 18 ? '仍在成长，新的能力正在萌芽。' : '这一年的经历成为了生活的一部分。'}`,
        [p.id],
        p.age < 19,
      );
    if (before < 18 && p.age >= 18) {
      p.job = pick(w, JOBS);
      p.goal = pick(w, [
        '想在新的职业中找到自己的位置',
        '想继续学习魔法，探索自己的可能性',
        '想与重要的人一起建立自己的生活',
      ]);
      event(
        w,
        '人生',
        `${p.name}成年了，选择以${p.job}作为职业起点。`,
        [p.id],
        true,
      );
    }
    if (
      (p.age > 70 && random(w) < Math.pow((p.age - 65) / 40, 3) / 360) ||
      p.age > 105
    ) {
      die(w, p, '自然衰老');
      continue;
    }
    if (p.age >= 70 && w.treasury >= 6) {
      w.treasury -= 6;
      p.money += 6;
    }
    if (p.age < 18) {
      const carers = w.residents.filter(
        (q) => p.parents.includes(q.id) && q.alive,
      );
      if (carers.length)
        p.empathy = clamp(
          p.empathy +
            (carers.reduce((s, q) => s + q.empathy, 0) / carers.length -
              p.empathy) *
              0.001,
          0,
          1,
        );
    }
    if (p.age > 60) p.health = clamp(p.health - (0.035 * (p.age - 60)) / 10);
    if (p.age >= 18 && !p.partner && random(w) < 0.018) {
      const candidates = living.filter(
        (q) =>
          q.id !== p.id &&
          !q.partner &&
          q.age >= 18 &&
          !related(p, q) &&
          Math.abs(p.age - q.age) < 24 &&
          relationship(p, q) > 65,
      );
      if (candidates.length) {
        const q = pick(w, candidates);
        p.partner = q.id;
        q.partner = p.id;
        q.home = p.home;
        bond(p, q, 10);
        event(
          w,
          '人生',
          `${p.name}与${q.name}决定共同生活，组成了一个新的家庭。`,
          [p.id, q.id],
          true,
        );
      }
    }
    if (
      p.sex === '女' &&
      p.age >= 20 &&
      p.age < 44 &&
      p.partner &&
      w.minutes - p.lastBirth > 360 * 1440 &&
      w.residents.filter((x) => x.alive).length < 200 &&
      random(w) < 0.0017
    ) {
      const q = w.residents.find((q) => q.id === p.partner);
      if (
        q?.alive &&
        q.sex === '男' &&
        q.age >= 20 &&
        q.age < 65 &&
        p.health > 65 &&
        w.food > 10 &&
        relationship(p, q) > 55
      ) {
        const heritage = w.rules.inherit,
          child = createResident(w, {
            name: `${p.name.split(' ')[0]} ${pick(w, ['ひかり', '結菜', '蒼真', '咲良', '莉子', '凪人', 'こはる', '悠月'])}`,
            age: 0,
            job: '幼年居民',
            sprite:
              random(w) < 0.8
                ? pick(w, [p.sprite, q.sprite])
                : Math.floor(random(w) * 16),
            focus: false,
            sex: random(w) > 0.5 ? '女' : '男',
            talent: clamp(
              ((p.talent + q.talent) / 2) * heritage +
                random(w) * 100 * (1 - heritage) +
                (random(w) - 0.5) * 10,
            ),
            magic: 0,
            school: pick(w, [p.school, q.school]),
            traits: [pick(w, p.traits), pick(w, q.traits)],
            empathy: clamp(
              (p.empathy + q.empathy) / 2 + (random(w) - 0.5) * 0.3,
              0,
              1,
            ),
            curiosity: clamp(
              (p.curiosity + q.curiosity) / 2 + (random(w) - 0.5) * 0.3,
              0,
              1,
            ),
            parents: [p.id, q.id],
            home: p.home,
            x: p.x,
            y: p.y,
            money: 0,
            target: p.home,
            action: '休息',
            backstory: `出生于微光街区，是${p.name}与${q.name}的孩子。`,
            goal: '在照料与陪伴中长大。',
            health: 100,
          });
        p.children.push(child.id);
        q.children.push(child.id);
        p.lastBirth = w.minutes;
        p.energy = clamp(p.energy - 30);
        w.stats.births++;
        event(
          w,
          '人生',
          `${p.name}与${q.name}迎来了孩子${child.name}。新生命继承了部分${child.school}系天赋，需要从头学习。`,
          [p.id, q.id, child.id],
          true,
        );
      }
    }
    if (
      p.focus &&
      p.magic > 25 &&
      random(w) < 0.012 &&
      !w.organizations.some((o) => o.founder === p.id) &&
      w.organizations.length < 12
    ) {
      const friends = living
        .filter((q) => q.id !== p.id && relationship(p, q) > 35 && q.age >= 18)
        .slice(0, 5);
      if (friends.length >= 2) {
        const o = {
          id: `o${w.nextId++}`,
          name: `${p.name.slice(-2)}${p.empathy > 0.6 ? '互助会' : '研习社'}`,
          purpose:
            p.empathy > 0.6 ? '分享物资、照顾邻里' : '交流魔法知识、共同学习',
          founder: p.id,
          members: [p.id, ...friends.map((q) => q.id)],
          time: w.minutes,
        };
        w.organizations.push(o);
        event(
          w,
          '世界',
          `${p.name}与${friends.map((q) => q.name).join('、')}成立了「${o.name}」，约定${o.purpose}。`,
          o.members,
          true,
        );
      }
    }
  }
  for (const o of w.organizations) {
    const members = w.residents.filter(
      (p) => p.alive && o.members.includes(p.id),
    );
    if (members.length < 2) continue;
    if (o.purpose.includes('物资')) {
      const rich = members.find((p) => p.money > 200),
        poor = members.find((p) => p.money < 40);
      if (rich && poor) {
        rich.money -= 8;
        poor.money += 8;
      }
    } else for (const p of members) p.magic = clamp(p.magic + 0.04);
  }
  finishSpecial(w);
}
function finishSpecial(w: World) {
  const s = w.special;
  if (s.active && w.minutes >= s.start + s.duration * 1440) {
    s.active = false;
    s.finished = true;
    const rank = s.participants
      .filter((id) => w.residents.find((p) => p.id === id)?.alive)
      .sort((a, b) => (s.scores[b] || 0) - (s.scores[a] || 0));
    const winner = w.residents.find((p) => p.id === rank[0]);
    if (winner) {
      s.winner = winner.id;
      winner.money += s.reward;
      event(
        w,
        '特殊事件',
        `「${s.name}」落幕。${winner.name}凭借${(s.scores[winner.id] || 0).toFixed(1)}点成果获得${s.reward}枚星币。参与者回到各自的生活。`,
        s.participants,
        true,
      );
    } else
      event(w, '特殊事件', `「${s.name}」因没有存活参与者而结束。`, [], true);
  }
}
export function advance(w: World, minutes: number) {
  let left = Math.min(Math.max(0, minutes), 1440 * 360);
  while (left > 0) {
    const step = Math.min(left, 60 - (w.minutes % 60) || 60),
      oldDay = Math.floor(w.minutes / 1440);
    w.minutes += step;
    for (const p of w.residents) {
      if (!p.alive) continue;
      plan(w, p);
      travel(p, step);
      activity(w, p, step / 60);
    }
    if (Math.floor(w.minutes / 1440) > oldDay) lifeDay(w);
    finishSpecial(w);
    left -= step;
  }
  return w;
}
export function startSpecial(w: World, config: Partial<SpecialEvent>) {
  if (w.special.active) throw Error('请先结束当前事件。');
  const count = Math.round(clamp(config.count ?? 7, 2, 20)),
    duration = Math.round(clamp(config.duration ?? 14, 1, 360)),
    minMagic = clamp(config.minMagic ?? 0),
    pool = w.residents.filter(
      (p) => p.alive && p.age >= 18 && p.magic >= minMagic,
    );
  if (pool.length < count)
    throw Error(`符合年龄和魔法条件的居民只有${pool.length}人。`);
  const selected = pool
    .map((p) => ({ p, score: random(w) + p.ambition * 0.2 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((x) => x.p.id);
  w.special = {
    ...w.special,
    ...config,
    name: (config.name || '星灯共鸣').slice(0, 40),
    description: (config.description || '').slice(0, 1200),
    objective: ['研究', '合作', '竞技'].includes(config.objective || '')
      ? config.objective!
      : '研究',
    count,
    duration,
    minMagic,
    reward: clamp(config.reward ?? 500, 0, 10000),
    active: true,
    start: w.minutes,
    participants: selected,
    scores: Object.fromEntries(selected.map((id) => [id, 0])),
    finished: false,
    winner: undefined,
  };
  event(
    w,
    '特殊事件',
    `「${w.special.name}」开始。${selected.map((id) => w.residents.find((p) => p.id === id)!.name).join('、')}获得了参与资格。`,
    selected,
    true,
    'user',
  );
}
export function intervene(
  w: World,
  kind: '物资' | '星币' | '治愈' | '晴朗' | '小雨' | '星辉',
  target?: string,
) {
  const people = target
    ? w.residents.filter((p) => p.id === target && p.alive)
    : w.residents.filter((p) => p.alive);
  if (target && !people.length) throw Error('这位居民已不在街区生活。');
  w.stats.interventions++;
  if (kind === '物资') w.food = clamp(w.food + 300, 0, 10000);
  else if (kind === '星币') for (const p of people) p.money += 100;
  else if (kind === '治愈')
    for (const p of people) p.health = clamp(p.health + 40);
  else w.weather = kind;
  const witnesses = people.filter(() => random(w) < 0.25);
  for (const p of witnesses) {
    p.belief = clamp(p.belief + 8 + random(w) * 15);
    if (p.focus)
      event(
        w,
        '世界',
        `${p.name}注意到了无法解释的变化，${p.belief > 45 ? '开始相信某种存在正关注着街区。' : '暂时把它记在心里。'}`,
        [p.id],
        p.belief > 45,
      );
  }
  event(
    w,
    '世界',
    kind === '物资'
      ? '集市突然多出了300份食物。'
      : kind === '星币'
        ? `${target ? people[0].name : '所有在世居民'}获得了100枚星币。`
        : kind === '治愈'
          ? `${target ? people[0].name : '所有在世居民'}的健康得到了恢复。`
          : `天气转为${kind}。`,
    target ? [target] : [],
    true,
    'user',
  );
  return w;
}
export type AiDecision = {
  id: string;
  action: Action;
  target: string;
  reason: string;
  dialogue?: string;
  partner?: string;
};
export function canPerform(p: Resident, action: Action, target: string) {
  const destinations: Record<Action, string[]> = {
    休息: [p.home],
    进食: ['market', 'cafe'],
    工作: [workPlace(p)],
    学习魔法: ['academy', 'library'],
    散步: ['park', 'cafe', 'library', 'garden'],
    交谈: PLACES.map((x) => x.id),
    治疗: ['clinic'],
    驯养: ['garden'],
    参与事件: ['park'],
  };
  return destinations[action]?.includes(target) ?? false;
}
export function applyDecisions(w: World, decisions: AiDecision[]) {
  let count = 0;
  const actions: Action[] = [
    '休息',
    '进食',
    '工作',
    '学习魔法',
    '散步',
    '交谈',
    '治疗',
    '驯养',
    '参与事件',
  ];
  for (const d of decisions.slice(0, 4)) {
    const p = w.residents.find((p) => p.id === d.id && p.alive && p.focus);
    if (
      !p ||
      !actions.includes(d.action) ||
      !PLACES.some((x) => x.id === d.target)
    )
      continue;
    if (!canPerform(p, d.action, d.target)) continue;
    if (p.age < 18 && ['工作', '参与事件'].includes(d.action)) continue;
    if (
      d.action === '参与事件' &&
      (!w.special.active || !w.special.participants.includes(p.id))
    )
      continue;
    setPlan(w, p, d.action, d.target, String(d.reason || '').slice(0, 200));
    p.aiUntil = w.minutes + 120;
    p.source = 'ai';
    count++;
    event(
      w,
      '日常',
      `${p.name}决定${d.action}。${p.thought}`,
      [p.id],
      false,
      'ai',
    );
    if (d.dialogue && d.partner) {
      const q = w.residents.find((q) => q.id === d.partner && q.alive);
      if (q && Math.hypot(q.x - p.x, q.y - p.y) < 15)
        event(
          w,
          '关系',
          `${p.name}对${q.name}说：“${String(d.dialogue).slice(0, 250)}”`,
          [p.id, q.id],
          false,
          'ai',
        );
    }
  }
  return count;
}
export function perception(w: World, p: Resident) {
  const near = w.residents.filter(
    (q) => q.alive && q.id !== p.id && Math.hypot(q.x - p.x, q.y - p.y) < 15,
  );
  return {
    id: p.id,
    name: p.name,
    age: Math.floor(p.age),
    traits: p.traits,
    background: p.backstory,
    goal: p.goal,
    job: p.job,
    home: p.home,
    workplace: workPlace(p),
    needs: {
      health: p.health,
      energy: p.energy,
      food: p.hunger,
      mana: p.mana,
      money: p.money,
    },
    magic: { level: p.magic, talent: p.talent, school: p.school },
    personalMemories: p.memories
      .slice(0, 8)
      .map((id) => w.events.find((e) => e.id === id)?.text)
      .filter(Boolean),
    nearby: near
      .slice(0, 8)
      .map((q) => ({
        id: q.id,
        name: q.name,
        relationship: p.relations[q.id] || 0,
        action: q.action,
      })),
    belief: p.belief,
    event:
      w.special.active && w.special.participants.includes(p.id)
        ? {
            name: w.special.name,
            description: w.special.description,
            objective: w.special.objective,
            score: w.special.scores[p.id],
          }
        : null,
  };
}
