import schemes from '../assets/music/schemes.mp3';
import monixCover from '../assets/covers/monix.png';

export type Track = {
  id?: string;
  src: string;
  coverSrc: string;
  title: string;
  artist: string;
};

export const tracks: Track[] = [
  {
    id: 'schemes',
    src: schemes,
    coverSrc: monixCover,
    title: 'Schemes',
    artist: 'Ferretosan',
  },
];
