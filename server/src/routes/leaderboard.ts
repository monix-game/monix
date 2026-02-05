import { Router } from 'express';
import { requireActive } from '../middleware';
import { getAllUsers, getUserByUUID } from '../db';
import { isUserBanned } from '../../common/punishx/punishx';

const router = Router();

router.get('/', requireActive, async (req, res) => {
  // Fetch all users from the database
  const allUsers = await getAllUsers();

  // Sort users by money in descending order
  allUsers.sort((a, b) => (b.money || 0) - (a.money || 0));

  // Get the top 10 users
  const topUsers = allUsers.slice(0, 10);

  // Prepare the leaderboard data
  async function getLeaderboard(hideStaff: boolean = false) {
    const leaderboard = await Promise.all(
      topUsers
        .filter(u => {
          const SIX_MONTHS = 6 * 30 * 24 * 60 * 60 * 1000; // Approximate six months in milliseconds

          // Check if the user is not banned
          const isNotBanned = !isUserBanned(u);

          // Check if the user has a positive money balance
          const hasPositiveMoney = (u.money || 0) > 0;

          // Check if the user has been active within the last six months (or last_seen is not set)
          const isRecentlyActive = !u.last_seen || Date.now() - u.last_seen <= SIX_MONTHS;

          // Check if user is not staff (or hideStaff is false)
          const isNotStaff =
            !hideStaff || (u.role !== 'owner' && u.role !== 'admin' && u.role !== 'mod');

          // Return true if all conditions are met
          return isNotBanned && hasPositiveMoney && isRecentlyActive && isNotStaff;
        })
        .map(async (user, index) => {
          const userData = await getUserByUUID(user.uuid);

          return {
            rank: index + 1,
            username: userData ? userData.username : 'Unknown',
            avatar: userData ? userData.avatar_data_uri : undefined,
            role: userData ? userData.role : 'user',
            money: user.money || 0,
            cosmetics: {
              nameplate: userData?.equipped_cosmetics?.nameplate,
              user_tag: userData?.equipped_cosmetics?.tag,
              frame: userData?.equipped_cosmetics?.frame,
            },
          };
        })
    );

    // Make it go 2nd, 1st, 3rd for the first three ranks
    return leaderboard.sort((a, b) => {
      if (a.rank === 1) return -1;
      if (b.rank === 1) return 1;
      if (a.rank === 2) return 1;
      if (b.rank === 2) return -1;
      return a.rank - b.rank;
    });
  }

  return res
    .status(200)
    .json({ normal: await getLeaderboard(false), noStaff: await getLeaderboard(true) });
});

export default router;
