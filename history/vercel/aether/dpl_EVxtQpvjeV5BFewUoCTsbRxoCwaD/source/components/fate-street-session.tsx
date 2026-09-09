'use client';
import StreetWalk from './street-walk';
import { useFate } from './fate-provider';

export default function FateStreetSession() {
  const { saveRevision } = useFate();
  return <StreetWalk key={saveRevision} />;
}
