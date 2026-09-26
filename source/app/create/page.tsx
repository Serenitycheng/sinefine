import type { Metadata } from 'next';
import { CreativeStudio } from '@/components/creative-studio';
import { WorldHeader, WorldFooter } from '@/components/world-navigation';
import styles from '@/components/world-entry.module.css';

export const metadata: Metadata = {
  title: '自由创造 · SINE FINE｜无终之庭',
  description:
    '从原创模板或一页空白开始，设定人物，观察日常，保存属于你的世界。',
};

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string | string[] }>;
}) {
  const { template } = await searchParams;
  const initialTemplate =
    template === 'coastal' || template === 'academy' || template === 'orbital'
      ? template
      : 'custom';
  return (
    <div className={styles.shell}>
      <WorldHeader active="worlds" />
      <CreativeStudio key={initialTemplate} initialTemplate={initialTemplate} />
      <WorldFooter />
    </div>
  );
}
