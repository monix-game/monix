import { Router } from 'express';
import { requireAuth } from '../middleware';
import { getAllUsers, getUserByUUID } from '../db';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  // Fetch all users from the database
  const allUsers = await getAllUsers();

  // Sort users by money in descending order
  allUsers.sort((a, b) => (b.money || 0) - (a.money || 0));

  // Get the top 10 users
  const topUsers = allUsers.slice(0, 10);

  // Prepare the leaderboard data
  const leaderboard = await Promise.all(
    topUsers.map(async (user, index) => {
      const userData = await getUserByUUID(user.uuid);
      return {
        rank: index + 1,
        username: userData ? userData.username : 'Unknown',
        money: user.money || 0,
      };
    })
  );

  return res.status(200).json({ leaderboard });
});

export default router;
