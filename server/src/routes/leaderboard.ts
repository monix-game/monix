import { Router } from 'express';
import { requireActive } from '../middleware';
import { getAllUsers, getUserByUUID } from '../db';
import { isUserBanned } from '../../common/punishx/punishx';

function getFishCaughtCount(fishCaught?: { [key: string]: number }) {
  if (!fishCaught) return 0;
  return Object.values(fishCaught).reduce((total, count) => total + count, 0);
}

const router = Router();

router.get('/', requireActive, async (req, res) => {
  // Fetch all users from the database
  const allUsers = await getAllUsers();

  // Prepare the leaderboard data
  async function getMoneyLeaderboard(hideStaff: boolean = false) {
    const sortedUsers = [...allUsers].sort((a, b) => (b.money || 0) - (a.money || 0));
    const leaderboard = await Promise.all(
      sortedUsers
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

    // Limit to top 15
    const limitedLeaderboard = leaderboard.slice(0, 15);

    // Make it go 2nd, 1st, 3rd for the first three ranks
    const reorderedLeaderboard = [
      limitedLeaderboard[1] || null, // 2nd place
      limitedLeaderboard[0] || null, // 1st place
      limitedLeaderboard[2] || null, // 3rd place
      ...(limitedLeaderboard.slice(3) || []), // The rest of the leaderboard
    ];

    return reorderedLeaderboard.filter(entry => entry !== null);
  }

  return res
    .status(200)
    .json({ normal: await getMoneyLeaderboard(false), noStaff: await getMoneyLeaderboard(true) });
});

router.get('/fish', requireActive, async (req, res) => {
  // Fetch all users from the database
  const allUsers = await getAllUsers();

  async function getFishLeaderboard(hideStaff: boolean = false) {
    const sortedUsers = [...allUsers].sort(
      (a, b) =>
        getFishCaughtCount(b.fishing?.fish_caught) - getFishCaughtCount(a.fishing?.fish_caught)
    );
    const leaderboard = await Promise.all(
      sortedUsers
        .filter(u => {
          const SIX_MONTHS = 6 * 30 * 24 * 60 * 60 * 1000; // Approximate six months in milliseconds

          // Check if the user is not banned
          const isNotBanned = !isUserBanned(u);

          // Check if the user has caught fish
          const hasFishCaught = getFishCaughtCount(u.fishing?.fish_caught) > 0;

          // Check if the user has been active within the last six months (or last_seen is not set)
          const isRecentlyActive = !u.last_seen || Date.now() - u.last_seen <= SIX_MONTHS;

          // Check if user is not staff (or hideStaff is false)
          const isNotStaff =
            !hideStaff || (u.role !== 'owner' && u.role !== 'admin' && u.role !== 'mod');

          // Return true if all conditions are met
          return isNotBanned && hasFishCaught && isRecentlyActive && isNotStaff;
        })
        .map(async (user, index) => {
          const userData = await getUserByUUID(user.uuid);

          return {
            rank: index + 1,
            username: userData ? userData.username : 'Unknown',
            avatar: userData ? userData.avatar_data_uri : undefined,
            role: userData ? userData.role : 'user',
            fishCaught: getFishCaughtCount(user.fishing?.fish_caught),
            cosmetics: {
              nameplate: userData?.equipped_cosmetics?.nameplate,
              user_tag: userData?.equipped_cosmetics?.tag,
              frame: userData?.equipped_cosmetics?.frame,
            },
          };
        })
    );

    // Limit to top 15
    const limitedLeaderboard = leaderboard.slice(0, 15);

    // Make it go 2nd, 1st, 3rd for the first three ranks
    const reorderedLeaderboard = [
      limitedLeaderboard[1] || null, // 2nd place
      limitedLeaderboard[0] || null, // 1st place
      limitedLeaderboard[2] || null, // 3rd place
      ...(limitedLeaderboard.slice(3) || []), // The rest of the leaderboard
    ];

    return reorderedLeaderboard.filter(entry => entry !== null);
  }

  return res
    .status(200)
    .json({ normal: await getFishLeaderboard(false), noStaff: await getFishLeaderboard(true) });
});

export default router;
