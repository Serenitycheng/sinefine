export type InteractionMotion = 'look' | 'read' | 'wrap' | 'pour' | 'work';
export function interactionArms(b: {
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  return {
    left: b.x + b.width * 0.08,
    right: b.x + b.width * 0.73,
    top: b.y + b.height * 0.37,
    bottom: b.y + b.height * 0.7,
    width: b.width * 0.19,
  };
}
export function interactionMotion(label: string): InteractionMotion {
  if (/包装|丝带|纸袋|装袋/.test(label)) return 'wrap';
  if (/书|阅读|笔记|报纸|杂志|说明|课本/.test(label)) return 'read';
  if (/水槽|水壶|茶|咖啡|杯|花桶|清洗/.test(label)) return 'pour';
  if (/整理|灶台|工具|修理|备餐/.test(label)) return 'work';
  return 'look';
}
