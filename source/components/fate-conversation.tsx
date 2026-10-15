'use client';
import {
  useEffect,
  useRef,
  useState,
  type SubmitEvent,
  type KeyboardEvent,
} from 'react';
import Image from 'next/image';
import { KeyRound, LoaderCircle, Send, Settings2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFate } from './fate-provider';
import {
  fatePerson,
  fateArtwork,
  presetReply,
  TOPICS,
  type PartnerId,
  type TopicId,
  isPartner,
} from '@/lib/fate-cast';
import {
  LIFE_TOPICS,
  lifeTopic,
  type LifeTopic,
} from '@/lib/fate-conversation-presets';
import { conversationSummary } from '@/lib/fate-social';
import { conversationHistory, type Exchange } from '@/lib/fate-state';
import type { InteractionStatus } from '@/lib/fate-interaction';
import { lifeScene } from '@/lib/fate-life';
import { familyTopic } from '@/lib/fate-relationships';
import { dialogueLines } from '@/lib/fate-dialogue';
import { isChatSendKey } from '@/lib/fate-chat-input';
import type { ActorId } from '@/lib/street';
import styles from './fate-conversation.module.css';

export { FateAISettings } from './fate-ai-settings';

export function FateConversation({
  target,
  speaker,
  onClose,
  onSettings,
  onsite,
}: {
  target: PartnerId;
  speaker: ActorId;
  onClose: () => void;
  onSettings: () => void;
  onsite?: {
    check: () => InteractionStatus;
    commit: (entry: Exchange, effects?: unknown) => InteractionStatus;
  };
}) {
  const ctx = useFate(),
    person = fatePerson(target, ctx.save.life?.waverStage ?? 'young')!;
  const waverStage = ctx.save.life?.waverStage ?? 'young';
  const artwork = fateArtwork(person);
  const [channel, setChannel] = useState<'preset' | 'deepseek'>(
    ctx.verified ? 'deepseek' : 'preset',
  );
  const [draft, setDraft] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const running = useRef<AbortController | null>(null),
    composing = useRef(false),
    end = useRef<HTMLDivElement>(null),
    popup = useRef<HTMLDivElement>(null);
  const history = conversationHistory(ctx.save, target, speaker);
  const latestExchange = history.at(-1)?.id;
  const speakerName =
    speaker === 'admin' ? '管理员' : fatePerson(speaker, waverStage)!.name;
  useEffect(() => () => running.current?.abort(), []);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    let frame = 0;
    const fitViewport = () => {
      const element = popup.current;
      if (!element) return;
      element.style.setProperty(
        '--conversation-height',
        `${viewport.height}px`,
      );
      element.style.setProperty(
        '--conversation-center',
        `${viewport.offsetTop + viewport.height / 2}px`,
      );
      element.dataset.compactHeight = String(viewport.height < 560);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const focused = document.activeElement;
        if (focused instanceof HTMLTextAreaElement && element.contains(focused))
          focused.scrollIntoView({ block: 'nearest' });
      });
    };
    fitViewport();
    viewport.addEventListener('resize', fitViewport);
    viewport.addEventListener('scroll', fitViewport);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', fitViewport);
      viewport.removeEventListener('scroll', fitViewport);
    };
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' });
  }, [latestExchange, busy]);
  function remember(
    message: string,
    reply: string,
    source: 'preset' | 'deepseek',
    effects?: unknown,
  ) {
    const entry: Exchange = {
      id: crypto.randomUUID(),
      ...([speaker, target].includes('waver') ? { waverStage } : {}),
      target,
      speaker,
      message,
      reply,
      source,
      createdAt: new Date().toISOString(),
    };
    const result = onsite
      ? onsite.commit(entry, effects)
      : { ok: ctx.append(entry), message: '暂时无法保存这次交谈。' };
    if (!result.ok) setError(result.message);
    return result.ok;
  }
  function canTalk() {
    const status = onsite?.check();
    if (status && !status.ok) {
      setError(status.message);
      return false;
    }
    return true;
  }
  function chooseTopic(topic: TopicId) {
    if (!canTalk()) return;
    setError('');
    const specific = familyTopic(speaker, target, topic);
    remember(
      specific?.message ?? TOPICS.find((t) => t.id === topic)!.text,
      specific?.reply ?? presetReply(target, topic, waverStage),
      'preset',
    );
  }
  function chooseLifeTopic(topic: LifeTopic) {
    if (!canTalk() || !isPartner(speaker) || !ctx.save.life) return;
    setError('');
    const result = lifeTopic(ctx.save.life, speaker, target, topic);
    remember(result.message, result.reply, 'preset', result.effects);
  }
  function composerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!isChatSendKey(event.nativeEvent, composing.current)) return;
    event.preventDefault();
    if (
      event.repeat ||
      busy ||
      running.current ||
      !draft.trim() ||
      !ctx.loaded ||
      !ctx.verified ||
      !ctx.model ||
      ctx.requests >= 20
    )
      return;
    event.currentTarget.form?.requestSubmit();
  }
  async function send(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (
      running.current ||
      !ctx.loaded ||
      !message ||
      !ctx.verified ||
      !ctx.model ||
      ctx.requests >= 20
    )
      return;
    if (!canTalk()) return;
    if (!ctx.reserveRequest()) return;
    const controller = new AbortController();
    running.current = controller;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/fate/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          mode: 'chat',
          ...(ctx.cloudMode
            ? { connection: 'cloud' }
            : { key: ctx.apiKey.trim() }),
          model: ctx.model,
          target,
          speaker,
          message,
          socialEffects: Boolean(onsite && isPartner(speaker)),
          history: history.map(
            ({ message, reply, turns, speaker, target }) => ({
              message,
              reply,
              turns,
              speaker,
              target,
            }),
          ),
          worldNote: ctx.save.worldNote,
          characterNotes: ctx.save.characterNotes,
          relationshipNotes: ctx.save.relationshipNotes,
          waverStage,
          housing: ctx.save.life?.housing,
          ...(ctx.save.life
            ? {
                scene: lifeScene(
                  ctx.save.life,
                  target,
                  isPartner(speaker) ? speaker : undefined,
                ),
              }
            : {}),
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        reply?: string;
        tokens?: number | null;
        effects?: unknown;
      };
      if (!response.ok || typeof data.reply !== 'string')
        throw new Error(data.error || '没有收到回复，请重试。');
      if (controller.signal.aborted) return;
      if (typeof data.tokens === 'number') ctx.trackTokens(data.tokens);
      if (remember(message, data.reply, 'deepseek', data.effects)) setDraft('');
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
        ref={popup}
        className={styles.conversation}
        style={{
          width: 'min(940px, calc(100vw - 24px))',
          maxWidth: 'none',
          top: 'var(--conversation-center, 50%)',
        }}
      >
        <div className={styles.art}>
          {artwork && (
            <Image
              src={artwork.file}
              alt={`${person.name}，${artwork.label}`}
              fill
              sizes="(max-width: 650px) 30vw, 380px"
              style={{ objectFit: 'contain' }}
            />
          )}
          <span>{person.english}</span>
        </div>
        <div className={styles.panel}>
          <div className={styles.kicker}>日常交谈</div>
          <DialogTitle className={styles.title}>{person.name}</DialogTitle>
          <DialogDescription>
            {ctx.save.characterNotes[target]
              ? '使用你调整后的人物设定'
              : person.traits.join(' · ')}{' '}
            · {onsite ? '现场交谈 · ' : ''}交谈时街道暂歇
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
                选择一个话题开始交谈。
                <br />
                <small>
                  {channel === 'preset'
                    ? '预设话题使用已编写的台词，不会调用 AI。'
                    : '回复会参考世界设定、人物关系与最近 8 轮交谈。'}
                </small>
              </p>
            )}
            {history.map((entry) => {
              const result = ctx.save.life?.events.find(
                (e) => e.interaction?.exchangeId === entry.id,
              )?.conversation;
              return (
                <div key={entry.id} className={styles.exchange}>
                  {dialogueLines(entry).map((turn, index) => (
                    <div
                      key={index}
                      className={
                        turn.speaker === speaker ? styles.player : styles.reply
                      }
                    >
                      <small>
                        {turn.speaker === speaker ? speakerName : person.name}
                        <span>
                          {entry.source === 'deepseek'
                            ? 'DeepSeek'
                            : '预设台词'}
                        </span>
                      </small>
                      <p>{turn.text}</p>
                    </div>
                  ))}
                  {result && (
                    <div
                      className={styles.outcome}
                      aria-label="这次交谈的结果"
                      aria-live={
                        entry.id === history.at(-1)?.id ? 'polite' : undefined
                      }
                    >
                      <b>这次交谈</b>
                      {conversationSummary(result, waverStage).map(
                        (line, i) => (
                          <p key={i}>{line}</p>
                        ),
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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
                  disabled={!ctx.loaded || busy}
                  onClick={() => chooseTopic(topic.id)}
                >
                  {topic.text}
                </button>
              ))}
              {onsite && isPartner(speaker) && ctx.save.life && (
                <>
                  <div className={styles.lifeTopics} aria-label="日常话题">
                    {LIFE_TOPICS.slice(0, 3).map((topic) => (
                      <button
                        key={topic.id}
                        disabled={!ctx.loaded || busy}
                        onClick={() => chooseLifeTopic(topic.id)}
                      >
                        {topic.label}
                      </button>
                    ))}
                  </div>
                  <details className={styles.inviteTopics}>
                    <summary>约下次见面</summary>
                    <p>双方约好后才会安排；你控制的人物仍由你带去赴约。</p>
                    {LIFE_TOPICS.slice(3).map((topic) => (
                      <button
                        key={topic.id}
                        disabled={!ctx.loaded || busy}
                        onClick={() => chooseLifeTopic(topic.id)}
                      >
                        {topic.label}
                      </button>
                    ))}
                  </details>
                </>
              )}
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
                onKeyDown={composerKeyDown}
                onCompositionStart={() => {
                  composing.current = true;
                }}
                onCompositionEnd={() => {
                  composing.current = false;
                }}
                aria-describedby="fate-message-shortcuts"
                maxLength={1200}
                disabled={busy || ctx.requests >= 20}
                placeholder={`对${person.name}说些什么…`}
                rows={2}
              />
              <small id="fate-message-shortcuts">
                Enter 发送 · Shift + Enter 换行
              </small>
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
              {error}
              {channel === 'deepseek' ? ' 输入内容已保留。' : ''}
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
