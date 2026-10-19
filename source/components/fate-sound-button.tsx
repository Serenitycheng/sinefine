'use client';
import { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { fateAudio } from '@/lib/fate-audio';
export function FateSoundButton() {
  const [enabled, setEnabled] = useState(false),
    [state, setState] = useState('muted');
  useEffect(() => {
    const update = () => {
      setEnabled(fateAudio.enabled);
      setState(fateAudio.state);
    };
    const unsubscribe = fateAudio.subscribe(update);
    fateAudio.initialize();
    update();
    return unsubscribe;
  }, []);
  return (
    <button
      type="button"
      data-game-audio={state}
      aria-label={enabled ? '关闭环境声音' : '开启环境声音'}
      aria-pressed={enabled}
      title={
        state === 'blocked'
          ? '声音未能开启，点击后重试'
          : enabled
            ? '关闭环境声音'
            : '开启环境声音'
      }
      onClick={() => void fateAudio.toggle()}
    >
      {enabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
    </button>
  );
}
