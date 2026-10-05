import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFateChatHandler } from '../lib/fate-chat';
import { completionReply, manualChatReply } from '../lib/fate-chat-response';

const text = '只是一本随笔。读到这里，停下来想一想。';
function completion(content: unknown, finish_reason: unknown = 'stop') {
  return {
    choices: [{ message: { role: 'assistant', content }, finish_reason }],
  };
}
function request(overrides = {}) {
  return new Request('http://localhost:3000/api/fate/chat', {
    method: 'POST',
    headers: {
      Origin: 'http://localhost:3000',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mode: 'chat',
      key: 'fixture-test-key',
      model: 'deepseek-flash',
      speaker: 'illya',
      target: 'kuzuki',
      socialEffects: true,
      history: [],
      message: '在看什么书',
      ...overrides,
    }),
  });
}

void test('complete plain speech and a complete fenced reply are normalized without inventing turns', () => {
  assert.equal(completionReply(completion(text), 2400), text);
  assert.equal(
    completionReply({ choices: [{ message: { content: text } }] }, 2400),
    text,
  );
  const json = JSON.stringify({ reply: text, effects: { impressions: [] } });
  assert.deepEqual(manualChatReply(`\n\`\`\`json\n${json}\n\`\`\`\n`), {
    reply: text,
    effects: { impressions: [] },
  });
  assert.deepEqual(manualChatReply(text), { reply: text });
});

void test('unfinished, empty, malformed and oversized completions have distinct safe errors', () => {
  for (const [payload, expected] of [
    [completion('{"reply":"仍在生成', 'length'), /被中途截断/],
    [completion(text, null), /未正常完成/],
    [completion(text, 'content_filter'), /未正常完成/],
    [completion(text, 'tool_calls'), /未正常完成/],
    [completion(null), /空回应/],
    [completion('   '), /空回应/],
    [completion([{ type: 'text', text }]), /格式无法识别/],
    [{ choices: [{ message: { reasoning_content: text } }] }, /格式无法识别/],
    [completion('字'.repeat(2401)), /回应过长/],
    [null, /格式无法识别/],
  ] as const) {
    assert.throws(() => completionReply(payload, 2400), expected);
  }
});

void test('partial JSON fences, empty replies, arrays and autonomous scripts cannot become manual speech', () => {
  for (const invalid of [
    '```json\n{"reply":"还没说完',
    '```json\n{"reply":""}\n```',
    '```json\n{"reply":"尚未闭合"\n```',
    '```text\n只是一本书。\n```',
    '```json\n{"reply":"一句话"}\n```\n额外内容',
    JSON.stringify([{ speaker: 'kuzuki', text }]),
    JSON.stringify({ turns: [{ speaker: 'kuzuki', text }] }),
    JSON.stringify({
      reply: text,
      turns: [{ speaker: 'illya', text: '替玩家说话' }],
    }),
    JSON.stringify({ reply: null }),
    JSON.stringify({ reply: '字'.repeat(2401) }),
  ])
    assert.throws(() => manualChatReply(invalid));
});

void test('Kuzuki manual reply accepts one complete JSON fence with one paid call and no extra speaker', async () => {
  let calls = 0;
  const handler = createFateChatHandler(async (_input, init) => {
    calls++;
    const sent = JSON.parse(init!.body as string);
    assert.equal(sent.thinking.type, 'disabled');
    assert.equal(
      sent.max_tokens,
      1200,
      'format compatibility does not raise the spending limit',
    );
    assert.match(sent.messages[0].content, /只扮演回复者葛木宗一郎（kuzuki）/);
    const json = JSON.stringify({ reply: text, effects: { impressions: [] } });
    return Response.json({
      ...completion('```json\n' + json + '\n```'),
      usage: { total_tokens: 40 },
    });
  });
  const response = await handler(request());
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.reply, text);
  assert.equal(result.turns, undefined);
  assert.deepEqual(result.effects, { impressions: [] });
  assert.equal(calls, 1);
});

void test('truncated or empty manual answers and swapped identity never reach history and never auto-retry', async () => {
  for (const [content, reason, overrides, expected] of [
    [JSON.stringify({ reply: text }), 'length', {}, /被中途截断/],
    ['', 'stop', {}, /空回应/],
    [
      '```json\n{"reply":"我是切嗣。"}\n```',
      'stop',
      { speaker: 'kiritsugu', target: 'shirou' },
      /混淆了人物身份/,
    ],
  ] as const) {
    let calls = 0;
    const handler = createFateChatHandler(async () => {
      calls++;
      return Response.json(completion(content, reason));
    });
    const response = await handler(request(overrides));
    assert.equal(response.status, 502);
    const result = await response.json();
    assert.match(result.error, expected);
    assert.equal(result.reply, undefined);
    assert.equal(result.turns, undefined);
    assert.equal(calls, 1);
  }
});
