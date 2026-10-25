import schemes from '../assets/music/schemes.mp3';
import midnightEchoes from '../assets/music/midnight-echoes.mp3';
import olderTimes from '../assets/music/older-times.mp3';
import vastExpanse from '../assets/music/vast-expanse.mp3';
import funchat from '../assets/music/funchat.mp3';
import blip from '../assets/music/blip.mp3';
import again from '../assets/music/again.mp3';
import bread from '../assets/music/bread.mp3';
import carrot from '../assets/music/carrot.mp3';


import monixCover from '../assets/covers/monix.png';
import monixCoverB from '../assets/covers/monixbside.png';
import blipCover from '../assets/covers/blip.png';
import againCover from '../assets/covers/again.png';
import breadCover from '../assets/covers/bread.png';
import carrotCover from '../assets/covers/carrot.png';


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
  {
    id: 'older-times',
    src: olderTimes,
    coverSrc: monixCoverB,
    title: 'Older Times',
    artist: 'Ferretosan',
  },
  {
    id: 'vast-expanse',
    src: vastExpanse,
    coverSrc: monixCoverB,
    title: 'Vast Expanse',
    artist: 'Ferretosan',
  },
  {
    id: 'funchat',
    src: funchat,
    coverSrc: monixCoverB,
    title: 'Funchat',
    artist: 'Ferretosan',
  },
  {
    id: 'bread',
    src: bread,
    coverSrc: breadCover,
    title: 'Bread',
    artist: 'Ferretosan, PbToast14',
  },
  {
    id: 'carrot',
    src: carrot,
    coverSrc: carrotCover,
    title: 'CARROT',
    artist: 'Ferretosan, PbToast14',
  },
  {
    id: 'blip',
    src: blip,
    coverSrc: blipCover,
    title: 'blip',
    artist: 'Ferretosan',
  },
  {
    id: 'again',
    src: again,
    coverSrc: againCover,
    title: 'again.',
    artist: 'Ferretosan',
  },
];
