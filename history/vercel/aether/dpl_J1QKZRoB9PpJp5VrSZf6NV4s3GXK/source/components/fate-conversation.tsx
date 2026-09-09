'use client';
import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import Image from 'next/image';
import { Check, KeyRound, LoaderCircle, Send, Settings2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFate } from './fate-provider';
import {
  fatePerson,
  presetReply,
  TOPICS,
  type PartnerId,
  type TopicId,
} from '@/lib/fate-cast';
import { conversationHistory } from '@/lib/fate-state';
import type { ActorId } from '@/lib/street';
import styles from './fate-conversation.module.css';

export function FateAISettings({ onClose }: { onClose: () => void }) {
  const ctx = useFate();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const running = useRef<AbortController | null>(null);
  useEffect(() => () => running.current?.abort(), []);
  async function verify(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (running.current) return;
    const controller = new AbortController();
    running.current = controller;
    setBusy(true);
    setError('');
    ctx.setVerified(false);
    try {
      const response = await fetch('/api/fate/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'test', key: ctx.apiKey.trim() }),
        signal: controller.signal,
      });
      const data = (await response.json()) as {
        error?: string;
        models?: string[];
      };
      if (!response.ok || !data.models?.length)
        throw new Error(data.error || '没有读取到可用模型。');
      if (controller.signal.aborted) return;
      ctx.setModels(data.models);
      ctx.setModel(
        data.models.find((id) => id.includes('flash')) || data.models[0],
      );
      ctx.setVerified(true);
    } catch (error) {
      if (!controller.signal.aborted)
        setError(error instanceof Error ? error.message : '连接失败，请重试。');
    } finally {
      if (!controller.signal.aborted) setBusy(false);
      running.current = null;
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className={styles.settings} style={{ maxWidth: 500 }}>
        <div className={styles.kicker}>
          <KeyRound size={17} /> DEEPSEEK
        </div>
        <DialogTitle className={styles.title}>让对话从这里开始</DialogTitle>
        <DialogDescription>
          连接后，Saber 和凛会根据各自性格，以及与你的近期对话作出回应。
        </DialogDescription>
        <form
          onSubmit={(event) => {
            void verify(event);
          }}
          className={styles.settingsForm}
        >
          <label htmlFor="deepseek-key">API 密钥</label>
          <input
            id="deepseek-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={ctx.apiKey}
            disabled={busy}
            onChange={(event) => {
              ctx.setApiKey(event.target.value);
              setError('');
            }}
            placeholder="粘贴你的 DeepSeek API 密钥"
            maxLength={256}
          />
          <p className={styles.note}>
            密钥仅保留在当前页面内存，经本站服务端发送到
            DeepSeek；不会写入对话记录或浏览器存档。刷新后需重新填写。
          </p>
          <button
            className={styles.primary}
            disabled={busy || ctx.apiKey.trim().length < 8}
            type="submit"
          >
            {busy ? (
              <LoaderCircle size={16} className={styles.spinner} />
            ) : ctx.verified ? (
              <Check size={16} />
            ) : (
              <KeyRound size={16} />
            )}{' '}
            {busy ? '正在验证…' : '验证连接并读取模型'}
          </button>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          {ctx.verified && (
            <>
              <output className={styles.success}>
                连接已验证，可以开始交谈。
              </output>
              <label htmlFor="deepseek-model">对话模型</label>
              <select
                id="deepseek-model"
                value={ctx.model}
                onChange={(event) => ctx.setModel(event.target.value)}
              >
                {ctx.models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </>
          )}
        </form>
        <p className={styles.note}>
          每次点击发送才会调用 AI，并消耗你的 DeepSeek 额度。本次页面最多发送 20
          次；没有连接时可以体验预设话题。
        </p>
        <div className={styles.usage}>
          本次已发送 {ctx.requests} 次 · 已返回用量{' '}
          {ctx.tokens.toLocaleString()} tokens
        </div>
        <button className={styles.secondary} onClick={onClose}>
          回到街道
        </button>
      </DialogContent>
    </Dialog>
  );
}

export function FateConversation({
  target,
  speaker,
  onClose,
  onSettings,
}: {
  target: PartnerId;
  speaker: ActorId;
  onClose: () => void;
  onSettings: () => void;
}) {
  const ctx = useFate(),
    person = fatePerson(target)!;
  const [channel, setChannel] = useState<'preset' | 'deepseek'>(
    ctx.verified ? 'deepseek' : 'preset',
  );
  const [draft, setDraft] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const running = useRef<AbortController | null>(null),
    end = useRef<HTMLDivElement>(null);
  const history = conversationHistory(ctx.save, target, speaker);
  const speakerName =
    speaker === 'admin' ? '管理员' : fatePerson(speaker)!.name;
  useEffect(() => () => running.current?.abort(), []);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' });
  }, [ctx.save.history.length, busy]);
  function remember(
    message: string,
    reply: string,
    source: 'preset' | 'deepseek',
  ) {
    ctx.append({
      id: crypto.randomUUID(),
      target,
      speaker,
      message,
      reply,
      source,
      createdAt: new Date().toISOString(),
    });
  }
  function chooseTopic(topic: TopicId) {
    remember(
      TOPICS.find((t) => t.id === topic)!.text,
      presetReply(target, topic),
      'preset',
    );
  }
  async function send(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (
      running.current ||
      !message ||
      !ctx.verified ||
      !ctx.model ||
      ctx.requests >= 20
    )
      return;
    const controller = new AbortController();
    running.current = controller;
    setBusy(true);
    setError('');
    ctx.trackRequest();
    try {
      const response = await fetch('/api/fate/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          mode: 'chat',
          key: ctx.apiKey.trim(),
          model: ctx.model,
          target,
          speaker,
          message,
          history: history.map((e) => ({ message: e.message, reply: e.reply })),
          worldNote: ctx.save.worldNote,
          characterNote: ctx.save.characterNotes[target] || '',
          relationshipNote: ctx.save.relationshipNotes[target] || '',
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        reply?: string;
        tokens?: number | null;
      };
      if (!response.ok || typeof data.reply !== 'string')
        throw new Error(data.error || '没有收到回复，请重试。');
      if (controller.signal.aborted) return;
      remember(message, data.reply, 'deepseek');
      setDraft('');
      if (typeof data.tokens === 'number') ctx.trackTokens(data.tokens);
    } catch (error) {
      if (!controller.signal.aborted)
        setError(
          error instanceof Error ? error.message : '暂时无法发送，请重试。',
        );
    } finally {
      if (!controller.signal.aborted) setBusy(false);
      running.current = null;
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className={styles.conversation}
        style={{ width: 'min(940px, calc(100vw - 24px))', maxWidth: 'none' }}
      >
        <div className={styles.art}>
          <Image
            src={person.portraits[0].file}
            alt={`${person.name}，已确认的角色立绘`}
            fill
            sizes="(max-width: 650px) 30vw, 380px"
            style={{ objectFit: 'contain' }}
          />
          <span>{person.english}</span>
        </div>
        <div className={styles.panel}>
          <div className={styles.kicker}>F U Y U K I · 午后交谈</div>
          <DialogTitle className={styles.title}>{person.name}</DialogTitle>
          <DialogDescription>
            {person.traits.join(' · ')} · 交谈时街道暂歇
          </DialogDescription>
          <div className={styles.channels}>
            <button
              disabled={busy}
              aria-pressed={channel === 'preset'}
              onClick={() => setChannel('preset')}
            >
              预设话题
            </button>
            <button
              disabled={busy}
              aria-pressed={channel === 'deepseek'}
              onClick={() => setChannel('deepseek')}
            >
              DeepSeek 对话
            </button>
            <button
              onClick={onSettings}
              disabled={busy}
              title="AI 设置"
              aria-label="AI 设置"
            >
              <Settings2 size={16} />
            </button>
          </div>
          <div className={styles.messages} aria-label="近期对话记录">
            {!history.length && (
              <p className={styles.empty}>
                在街角停下脚步，聊点什么吧。
                <br />
                <small>
                  {channel === 'preset'
                    ? '预设话题使用已编写的台词，不会调用 AI。'
                    : '回复会参考双方身份与最近 8 轮交谈。'}
                </small>
              </p>
            )}
            {history.map((entry) => (
              <div key={entry.id} className={styles.exchange}>
                <div className={styles.player}>
                  <small>{speakerName}</small>
                  <p>{entry.message}</p>
                </div>
                <div className={styles.reply}>
                  <small>
                    {person.name}
                    <span>
                      {entry.source === 'deepseek' ? 'DeepSeek' : '预设台词'}
                    </span>
                  </small>
                  <p>{entry.reply}</p>
                </div>
              </div>
            ))}
            {busy && (
              <output className={styles.waiting}>
                <LoaderCircle size={15} className={styles.spinner} />
                {person.name}正在回应…
              </output>
            )}
            <div ref={end} />
          </div>
          {channel === 'preset' ? (
            <div className={styles.topics}>
              {TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  disabled={!ctx.loaded}
                  onClick={() => chooseTopic(topic.id)}
                >
                  {topic.text}
                </button>
              ))}
            </div>
          ) : !ctx.verified ? (
            <div className={styles.connectPrompt}>
              <p>填写密钥并验证连接后，即可自由输入对话。</p>
              <button className={styles.primary} onClick={onSettings}>
                <KeyRound size={15} />
                连接 DeepSeek
              </button>
            </div>
          ) : (
            <form
              onSubmit={(event) => {
                void send(event);
              }}
              className={styles.composer}
            >
              <label htmlFor="fate-message" className="sr-only">
                对{person.name}说些什么
              </label>
              <textarea
                id="fate-message"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={1200}
                disabled={busy || ctx.requests >= 20}
                placeholder={`对${person.name}说些什么…`}
                rows={2}
              />
              <div>
                <small>
                  {ctx.requests >= 20
                    ? '已达本次页面 20 次上限'
                    : `${ctx.model} · ${draft.length}/1200`}
                </small>
                <button
                  className={styles.primary}
                  type="submit"
                  disabled={
                    !ctx.loaded || busy || !draft.trim() || ctx.requests >= 20
                  }
                >
                  <Send size={15} />
                  {busy ? '等待回复' : '发送'}
                </button>
              </div>
            </form>
          )}
          {error && (
            <p className={styles.error} role="alert">
              {error} 输入内容已保留。
            </p>
          )}
          <p className={styles.note}>
            {ctx.storageNotice ||
              '最近 120 轮对话保存在此浏览器；不同人物之间分别记忆。'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
