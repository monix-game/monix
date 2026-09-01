import { Elysia } from 'elysia';
import submit from './submit';
import myAppeals from './my-appeals';
import list from './list';
import review from './review';

export const appealsRoutes = new Elysia().use(submit).use(myAppeals).use(list).use(review);

export default appealsRoutes;
