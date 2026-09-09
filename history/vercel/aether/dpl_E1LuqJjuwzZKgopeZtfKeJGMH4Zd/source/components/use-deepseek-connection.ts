'use client';
import { useEffect, useRef, useState } from 'react';
import { forgetConnection, readSavedConnection, saveConnection } from '@/lib/deepseek-connection';

export function useDeepSeekConnection() {
  const [apiKey, setKey] = useState(''), [model, setModel] = useState('');
  const [models, setModels] = useState<string[]>([]), [verified, setVerified] = useState(false);
  const [rememberKey, setRemember] = useState(false), [checkingConnection, setChecking] = useState(false);
  const [connectionNotice, setNotice] = useState('');
  const restoreRequest = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    restoreRequest.current = controller;
    queueMicrotask(async () => {
      if (controller.signal.aborted) return;
      try {
        const saved = readSavedConnection(localStorage);
        if (!saved) return;
        setKey(saved.key); setModel(saved.model); setRemember(true); setChecking(true);
        setNotice('正在恢复本浏览器保存的连接…');
        // /models checks the key without generating text or spending conversation quota.
        const response = await fetch('/api/fate/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ mode: 'test', key: saved.key }) });
        const data = await response.json();
        if (controller.signal.aborted) return;
        if (!response.ok || !Array.isArray(data.models) || !data.models.length || !data.models.every((id: unknown) => typeof id === 'string' && /^[a-zA-Z0-9._:/-]{1,100}$/.test(id))) throw new Error('恢复验证未通过');
        setModels(data.models); setModel(data.models.includes(saved.model) ? saved.model : data.models[0]);
        setVerified(true); setNotice('已恢复此浏览器保存的 DeepSeek 连接。');
      } catch {
        if (!controller.signal.aborted) setNotice('未能恢复连接。密钥如仍有效，可点验证重试；也可以更换密钥。');
      } finally { if (!controller.signal.aborted) setChecking(false); }
    });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!verified || !rememberKey) return;
    try {
      saveConnection(localStorage, true, { version: 1, key: apiKey.trim(), model });
      queueMicrotask(() => setNotice('已记住此浏览器，刷新后会自动恢复连接。'));
    } catch {
      queueMicrotask(() => setNotice('浏览器未能保存密钥；本次仍可使用，刷新后需重新填写。'));
    }
  }, [apiKey, model, rememberKey, verified]);
  function setRememberKey(value: boolean) {
    if (!value) {
      try { forgetConnection(localStorage); }
      catch { setNotice('未能清除此浏览器的连接记录，请在浏览器站点设置中清除本网站数据。'); return; }
    }
    setRemember(value);
    setNotice(value ? '验证成功后会记住此浏览器。' : '已关闭记住功能，当前连接仅临时保留。');
  }
  function setApiKey(key: string) {
    restoreRequest.current?.abort(); setChecking(false);
    setKey(key); setVerified(false); setModels([]); setModel(''); setNotice('');
    // Remove the previous verified key as soon as it is intentionally replaced.
    try { forgetConnection(localStorage); }
    catch { setNotice('旧连接未能从浏览器清除，请检查网站存储权限。'); }
  }
  function clearConnection() {
    try { forgetConnection(localStorage); }
    catch { setNotice('未能清除保存的连接，请检查网站存储权限。'); return; }
    restoreRequest.current?.abort(); setChecking(false);
    setKey(''); setVerified(false); setModels([]); setModel(''); setRemember(false);
    setNotice('已清除此浏览器保存的密钥，并断开当前连接。');
  }
  return { apiKey, setApiKey, model, setModel, models, setModels, verified, setVerified, rememberKey, setRememberKey, checkingConnection, connectionNotice, clearConnection };
}
