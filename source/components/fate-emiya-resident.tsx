import { fatePerson, type PartnerId } from '@/lib/fate-cast';
import { STREET_CAST } from '@/lib/fate-street-cast';
import {
  interiorDepth,
  interiorProject,
} from '@/lib/fate-city-interior-scenes';
import { EMIYA_ROOMS } from '@/lib/fate-emiya-house';
import { emiyaResidentPresentation } from '@/lib/fate-emiya-presentation';
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
  const presentation = emiyaResidentPresentation(body);
  const contact = presentation?.contact;
  const actualFoot = contact ? interiorProject(contact.point, floor) : foot;
  const contactDepth = contact ? interiorDepth(contact.point, floor) : depth;
  const scale = presentation ? contactDepth * presentation.scale : 1;
  const frame = presentation?.frame;
  const sheet = presentation?.sheet;
  const frameStyle = frame
    ? {
        width: frame.width * scale,
        height: frame.height * scale,
        transform: `translate(${-(presentation?.mirror ? frame.width - frame.anchorX : frame.anchorX) * scale}px,${-frame.anchorY * scale}px)${presentation?.mirror ? ' scaleX(-1)' : ''}`,
        backgroundImage: `url(${sheet!.path})`,
        backgroundSize: `${sheet!.width * scale}px ${sheet!.height * scale}px`,
        backgroundPosition: `${-frame.x * scale}px ${-frame.y * scale}px`,
      }
    : {};
  return (
    <div
      className={base.actor}
      style={{
        left: actualFoot.x,
        top: actualFoot.y - (contact?.elevation ?? 0) * contactDepth * 0.85,
        zIndex: contact?.z ?? Math.round(body.point.y) + 10,
      }}
      data-life-body={body.id}
      data-life-room={body.room}
      data-life-x={body.point.x.toFixed(3)}
      data-life-y={body.point.y.toFixed(3)}
      data-life-phase={body.phase}
      data-life-kind={body.kind}
      data-life-pose={contact?.pose ?? 'walk'}
      data-life-art={
        body.id === 'saber'
          ? contact
            ? 'life-soft-v3'
            : 'soft-v1'
          : presentation
            ? 'visit-soft-v1'
            : 'existing'
      }
      data-life-frame={body.frame}
      data-life-scale={scale}
      data-life-contact-x={contact?.point.x ?? body.point.x}
      data-life-contact-y={contact?.point.y ?? body.point.y}
      data-life-elevation={contact?.elevation ?? 0}
    >
      <span
        className={base.shadow}
        style={{
          transform: `scale(${depth})`,
          opacity: contact?.elevation ? 0 : 1,
        }}
      />
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
        style={{
          top: (frame ? (frame.bounds.y - frame.anchorY) * scale : -size) - 22,
        }}
      >
        {name}
      </span>
    </div>
  );
}
