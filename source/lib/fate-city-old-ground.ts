import type { CityPoint } from './fate-city-layout';
import type { CityArtMode } from './fate-city-art-camera';

const p = (x: number, y: number): CityPoint => ({ x, y });
type OldGround = {
  centers: readonly CityPoint[];
  east: readonly CityPoint[];
  west: readonly CityPoint[];
  doors: { waver: CityPoint; bookshop: CityPoint };
  paving: readonly (readonly CityPoint[])[];
  horizon: number;
  heightReference: number;
};

/** Independently measured from each complete painting. East/west retain
 * geographic meaning even where the camera makes them screen-left/right. */
export const OLD_STREET_GROUND: Record<CityArtMode, OldGround> = {
  overview: {
    centers: [
      p(55, 823),
      p(155, 800),
      p(305, 756),
      p(490, 696),
      p(745, 618),
      p(1024, 535),
      p(1350, 422),
    ],
    east: [
      p(84, 909),
      p(203, 899),
      p(346, 858),
      p(535, 803),
      p(792, 721),
      p(1074, 637),
      p(1394, 518),
    ],
    west: [
      p(38, 740),
      p(138, 707),
      p(285, 661),
      p(470, 598),
      p(723, 514),
      p(963, 475),
      p(1330, 348),
    ],
    doors: { bookshop: p(427, 535), waver: p(888, 325) },
    paving: [
      [
        p(0, 746),
        p(525, 567),
        p(710, 518),
        p(1160, 389),
        p(1495, 243),
        p(1672, 100),
        p(1672, 477),
        p(1100, 655),
        p(300, 900),
        p(0, 941),
      ],
      [
        p(257, 637),
        p(277, 580),
        p(388, 536),
        p(443, 511),
        p(540, 527),
        p(611, 571),
        p(589, 610),
      ],
      [
        p(801, 517),
        p(818, 469),
        p(842, 371),
        p(862, 325),
        p(922, 303),
        p(969, 380),
        p(994, 455),
        p(1089, 500),
      ],
    ],
    horizon: 0,
    heightReference: 1,
  },
  along: {
    centers: [
      p(380, 914),
      p(510, 880),
      p(650, 832),
      p(800, 758),
      p(1020, 680),
      p(1210, 560),
      p(1500, 311),
    ],
    east: [
      p(670, 940),
      p(810, 935),
      p(960, 887),
      p(1135, 827),
      p(1360, 730),
      p(1423, 635),
      p(1590, 354),
    ],
    west: [
      p(203, 813),
      p(280, 727),
      p(391, 659),
      p(597, 600),
      p(820, 590),
      p(970, 543),
      p(1448, 291),
    ],
    doors: { bookshop: p(466, 561), waver: p(930, 400) },
    paving: [
      [
        p(0, 786),
        p(420, 619),
        p(843, 468),
        p(1261, 359),
        p(1560, 235),
        p(1672, 158),
        p(1672, 680),
        p(1270, 941),
        p(0, 941),
      ],
      [p(259, 738), p(285, 603), p(475, 544), p(604, 571), p(650, 636)],
      [
        p(840, 565),
        p(842, 449),
        p(868, 426),
        p(905, 397),
        p(951, 389),
        p(1024, 444),
        p(1092, 561),
      ],
    ],
    horizon: 120,
    heightReference: 530,
  },
  eye: {
    centers: [
      p(836, 900),
      p(836, 812),
      p(836, 755),
      p(836, 700),
      p(836, 637),
      p(836, 583),
      p(836, 520),
    ],
    east: [
      p(1530, 916),
      p(1430, 825),
      p(1290, 766),
      p(1190, 707),
      p(1042, 644),
      p(955, 587),
      p(883, 522),
    ],
    west: [
      p(149, 805),
      p(234, 761),
      p(334, 712),
      p(452, 661),
      p(590, 605),
      p(602, 574),
      p(790, 519),
    ],
    doors: { bookshop: p(368, 600), waver: p(572, 500) },
    paving: [
      [
        p(0, 805),
        p(405, 629),
        p(650, 566),
        p(810, 485),
        p(856, 485),
        p(1050, 596),
        p(1455, 797),
        p(1672, 877),
        p(1672, 941),
        p(0, 941),
      ],
      [
        p(268, 708),
        p(278, 610),
        p(350, 589),
        p(389, 584),
        p(445, 600),
        p(501, 660),
      ],
      [
        p(534, 609),
        p(550, 553),
        p(555, 512),
        p(563, 495),
        p(588, 489),
        p(622, 560),
        p(655, 584),
      ],
    ],
    horizon: 485,
    heightReference: 185,
  },
};
