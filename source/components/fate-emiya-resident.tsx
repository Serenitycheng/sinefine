import { fatePerson, type PartnerId } from '@/lib/fate-cast';
import { STREET_CAST } from '@/lib/fate-street-cast';
import {
  interiorDepth,
  interiorProject,
} from '@/lib/fate-city-interior-scenes';
import { EMIYA_ROOMS, EMIYA_ACTIVITIES } from '@/lib/fate-emiya-house';
import {
  SABER_WALK_SPRITES,
  SABER_LIFE_SPRITES,
  emiyaActivityPose,
  type EmiyaPose,
} from '@/lib/fate-emiya-actions';
import type { EmiyaResidentBody } from '@/lib/fate-emiya-residents';
import base from './fate-city-interior.module.css';
import styles from './fate-emiya-house.module.css';

/** Other visitors retain their existing identity sheet until their art is refined. */
export default function FateEmiyaResident({
  body,
  onChoose,
}: {
  body: EmiyaResidentBody;
  onChoose: (id: PartnerId) => void;
}) {
  const floor = EMIYA_ROOMS[body.room].scene.floor;
  const foot = interiorProject(body.point, floor);
  const depth = interiorDepth(body.point, floor);
  const sprite = STREET_CAST.find((person) => person.id === body.id)!;
  const height = body.id === 'illya' ? 250 : 295;
  const size = height * depth;
  const moving = body.phase !== 'doing' && body.frame > 0;
  const name = fatePerson(body.id)?.name ?? body.id;
  const pose: EmiyaPose | null =
    body.id === 'saber' && body.phase === 'doing'
      ? body.kind === 'sleep'
        ? 'sleep'
        : body.kind === 'read' || body.kind === 'study'
          ? 'read'
          : body.kind === 'cook'
            ? 'cook'
            : body.kind === 'eat'
              ? 'eat'
              : body.kind === 'rest' || body.kind === 'visit'
                ? 'sit'
                : null
      : null;
  const walkFrame =
    body.id === 'saber'
      ? SABER_WALK_SPRITES.frames[body.direction][body.frame]
      : null;
  const lifeFrame = pose
    ? SABER_LIFE_SPRITES.frames[pose][
        Math.floor(body.seconds / 0.85) % SABER_LIFE_SPRITES.frames[pose].length
      ]
    : null;
  const contact =
    pose === 'sleep'
      ? emiyaActivityPose(
          EMIYA_ACTIVITIES.find((activity) => activity.id === 'rest')!,
          body.seconds,
          'shirou',
        )
      : null;
  const actualFoot = contact ? interiorProject(contact.point, floor) : foot;
  const scale = lifeFrame
    ? depth * SABER_LIFE_SPRITES.scale
    : walkFrame
      ? (height * depth) / walkFrame.bounds.height
      : 1;
  const frame = lifeFrame ?? walkFrame;
  const sheet = lifeFrame ? SABER_LIFE_SPRITES : SABER_WALK_SPRITES;
  const frameStyle = frame
    ? {
        width: frame.width * scale,
        height: frame.height * scale,
        transform: `translate(${-frame.anchorX * scale}px,${-frame.anchorY * scale}px)`,
        backgroundImage: `url(${sheet.path})`,
        backgroundSize: `${sheet.width * scale}px ${sheet.height * scale}px`,
        backgroundPosition: `${-frame.x * scale}px ${-frame.y * scale}px`,
      }
    : {};
  return (
    <div
      className={base.actor}
      style={{
        left: actualFoot.x,
        top: actualFoot.y - (contact?.elevation ?? 0) * depth * 0.85,
        zIndex: contact?.z ?? Math.round(body.point.y) + 10,
      }}
      data-life-body={body.id}
      data-life-room={body.room}
      data-life-x={body.point.x.toFixed(3)}
      data-life-y={body.point.y.toFixed(3)}
      data-life-phase={body.phase}
      data-life-kind={body.kind}
      data-life-pose={pose ?? 'walk'}
      data-life-art={body.id === 'saber' ? 'soft-v1' : 'existing'}
    >
      <span className={base.shadow} style={{ transform: `scale(${depth})` }} />
      <button
        type="button"
        className={styles.bodyTarget}
        aria-label={`靠近${name}`}
        onClick={(event) => {
          event.stopPropagation();
          onChoose(body.id);
        }}
        style={{
          width: size,
          height: size,
          transform: `translate(${-size / 2}px,${-size}px) scaleX(${body.direction === 'left' ? -1 : 1})`,
          backgroundImage: `url(${sprite.image})`,
          backgroundSize: `400% ${sprite.rows * 100}%`,
          backgroundPosition: `${((moving ? body.frame % 4 : 0) / 3) * 100}% ${sprite.row * 100}%`,
          ...frameStyle,
        }}
      />
      <span
        className={styles.residentName}
        style={{ top: -(frame ? frame.bounds.height * scale : size) - 15 }}
      >
        {name}
      </span>
    </div>
  );
}
