'use client';
import StreetWalk from './street-walk';
import { useFate } from './fate-provider';

export default function FateStreetSession() {
  const { saveRevision, storageBlocked } = useFate();
  if (storageBlocked)
    return (
      <main style={{ padding: '32px 24px', lineHeight: 1.9 }}>
        <h1>冬木的日常已暂停</h1>
        <p>请先处理上方的存档提示。读取最新进度后，可以回到街道继续。</p>
      </main>
    );
  return <StreetWalk key={saveRevision} />;
}
