import './Staff.css';
import { useCallback, useEffect, useState } from 'react';
import monixLogoLight from '../../assets/logo.svg';
import monixLogoDark from '../../assets/logo-dark.svg';
import {
  Button,
  EmojiText,
  Input,
  Modal,
  Nameplate,
  PunishModal,
  Select,
  Spinner,
} from '../../components';
import { Avatar } from '../../components/avatar/Avatar';
import type { IUser } from '../../../server/common/models/user';
import { fetchUser } from '../../helpers/auth';
import { formatRelativeTime, formatRemainingTime, titleCase } from '../../helpers/utils';
import type { IReport } from '../../../server/common/models/report';
import type { DashboardInfo } from '../../../server/common/models/dashboardInfo';
import {
  changeReportCategory,
  deletePunishment,
  getAllReports,
  getAllUsers,
  getDashboardInfo,
  getUserByUUID,
  reviewReport,
} from '../../helpers/staff';
import { getCategoryById, punishXCategories } from '../../../server/common/punishx/categories';
import { hasPowerOver, hasRole } from '../../../server/common/roles';
import type { IAppeal } from '../../../server/common/models/appeal';
import { getAllAppeals, reviewAppeal } from '../../helpers/appeals';
import { cosmetics } from '../../../server/common/cosmetics/cosmetics';
import { getRemainingDuration, hasExpired } from '../../../server/common/models/punishment';

