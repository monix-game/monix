import {
  PRICE_ID_GEMS_PACK_100,
  PRICE_ID_GEMS_PACK_1000,
  PRICE_ID_GEMS_PACK_500,
} from '../../constants';

export const GEMS_LOOKUP: { [key: string]: number } = {
  gems_pack_100: 100,
  gems_pack_500: 500,
  gems_pack_1000: 1000,
};

export const PRICE_IDS: { [key: string]: string } = {
  gems_pack_100: PRICE_ID_GEMS_PACK_100,
  gems_pack_500: PRICE_ID_GEMS_PACK_500,
  gems_pack_1000: PRICE_ID_GEMS_PACK_1000,
};
