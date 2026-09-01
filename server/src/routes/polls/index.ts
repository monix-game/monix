import { Elysia } from 'elysia';
import list from './list';
import create from './create';
import vote from './vote';

export const pollsRoutes = new Elysia().use(list).use(create).use(vote);

export default pollsRoutes;