export default function Staff() {
  // App states
  const [tab, rawSetTab] = useState<'dashboard' | 'reports' | 'appeals' | 'users'>('dashboard');
  const [timeOfDay] = useState<'morning' | 'afternoon' | 'evening' | 'night'>(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return 'morning';
    if (h >= 12 && h < 19) return 'afternoon';
    if (h >= 19 && h < 21) return 'evening';
    return 'night';
  });

  // User states
  const [user, setUser] = useState<IUser | null>(null);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'mod' | 'helper' | 'user' | null>(
    null
  );

  // Dashboard states
  const [dashboardData, setDashboardData] = useState<DashboardInfo | null>(null);
  const [dashboardHydrated, setDashboardHydrated] = useState<boolean>(false);

  // Reports states
  const [reportsStatusFilter, setReportsStatusFilter] = useState<
    'all' | 'pending' | 'reviewed' | 'dismissed'
  >('pending');
  const [reports, setReports] = useState<IReport[]>([]);
  const [reportsHydrated, setReportsHydrated] = useState<boolean>(false);
  const [reportModalOpen, setReportModalOpen] = useState<boolean>(false);
  const [selectedReportAction, setSelectedReportAction] = useState<
    'punish_reported' | 'punish_reporter' | 'dismissed' | 'change_category' | null
  >(null);
  const [selectedReport, setSelectedReport] = useState<IReport | null>(null);
  const [reportChangeCategory, setReportChangeCategory] = useState<string>('');

  // Appeals states
  const [appealsStatusFilter, setAppealsStatusFilter] = useState<
    'all' | 'pending' | 'approved' | 'denied'
  >('pending');
  const [appeals, setAppeals] = useState<IAppeal[]>([]);
  const [appealsHydrated, setAppealsHydrated] = useState<boolean>(false);
  const [appealModalOpen, setAppealModalOpen] = useState<boolean>(false);
  const [selectedAppeal, setSelectedAppeal] = useState<IAppeal | null>(null);
  const [selectedAppealAction, setSelectedAppealAction] = useState<'approve' | 'deny' | null>(null);

  // Users states
  const [filter, setFilter] = useState<string>('');
  const [usersHydrated, setUsersHydrated] = useState<boolean>(false);
  const [users, setUsers] = useState<IUser[]>([]);
  const [punishModalOpen, setPunishModalOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
  const [punishmentsModalOpen, setPunishmentsModalOpen] = useState<boolean>(false);
  const [punishmentsModalUser, setPunishmentsModalUser] = useState<IUser | null>(null);
  const [punishmentsModalHydrated, setPunishmentsModalHydrated] = useState<boolean>(false);
  const [punishmentsFilter, setPunishmentsFilter] = useState<'all' | 'active' | 'inactive'>(
    'active'
  );

  useEffect(() => {
    document.getElementsByTagName('body')[0].className = `tab-${tab}`;
  }, [tab]);

  const setTab = (newTab: typeof tab) => {
    document.getElementsByTagName('body')[0].className = `tab-${newTab}`;
    rawSetTab(newTab);
  };

  const updateEverything = useCallback(async () => {
    const userData = await fetchUser();
    const dashboardInfo = await getDashboardInfo();
    const reports = await getAllReports();
    const appeals = await getAllAppeals();

    if (!userData || userData.role === 'user') globalThis.location.href = '/auth/login';

    setUser(userData);
    setUserRole(userData ? userData.role : 'user');

    setDashboardData(dashboardInfo);
    setDashboardHydrated(true);

    setReports(reports);
    setReportsHydrated(true);

    setAppeals(appeals);
    setAppealsHydrated(true);
  }, []);

  useEffect(() => {
    void updateEverything();

    const interval = setInterval(async () => {
      await updateEverything();
    }, 1000);
    return () => clearInterval(interval);
  }, [updateEverything]);

  const fetchUsers = useCallback(async (nextFilter: string) => {
    setUsersHydrated(false);
    const normalizedFilter = nextFilter.trim();

    try {
      const resp = await getAllUsers(normalizedFilter.length ? normalizedFilter : undefined);
      setUsers(resp);
    } catch {
      setUsers([]);
    } finally {
      setUsersHydrated(true);
    }
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      void fetchUsers(filter);
    }, 250);

    return () => clearTimeout(debounce);
  }, [fetchUsers, filter]);

  const handleReportAction = useCallback(async () => {
    if (!selectedReport || !selectedReportAction) return;

    await reviewReport(
      selectedReport.uuid,
      selectedReportAction as 'punish_reported' | 'punish_reporter' | 'dismissed'
    );
    setReportModalOpen(false);

    // Refresh reports
    await updateEverything();
  }, [selectedReport, selectedReportAction, updateEverything]);

  const handleAppealAction = useCallback(async () => {
    if (!selectedAppeal || !selectedAppealAction) return;

    await reviewAppeal(
      selectedAppeal.uuid,
      selectedAppealAction === 'approve' ? 'approved' : 'denied'
    );
    setAppealModalOpen(false);

    // Refresh appeals
    await updateEverything();
  }, [selectedAppeal, selectedAppealAction, updateEverything]);

  const handleChangeReportCategory = useCallback(async () => {
    if (!selectedReport || !reportChangeCategory) return;

    // Change the report reason
    await changeReportCategory(selectedReport.uuid, reportChangeCategory);

    setReportModalOpen(false);

    // Refresh reports
    await updateEverything();
  }, [selectedReport, reportChangeCategory, updateEverything]);

  const openPunishmentsModal = useCallback(
    async (targetUser: IUser) => {
      setPunishmentsModalUser(targetUser);
      setPunishmentsModalHydrated(false);
      setPunishmentsModalOpen(true);

      const freshUser = await getUserByUUID(targetUser.uuid);
      if (freshUser) {
        setPunishmentsModalUser(freshUser);
        setUsers(prev =>
          prev.map(userEntry => (userEntry.uuid === freshUser.uuid ? freshUser : userEntry))
        );
      }

      setPunishmentsModalHydrated(true);
    },
    [setUsers]
  );

  const handleDeletePunishment = useCallback(
    async (punishmentId: string) => {
      if (!punishmentsModalUser) return;
      const ok = await deletePunishment(punishmentsModalUser.uuid, punishmentId);
      if (!ok) return;

      const freshUser = await getUserByUUID(punishmentsModalUser.uuid);
      if (freshUser) {
        setPunishmentsModalUser(freshUser);
        setUsers(prev =>
          prev.map(userEntry => (userEntry.uuid === freshUser.uuid ? freshUser : userEntry))
        );
      }
    },
    [punishmentsModalUser, setUsers]
  );

  const punishmentsForModal = (punishmentsModalUser?.punishments || [])
    .filter(punishment => {
      if (punishmentsFilter === 'all') return true;
      const active = !hasExpired(punishment);
      return punishmentsFilter === 'active' ? active : !active;
    })
    .sort((a, b) => b.issued_at - a.issued_at);

  return (
    <div className="app-container">
      <header className="app-header">
        <img src={monixLogoLight} alt="Monix Logo" className="app-logo app-logo-light" />
        <img src={monixLogoDark} alt="Monix Logo" className="app-logo app-logo-dark" />
        <h1 className="app-title">Monix Staff</h1>
        <div className="nav-tabs">
          {(() => {
            const noOfRows = 1;

            const tabs = [
              { key: 'dashboard', label: '📊 Dashboard', requiredRole: 'helper' },
              {
                key: 'reports',
                label: '📝 Reports',
                requiredRole: 'mod',
              },
              {
                key: 'appeals',
                label: '⚖️ Appeals',
                requiredRole: 'mod',
              },
              { key: 'users', label: '👥 Users', requiredRole: 'admin' },
            ] as const;

            const filteredTabs = tabs.filter(t => {
              if (t.requiredRole === 'helper') return true;
              if (hasRole(userRole || 'user', 'mod')) return true;
              if (hasRole(userRole || 'user', 'admin')) return true;
              return false;
            });

            const half = Math.ceil(filteredTabs.length / noOfRows);
            const rows = [];
            for (let i = 0; i < noOfRows; i++) {
              rows.push(filteredTabs.slice(i * half, i * half + half));
            }

            const renderTab = (t: { key: typeof tab; label: string }) => (
              <span
                key={t.key}
                className={tab === t.key ? 'active tab' : 'tab'}
                onClick={() => setTab(t.key)}
              >
                <EmojiText>{t.label}</EmojiText>
              </span>
            );

            return (
              <>
                {rows.map((row, rowIndex) => (
                  // eslint-disable-next-line react-x/no-array-index-key
                  <div key={rowIndex} className="nav-row">
                    {row.map(t => renderTab(t))}
                  </div>
                ))}
              </>
            );
          })()}
        </div>
        <div className="spacer" />
        <div className="user-info">
          <div className="username-info">
            <Avatar
              src={user?.avatar_data_uri || undefined}
              alt="User Avatar"
              className="user-avatar"
              size={34}
              styleKey={
                user?.equipped_cosmetics?.frame
                  ? cosmetics.find(c => c.id === user.equipped_cosmetics?.frame)?.frameStyle
                  : undefined
              }
            />
            <Nameplate
              text={user ? user.username : 'User'}
              styleKey={
                user
                  ? cosmetics.find(c => c.id === user.equipped_cosmetics?.nameplate)
                      ?.nameplateStyle || null
                  : null
              }
              className="username clickable"
              onClick={() => {
                globalThis.location.href = '/game';
              }}
            />
            {userRole !== null && userRole !== 'user' && (
              <span className={`user-badge ${userRole}`}>{titleCase(userRole)}</span>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        {tab === 'dashboard' && (
          <div className="tab-content">
            <h2>
              Good {titleCase(timeOfDay)}, {user ? user.username : 'User'}
            </h2>
            <p>Monix at a glance</p>
            <div className="dashboard-grid">
              {!dashboardHydrated && <Spinner size={28} />}
              {dashboardHydrated && dashboardData && (
                <>
                  <div className="dashboard-card">
                    <h3>
                      <EmojiText>👤 Total Users</EmojiText>
                    </h3>
                    <span className="big-number">{dashboardData?.totalUsers}</span>
                  </div>
                  <div className="dashboard-card">
                    <h3>
                      <EmojiText>🛡️ Active Punishments</EmojiText>
                    </h3>
                    <span className="big-number">{dashboardData?.totalPunishments}</span>
                  </div>
                  <div className="dashboard-card">
                    <h3>
                      <EmojiText>🛡️ Punishments Last 24h</EmojiText>
                    </h3>
                    <span className="big-number">{dashboardData?.punishmentsLast24Hours}</span>
                  </div>
                  <div className="dashboard-card">
                    <h3>
                      <EmojiText>📋 Open Reports</EmojiText>
                    </h3>
                    <span className="big-number">{dashboardData?.openReports}</span>
                  </div>
                  <div className="dashboard-card">
                    <h3>
                      <EmojiText>📋 Reports Last 24h</EmojiText>
                    </h3>
                    <span className="big-number">{dashboardData?.reportsLast24Hours}</span>
                  </div>
                  <div className="dashboard-card">
                    <h3>
                      <EmojiText>⚖️ Open Appeals</EmojiText>
                    </h3>
                    <span className="big-number">{dashboardData?.openAppeals}</span>
                  </div>
                  <div className="dashboard-card">
                    <h3>
                      <EmojiText>⚖️ Appeals Last 24h</EmojiText>
                    </h3>
                    <span className="big-number">{dashboardData?.appealsLast24Hours}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        {tab === 'reports' && (
          <div className="tab-content">
            <h2>
              {reports.filter(
                r => reportsStatusFilter === 'all' || r.status === reportsStatusFilter
              ).length === 1 && 'There is currently 1 report'}
              {reports.filter(
                r => reportsStatusFilter === 'all' || r.status === reportsStatusFilter
              ).length !== 1 &&
                `There are currently ${reports.filter(r => reportsStatusFilter === 'all' || r.status === reportsStatusFilter).length} reports`}
            </h2>
            <div className="review-filter">
              <p>Filter by status:</p>
              <Select
                value={reportsStatusFilter}
                onChange={value => setReportsStatusFilter(value as typeof reportsStatusFilter)}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'reviewed', label: 'Reviewed' },
                  { value: 'dismissed', label: 'Dismissed' },
                ]}
              />
            </div>
            <div className="review-list">
              {!reportsHydrated && <Spinner size={28} />}
              {reportsHydrated &&
                reports.filter(
                  r => reportsStatusFilter === 'all' || r.status === reportsStatusFilter
                ).length === 0 && <b>No reports to show.</b>}
              {reportsHydrated &&
                reports
                  .filter(r => reportsStatusFilter === 'all' || r.status === reportsStatusFilter)
                  .sort(
                    (a, b) =>
                      new Date(b.time_reported).getTime() - new Date(a.time_reported).getTime()
                  )
                  .map(r => (
                    <div key={r.uuid} className="review-card">
                      <div className="review-header">
                        <span className={`review-badge ${r.status}`}>{titleCase(r.status)}</span>
                        <span className="review-time">
                          {formatRelativeTime(new Date(r.time_reported))}
                        </span>
                      </div>
                      <div className="review-body">
                        <div className="staff-info-list">
                          <div className="staff-info-line">
                            <span>Category</span>
                            <span className="mono">{getCategoryById(r.reason)?.name}</span>
                          </div>
                          <div className="staff-info-line">
                            <span>Message Content</span>
                            <span className="mono">{r.message_content}</span>
                          </div>
                          <div className="staff-info-line">
                            <span>Details</span>
                            <span className="mono">{r.details || 'N/A'}</span>
                          </div>
                        </div>
                        {r.status === 'pending' && (
                          <div className="review-buttons">
                            <Button
                              color="blue"
                              onClick={() => {
                                setSelectedReport(r);
                                setSelectedReportAction('punish_reported');
                                setReportModalOpen(true);
                              }}
                            >
                              Punish Reported
                            </Button>
                            <Button
                              color="red"
                              onClick={() => {
                                setSelectedReport(r);
                                setSelectedReportAction('punish_reporter');
                                setReportModalOpen(true);
                              }}
                            >
                              Punish Reporter
                            </Button>
                            <Button
                              color="purple"
                              onClick={() => {
                                setSelectedReport(r);
                                setSelectedReportAction('dismissed');
                                setReportModalOpen(true);
                              }}
                            >
                              Dismiss Report
                            </Button>
                            <Button
                              onClick={() => {
                                setSelectedReport(r);
                                setSelectedReportAction('change_category');
                                setReportModalOpen(true);
                              }}
                            >
                              Change Category
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        )}
        {tab === 'appeals' && (
          <div className="tab-content">
            <h2>
              {appeals.filter(
                a => appealsStatusFilter === 'all' || a.status === appealsStatusFilter
              ).length === 1 && 'There is currently 1 appeal'}
              {appeals.filter(
                a => appealsStatusFilter === 'all' || a.status === appealsStatusFilter
              ).length !== 1 &&
                `There are currently ${appeals.filter(a => appealsStatusFilter === 'all' || a.status === appealsStatusFilter).length} appeals`}
            </h2>
            <div className="review-filter">
              <p>Filter by status:</p>
              <Select
                value={appealsStatusFilter}
                onChange={value => setAppealsStatusFilter(value as typeof appealsStatusFilter)}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'denied', label: 'Denied' },
                ]}
              />
            </div>
            <div className="review-list">
              {!appealsHydrated && <Spinner size={28} />}
              {appealsHydrated &&
                appeals.filter(
                  a => appealsStatusFilter === 'all' || a.status === appealsStatusFilter
                ).length === 0 && <b>No appeals to show.</b>}
              {appealsHydrated &&
                appeals
                  .filter(a => appealsStatusFilter === 'all' || a.status === appealsStatusFilter)
                  .sort(
                    (a, b) =>
                      new Date(b.time_submitted).getTime() - new Date(a.time_submitted).getTime()
                  )
                  .map(a => (
                    <div key={a.uuid} className="review-card">
                      <div className="review-header">
                        <span className={`review-badge ${a.status}`}>{titleCase(a.status)}</span>
                        <span className="review-time">
                          {formatRelativeTime(new Date(a.time_submitted))}
                        </span>
                      </div>
                      <div className="review-body">
                        <div className="staff-info-list">
                          <div className="staff-info-line">
                            <span>Punishment Category</span>
                            <span className="mono">
                              {getCategoryById(a.punishment_category_id)?.name}
                            </span>
                          </div>
                          <div className="staff-info-line">
                            <span>Appeal Text</span>
                            <span className="mono">{a.reason}</span>
                          </div>
                        </div>
                        {a.status === 'pending' && (
                          <div className="review-buttons">
                            <Button
                              color="blue"
                              onClick={() => {
                                setSelectedAppeal(a);
                                setSelectedAppealAction('approve');
                                setAppealModalOpen(true);
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              color="red"
                              onClick={() => {
                                setSelectedAppeal(a);
                                setSelectedAppealAction('deny');
                                setAppealModalOpen(true);
                              }}
                            >
                              Deny
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        )}
        {tab === 'users' && (
          <div className="tab-content">
            <h2>User Management</h2>
            <p>Search and manage users in the system.</p>
            <div className="user-search">
              <Input
                className="user-search-input"
                placeholder="Search by username or UUID..."
                value={filter}
                onValueChange={value => {
                  setFilter(value);
                }}
              />
            </div>
            <div className="user-list">
              {!usersHydrated && <Spinner size={28} />}
              {usersHydrated && users.length === 0 && <p>No users found.</p>}
              {usersHydrated &&
                users.map(u => (
                  <div key={u.uuid} className="user-card">
                    <div className="user-card-header">
                      <div className="user-card-avatar">
                        <Avatar
                          src={u.avatar_data_uri || undefined}
                          alt="User Avatar"
                          className="user-avatar"
                          size={34}
                          styleKey={
                            u.equipped_cosmetics?.frame
                              ? cosmetics.find(c => c.id === u.equipped_cosmetics?.frame)
                                  ?.frameStyle
                              : undefined
                          }
                        />
                      </div>
                      <Nameplate
                        text={u.username}
                        styleKey={
                          u.equipped_cosmetics?.nameplate
                            ? cosmetics.find(c => c.id === u.equipped_cosmetics?.nameplate)
                                ?.nameplateStyle
                            : null
                        }
                        className="staff-username"
                      />
                      {u.equipped_cosmetics?.tag && (
                        <span
                          className={`user-tag tag-colour-${cosmetics.find(c => c.id === u.equipped_cosmetics?.tag)?.tagColour}`}
                        >
                          <EmojiText>
                            {cosmetics.find(c => c.id === u.equipped_cosmetics?.tag)?.tagIcon}
                          </EmojiText>{' '}
                          {cosmetics.find(c => c.id === u.equipped_cosmetics?.tag)?.tagName}
                        </span>
                      )}
                      {u.role !== 'user' && (
                        <span className={`user-badge ${u.role}`}>{titleCase(u.role)}</span>
                      )}
                    </div>
                    <div className="user-card-body">
                      <div className="staff-info-list">
                        <div className="staff-info-line">
                          <span>UUID:</span>
                          <span className="mono">{u.uuid}</span>
                        </div>
                        <div className="staff-info-line">
                          <span>Registered:</span>
                          <span className="mono">
                            {new Date(u.time_created * 1000).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="staff-info-line">
                          <span>Total Punishments:</span>
                          <span className="mono">{u.punishments ? u.punishments.length : 0}</span>
                        </div>
                      </div>
                      <div className="user-card-buttons">
                        <Button
                          onClick={() => {
                            setSelectedUser(u);
                            setPunishModalOpen(true);
                          }}
                          disabled={!hasPowerOver(user?.role || 'helper', u.role)}
                        >
                          {hasPowerOver(user?.role || 'helper', u.role) ? 'Punish' : "Can't Punish"}
                        </Button>
                        <Button
                          onClick={() => {
                            void openPunishmentsModal(u);
                          }}
                          disabled={!hasPowerOver(user?.role || 'helper', u.role)}
                        >
                          {hasPowerOver(user?.role || 'helper', u.role)
                            ? 'See Punishments'
                            : "Can't View"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>

      <Modal isOpen={reportModalOpen} onClose={() => setReportModalOpen(false)}>
        <div className="staff-modal">
          {selectedReport && selectedReportAction && (
            <>
              {selectedReportAction === 'change_category' && (
                <>
                  <h2>Change Report Category</h2>
                  <Select
                    value={reportChangeCategory}
                    onChange={value => setReportChangeCategory(value)}
                    options={punishXCategories.map(category => ({
                      value: category.id,
                      label: category.name,
                    }))}
                  />
                  <Button onClickAsync={handleChangeReportCategory}>Change</Button>
                  <Button secondary onClick={() => setReportModalOpen(false)}>
                    Close
                  </Button>
                </>
              )}
              {selectedReportAction !== 'change_category' && (
                <>
                  <h2>Confirm Report Action</h2>

                  <Button onClickAsync={handleReportAction}>
                    Confirm {titleCase(selectedReportAction)}
                  </Button>
                  <Button secondary onClick={() => setReportModalOpen(false)}>
                    Cancel
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </Modal>

      <Modal isOpen={appealModalOpen} onClose={() => setAppealModalOpen(false)}>
        <div className="staff-modal">
          {selectedAppeal && selectedAppealAction && (
            <>
              <h2>Confirm Appeal Action</h2>

              <Button onClickAsync={handleAppealAction}>
                Confirm {titleCase(selectedAppealAction)}
              </Button>
              <Button secondary onClick={() => setAppealModalOpen(false)}>
                Cancel
              </Button>
            </>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={punishmentsModalOpen}
        onClose={() => setPunishmentsModalOpen(false)}
        width={600}
      >
        <div className="staff-modal">
          <h2>
            {punishmentsModalUser
              ? `${punishmentsModalUser.username}'s Punishments`
              : 'Punishments'}
          </h2>
          <div className="review-filter">
            <p>Filter by status:</p>
            <Select
              value={punishmentsFilter}
              onChange={value => setPunishmentsFilter(value as typeof punishmentsFilter)}
              options={[
                { value: 'all', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
          </div>
          {!punishmentsModalHydrated && <Spinner size={28} />}
          {punishmentsModalHydrated && punishmentsForModal.length === 0 && (
            <b>No punishments to show.</b>
          )}
          {punishmentsModalHydrated &&
            punishmentsForModal.map(punishment => {
              const isActive = !hasExpired(punishment);
              const originalDuration =
                punishment.duration === -1
                  ? 'Permanent'
                  : formatRemainingTime(punishment.duration * 60);
              const remainingDuration =
                punishment.duration === -1
                  ? 'Permanent'
                  : formatRemainingTime(Math.ceil(getRemainingDuration(punishment) / 1000));

              return (
                <div key={punishment.uuid} className="review-card">
                  <div className="review-header">
                    <span className={`review-badge ${isActive ? 'reviewed' : 'dismissed'}`}>
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="review-time">
                      {formatRelativeTime(new Date(punishment.issued_at))}
                    </span>
                  </div>
                  <div className="review-body">
                    <div className="staff-info-list">
                      <div className="staff-info-line">
                        <span>Category</span>
                        <span className="mono">{punishment.category?.name || 'Unknown'}</span>
                      </div>
                      <div className="staff-info-line">
                        <span>Level</span>
                        <span className="mono">{punishment.level}</span>
                      </div>
                      <div className="staff-info-line">
                        <span>Original Duration</span>
                        <span className="mono">{originalDuration}</span>
                      </div>
                      <div className="staff-info-line">
                        <span>Remaining Duration</span>
                        <span className="mono">{isActive ? remainingDuration : 'N/A'}</span>
                      </div>
                    </div>
                    <div className="review-buttons">
                      <Button
                        color="red"
                        onClickAsync={async () => {
                          await handleDeletePunishment(punishment.uuid);
                        }}
                        disabled={!hasRole(userRole || 'user', 'admin')}
                      >
                        {hasRole(userRole || 'user', 'admin') ? 'Delete' : "Can't Delete"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </Modal>

      {selectedUser && (
        <PunishModal
          userToPunish={selectedUser}
          isOpen={punishModalOpen}
          onClose={() => setPunishModalOpen(false)}
        />
      )}
    </div>
  );
}
