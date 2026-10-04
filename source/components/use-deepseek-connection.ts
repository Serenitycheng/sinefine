'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  forgetConnection,
  readSavedConnection,
  saveConnection,
} from '@/lib/deepseek-connection';
import { requestFateJson } from '@/lib/fate-cloud-client';
type AccountStatus = {
  configured: boolean;
  username: string | null;
  connection: { model: string; updatedAt: string } | null;
};
type ModelReply = { models?: unknown; model: string };
type AccountReply = {
  username: string | null;
  recoveryCode?: string;
  loginRequired?: boolean;
  notice: string;
};
function send<T = ModelReply>(
  path: string,
  body?: unknown,
  method = 'POST',
  signal?: AbortSignal,
) {
  return requestFateJson<T>(path, { method, body, signal });
}
function validModels(data: { models?: unknown }): string[] {
  if (
    !Array.isArray(data.models) ||
    !data.models.length ||
    !data.models.every(
      (id) => typeof id === 'string' && /^[a-zA-Z0-9._:/-]{1,100}$/.test(id),
    )
  )
    throw new Error('没有读取到可用模型。');
  return data.models;
}
export function useDeepSeekConnection() {
  const [apiKey, setKey] = useState(''),
    [model, setModel] = useState('');
  const [models, setModels] = useState<string[]>([]),
    [verified, setVerified] = useState(false);
  const [rememberKey, setRemember] = useState(false),
    [checkingConnection, setChecking] = useState(false);
  const [connectionNotice, setNotice] = useState('');
  const [cloudUsername, setUsername] = useState<string | null>(null);
  const [cloudConfigured, setConfigured] = useState<boolean | null>(null);
  const [cloudAccountLoading, setAccountLoading] = useState(true);
  const [cloudSaved, setCloudSaved] = useState(false),
    [cloudMode, setCloudMode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const request = useRef<AbortController | null>(null);
  const ready = useRef(false),
    modeRef = useRef(false);
  useEffect(() => {
    modeRef.current = cloudMode;
  }, [cloudMode]);
  const restore = useCallback(async (signal: AbortSignal, initial: boolean) => {
    let foundCloud = false;
    try {
      const account = await send<AccountStatus>(
        '/api/fate/account',
        undefined,
        'GET',
        signal,
      );
      if (signal.aborted) return;
      setAccountLoading(false);
      setConfigured(account.configured);
      setUsername(account.username);
      setCloudSaved(Boolean(account.connection));
      if (!account.configured)
        setNotice(
          '当前可使用本浏览器连接，填写 DeepSeek 密钥并验证后即可交谈。',
        );
      if (account.username && account.connection) {
        foundCloud = true;
        setCloudMode(true);
        setKey('');
        setRemember(false);
        setChecking(true);
        setVerified(false);
        setModel(account.connection.model);
        setNotice('正在恢复账号保存的连接…');
        const data = await send(
          '/api/fate/chat',
          { mode: 'test', connection: 'cloud' },
          'POST',
          signal,
        );
        if (signal.aborted) return;
        const ids = validModels(data);
        setModels(ids);
        setModel(
          ids.includes(account.connection.model)
            ? account.connection.model
            : ids[0],
        );
        setVerified(true);
        setNotice('已从游戏账号恢复 DeepSeek 连接，密钥仍保存在云端。');
        return;
      }
      if (!initial && modeRef.current) {
        setCloudMode(false);
        setVerified(false);
        setModels([]);
        setModel('');
        setKey('');
        setNotice(
          account.username
            ? '此账号的云端连接已被清除。'
            : '游戏账号已退出，请重新登录恢复连接。',
        );
      }
    } catch {
      if (signal.aborted) return;
      setAccountLoading(false);
      if (foundCloud || modeRef.current) {
        setVerified(false);
        setNotice(
          '密钥仍保存在账号中，但暂时无法恢复连接。请稍后点击验证重试。',
        );
        return;
      }
      setNotice('暂时无法读取云端账号；可以先使用本浏览器连接。');
    } finally {
      if (!signal.aborted) setChecking(false);
    }
    if (!initial || signal.aborted) return;
    try {
      const saved = readSavedConnection(localStorage);
      if (!saved) return;
      setKey(saved.key);
      setModel(saved.model);
      setRemember(true);
      setChecking(true);
      const data = await send(
        '/api/fate/chat',
        { mode: 'test', key: saved.key },
        'POST',
        signal,
      );
      if (signal.aborted) return;
      const ids = validModels(data);
      setModels(ids);
      setModel(ids.includes(saved.model) ? saved.model : ids[0]);
      setVerified(true);
      setNotice('已恢复此浏览器保存的连接。登录游戏账号后，可将它保存到云端。');
    } catch {
      if (!signal.aborted)
        setNotice('本浏览器的连接暂未通过验证，可点击验证重试。');
    } finally {
      if (!signal.aborted) setChecking(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    request.current = controller;
    queueMicrotask(() => {
      if (!controller.signal.aborted)
        void restore(controller.signal, true).finally(() => {
          if (!controller.signal.aborted) {
            ready.current = true;
            setAccountLoading(false);
          }
        });
    });
    const focus = () => {
      if (!ready.current || document.hidden || !modeRef.current) return;
      const next = new AbortController();
      request.current?.abort();
      request.current = next;
      void restore(next.signal, false);
    };
    window.addEventListener('focus', focus);
    return () => {
      request.current?.abort();
      window.removeEventListener('focus', focus);
    };
  }, [restore]);
  useEffect(() => {
    if (!verified || !rememberKey || cloudMode) return;
    try {
      saveConnection(localStorage, true, {
        version: 1,
        key: apiKey.trim(),
        model,
      });
      queueMicrotask(() => setNotice('已记住此浏览器，刷新后会自动恢复连接。'));
    } catch {
      queueMicrotask(() =>
        setNotice('浏览器未能保存密钥；本次仍可使用，刷新后需重新填写。'),
      );
    }
  }, [apiKey, model, rememberKey, verified, cloudMode]);
  function operation() {
    request.current?.abort();
    const next = new AbortController();
    request.current = next;
    ready.current = true;
    setAccountLoading(false);
    setChecking(true);
    return next.signal;
  }
  function setRememberKey(value: boolean) {
    if (!value) {
      try {
        forgetConnection(localStorage);
      } catch {
        setNotice('未能清除本地连接，请检查浏览器的存储权限。');
        return;
      }
    }
    setRemember(value);
    setNotice(
      value
        ? '验证成功后会记住此浏览器。'
        : '已关闭记住功能，当前连接仅临时保留。',
    );
  }
  function setApiKey(value: string) {
    request.current?.abort();
    ready.current = true;
    setAccountLoading(false);
    setChecking(false);
    setKey(value);
    setCloudMode(false);
    setVerified(false);
    setModels([]);
    setModel('');
    setNotice('');
    // Failed replacement never deletes the previous cloud or browser record.
  }
  async function verifyConnection() {
    const signal = operation();
    setVerified(false);
    try {
      const data = await send(
        '/api/fate/chat',
        {
          mode: 'test',
          ...(cloudMode ? { connection: 'cloud' } : { key: apiKey.trim() }),
        },
        'POST',
        signal,
      );
      if (signal.aborted) return;
      const ids = validModels(data);
      setModels(ids);
      setModel(ids.includes(model) ? model : ids[0]);
      setVerified(true);
      setNotice(
        cloudMode
          ? '云端连接已验证，换浏览器后登录同一账号即可恢复。'
          : '连接已验证。登录后可保存到账号，或选择记住此浏览器。',
      );
    } finally {
      if (!signal.aborted) setChecking(false);
    }
  }
  async function accountAction(
    action: 'login' | 'signup' | 'recover',
    values: { username: string; password: string; recoveryCode?: string },
  ) {
    const signal = operation();
    try {
      const result = await send<AccountReply>(
        '/api/fate/account',
        { action, ...values },
        'POST',
        signal,
      );
      if (signal.aborted) return;
      setUsername(result.username);
      setConfigured(true);
      setRecoveryCode(result.recoveryCode || '');
      if (result.loginRequired) {
        setNotice(result.notice);
        return;
      }
      await restore(signal, false);
    } finally {
      if (!signal.aborted) setChecking(false);
    }
  }
  async function saveToCloud() {
    const signal = operation();
    try {
      const data = await send(
        '/api/fate/connection',
        { key: apiKey.trim(), model },
        'POST',
        signal,
      );
      if (signal.aborted) return;
      setModels(validModels(data));
      setModel(data.model);
      setCloudSaved(true);
      setCloudMode(true);
      setVerified(true);
      setRemember(false);
      setKey('');
      try {
        forgetConnection(localStorage);
        setNotice(
          '已加密保存到游戏账号。换浏览器登录同一账号即可恢复；本地旧密钥已清除。',
        );
      } catch {
        setNotice(
          '已保存到游戏账号，但本浏览器旧记录未能清除，请检查网站存储权限。',
        );
      }
    } finally {
      if (!signal.aborted) setChecking(false);
    }
  }
  async function chooseModel(value: string) {
    if (!cloudMode) {
      setModel(value);
      return;
    }
    const signal = operation();
    try {
      await send('/api/fate/connection', { model: value }, 'PATCH', signal);
      if (!signal.aborted) setModel(value);
    } finally {
      if (!signal.aborted) setChecking(false);
    }
  }
  function clearConnection() {
    let cleared = true;
    try {
      forgetConnection(localStorage);
    } catch {
      cleared = false;
    }
    request.current?.abort();
    setAccountLoading(false);
    setChecking(false);
    setKey('');
    setVerified(false);
    setModels([]);
    setModel('');
    setRemember(false);
    setCloudMode(false);
    setNotice(
      cleared
        ? '已清除此浏览器的密钥。账号中的云端连接不受影响。'
        : '当前连接已断开，但本地记录未能清除，请检查网站存储权限。',
    );
    return cleared;
  }
  async function useCloudConnection() {
    const signal = operation();
    try {
      await restore(signal, false);
    } finally {
      if (!signal.aborted) setChecking(false);
    }
  }
  async function logout() {
    const signal = operation();
    try {
      await send('/api/fate/account', { action: 'logout' }, 'POST', signal);
      if (!signal.aborted) {
        const cleared = clearConnection();
        setUsername(null);
        setCloudSaved(false);
        setRecoveryCode('');
        setNotice(
          cleared
            ? '已退出本浏览器，密钥仍保存在游戏账号中。'
            : '已退出账号并断开当前连接，但本地旧记录未能清除，请检查网站存储权限。',
        );
      }
    } finally {
      if (!signal.aborted) setChecking(false);
    }
  }
  async function deleteCloudConnection() {
    const signal = operation();
    try {
      await send('/api/fate/connection', undefined, 'DELETE', signal);
      if (!signal.aborted) {
        const cleared = clearConnection();
        setCloudSaved(false);
        setNotice(
          cleared
            ? '已删除此账号保存的 DeepSeek 密钥。'
            : '云端密钥已删除，当前连接已断开，但本地旧记录未能清除，请检查网站存储权限。',
        );
      }
    } finally {
      if (!signal.aborted) setChecking(false);
    }
  }
  return {
    apiKey,
    setApiKey,
    model,
    models,
    verified,
    rememberKey,
    setRememberKey,
    checkingConnection,
    connectionNotice,
    clearConnection,
    cloudUsername,
    cloudConfigured,
    cloudAccountLoading,
    cloudSaved,
    cloudMode,
    recoveryCode,
    dismissRecoveryCode: () => setRecoveryCode(''),
    verifyConnection,
    accountAction,
    saveToCloud,
    chooseModel,
    logout,
    deleteCloudConnection,
    useCloudConnection,
  };
}
