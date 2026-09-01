import { Elysia } from 'elysia';
import { deriveAuth, onlyFeatureEnabled } from '../../middleware';
import send from './send';
import edit from './edit';
import deleteMsg from './delete';
import roomMessages from './room-messages';
import rooms from './rooms';
import ephemeralDismiss from './ephemeral-dismiss';
import report from './report';

export const socialRoutes = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyFeatureEnabled('social'))
  .use(send)
  .use(edit)
  .use(deleteMsg)
  .use(roomMessages)
  .use(rooms)
  .use(ephemeralDismiss)
  .use(report);

export default socialRoutes;
