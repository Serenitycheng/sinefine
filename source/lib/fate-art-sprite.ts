import type { SampleDirection } from './fate-art-sample';

// Measured alpha bounds and upper-body centers in the generated 256px cells.
// Align the planted feet in code; preserve the original painted pixels and alpha.
export const ART_SPRITE_FRAMES: Record<
  SampleDirection,
  readonly { x: number; y: number; scale: number }[]
> = {
  down: [
    {
      x: 150,
      y: 254,
      scale: 0.9959,
    },
    {
      x: 151,
      y: 254,
      scale: 1.0042,
    },
    {
      x: 138,
      y: 254,
      scale: 0.9877,
    },
    {
      x: 117,
      y: 252,
      scale: 1.0084,
    },
    {
      x: 105,
      y: 254,
      scale: 1.0042,
    },
    {
      x: 105,
      y: 254,
      scale: 1,
    },
  ],
  left: [
    {
      x: 157,
      y: 254,
      scale: 0.9877,
    },
    {
      x: 154,
      y: 254,
      scale: 0.9796,
    },
    {
      x: 149,
      y: 253,
      scale: 0.9877,
    },
    {
      x: 130,
      y: 254,
      scale: 0.9836,
    },
    {
      x: 132,
      y: 253,
      scale: 1.0042,
    },
    {
      x: 141,
      y: 253,
      scale: 1.0042,
    },
  ],
  right: [
    {
      x: 137,
      y: 252,
      scale: 0.9877,
    },
    {
      x: 136,
      y: 250,
      scale: 0.9836,
    },
    {
      x: 131,
      y: 250,
      scale: 0.9836,
    },
    {
      x: 106,
      y: 251,
      scale: 0.9917,
    },
    {
      x: 105,
      y: 250,
      scale: 1,
    },
    {
      x: 101,
      y: 253,
      scale: 0.9717,
    },
  ],
  up: [
    {
      x: 148,
      y: 235,
      scale: 1.039,
    },
    {
      x: 155,
      y: 234,
      scale: 1.039,
    },
    {
      x: 141,
      y: 234,
      scale: 1.0345,
    },
    {
      x: 123,
      y: 234,
      scale: 1.048,
    },
    {
      x: 116,
      y: 237,
      scale: 1.0213,
    },
    {
      x: 112,
      y: 238,
      scale: 1.0256,
    },
  ],
};
