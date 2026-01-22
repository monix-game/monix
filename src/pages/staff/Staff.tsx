import './Staff.css';
import { useCallback, useEffect, useState } from 'react';
import monixLogoLight from '../../assets/logo.svg';
import monixLogoDark from '../../assets/logo-dark.svg';
import { Button, EmojiText, Input, Modal, PunishModal, Select, Spinner } from '../../components';
import { IconUser } from '@tabler/icons-react';
import type { IUser } from '../../../server/common/models/user';
import { fetchUser } from '../../helpers/auth';
import { formatRelativeTime, titleCase } from '../../helpers/utils';
import type { IReport } from '../../../server/common/models/report';
import type { DashboardInfo } from '../../../server/common/models/dashboardInfo';
import {
  changeReportCategory,
  getAllReports,
  getAllUsers,
  getDashboardInfo,
  reviewReport,
} from '../../helpers/staff';
import { getCategoryById, punishXCategories } from '../../../server/common/punishx/categories';
import { hasRole } from '../../../server/common/roles';

export default function Staff() {
  // App states
  const [tab, rawSetTab] = useState<'dashboard' | 'reports' | 'users'>('dashboard');
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

  // Users states
  const [filter, setFilter] = useState<string>('');
  const [usersHydrated, setUsersHydrated] = useState<boolean>(false);
  const [users, setUsers] = useState<IUser[]>([]);
  const [punishModalOpen, setPunishModalOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);

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

    if (!userData || userData.role === 'user') window.location.href = '/auth/login';

    setUser(userData);
    setUserRole(userData ? userData.role : 'user');

    setDashboardData(dashboardInfo);
    setDashboardHydrated(true);

    setReports(reports);
    setReportsHydrated(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void updateEverything();

    const interval = setInterval(async () => {
      await updateEverything();
    }, 1000);
    return () => clearInterval(interval);
  }, [updateEverything]);

  const fetchUsers = useCallback(async () => {
    setUsersHydrated(false);
    try {
      const resp = await getAllUsers(filter);
      setUsers(resp);
      setUsersHydrated(true);
    } catch {
      setUsers([]);
      setUsersHydrated(true);
    }
  }, [filter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchUsers();
  }, [fetchUsers]);

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

  const handleChangeReportCategory = useCallback(async () => {
    if (!selectedReport || !reportChangeCategory) return;

    // Change the report reason
    await changeReportCategory(selectedReport.uuid, reportChangeCategory);

    setReportModalOpen(false);

    // Refresh reports
    await updateEverything();
  }, [selectedReport, reportChangeCategory, updateEverything]);

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
            {user?.avatar_data_uri && (
              <img src={user.avatar_data_uri} alt="User Avatar" className="user-avatar" />
            )}
            {!user?.avatar_data_uri && <IconUser size={24} />}
            <span
              className="username clickable"
              onClick={() => {
                window.location.href = '/game';
              }}
            >
              {user ? user.username : 'User'}
            </span>
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
                      <EmojiText>🛡️ Total Punishments</EmojiText>
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
                </>
              )}
            </div>
          </div>
        )}
        {tab === 'reports' && (
          <div className="tab-content">
            <h2>
              {dashboardData?.openReports === 1 && 'There is currently 1 report'}
              {dashboardData?.openReports !== 1 &&
                `There are currently ${dashboardData?.openReports} reports`}
            </h2>
            <div className="report-filter">
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
              {reportsHydrated && dashboardData?.openReports === 0 && <b>No reports to show.</b>}
              {reportsHydrated &&
                reports
                  .filter(r => reportsStatusFilter === 'all' || r.status === reportsStatusFilter)
                  .map(r => (
                    <div key={r.uuid} className="report-card">
                      <div className="report-header">
                        <span className={`report-badge ${r.status}`}>{titleCase(r.status)}</span>
                        <span className="report-time">
                          {formatRelativeTime(new Date(r.time_reported))}
                        </span>
                      </div>
                      <div className="report-body">
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
                        <div className="report-buttons">
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
                  void fetchUsers();
                }}
              />
            </div>
            <div className="user-list">
              {users.length === 0 && <p>No users found.</p>}
              {usersHydrated &&
                users.map(u => (
                  <div key={u.uuid} className="user-card">
                    <div className="user-card-header">
                      <div className="user-card-avatar">
                        {u.avatar_data_uri && (
                          <img src={u.avatar_data_uri} alt="User Avatar" className="user-avatar" />
                        )}
                        {!u.avatar_data_uri && <IconUser size={32} />}
                      </div>
                      <span className="username">{u.username}</span>
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
                        >
                          Punish
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
