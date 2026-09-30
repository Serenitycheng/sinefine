'use client';
import StreetWalk from './street-walk';
import { useFate } from './fate-provider';
import { useBackgroundLife } from './use-background-life';
import { FateBackgroundPanel } from './fate-background-panel';

export default function FateStreetSession() {
  const { saveRevision, storageBlocked } = useFate();
  const background = useBackgroundLife();
  if (storageBlocked)
    return (
      <main style={{ padding: '32px 24px', lineHeight: 1.9 }}>
        <h1>冬木的日常已暂停</h1>
        <p>请先处理上方的存档提示。读取最新进度后，可以回到街道继续。</p>
      </main>
    );
  return (
    <>
      <FateBackgroundPanel background={background} />
      <div inert={background.suspended}>
        <StreetWalk key={saveRevision} suspended={background.suspended} />
      </div>
    </>
  );
}
