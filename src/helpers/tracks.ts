import schemes from '../assets/music/schemes.mp3';
import midnightEchoes from '../assets/music/midnight-echoes.mp3';
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
  {
    id: 'midnight-echoes',
    src: midnightEchoes,
    coverSrc: monixCover,
    title: 'Midnight Echoes',
    artist: 'Ferretosan',
  },
];
