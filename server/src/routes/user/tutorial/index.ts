import { Elysia } from 'elysia';
import completeTutorial from './complete';
import resetTutorial from './reset';

export const tutorialRoutes = new Elysia()
  .use(completeTutorial)
  .use(resetTutorial);

export default tutorialRoutes;
