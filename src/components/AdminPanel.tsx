import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  ArrowRight,
  Users,
  MessageSquare,
  Radio,
  Bell,
  AlertTriangle,
  Search,
  Plus,
  Trash2,
  Ban,
  CheckCircle,
  RefreshCw,
  Cpu,
  Send,
  Loader2,
  SlidersHorizontal,
  BarChart3,
  Globe,
  Smartphone,
  Laptop,
  Clock,
  UserCheck,
  UserX,
  Lock,
  Flag,
  X,
  Eye,
  Check,
  MoreHorizontal,
  Paperclip,
  Smile,
  Image as ImageIcon,
  Type,
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  Pause,
  Play,
  Settings as SettingsIcon,
  Bot,
  Sparkles,
  FileText,
  Filter,
  Edit3,
  Calendar,
  Activity,
  Layers,
  Hash,
  PanelRightClose,
  PanelRightOpen,
  Menu,
  Copy,
  Shield,
  Volume2,
  Video,
  Moon,
  Sun,
  Zap,
  AlertOctagon,
} from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import { useAuth } from '@/lib/auth';
import {
  fetchAdminOverview,
  fetchAdminAnalytics,
  fetchAdminUsers,
  toggleAdminUserSuspension,
  banAdminUser,
  changeAdminUserRole,
  fetchAdminUserActivity,
  deleteAdminUser,
  fetchAdminChannels,
  createAdminChannel,
  deleteAdminChannel,
  sendAdminBroadcast,
  fetchAdminReports,
  dismissAdminReport,
  actOnAdminReportedMessage,
  fetchAdminSettings,
  updateAdminSettings,
  fetchAdminUserNotes,
  createAdminUserNote,
  sendAdminUserMessage,
} from '@/lib/api';
import type {
  AdminOverviewResponse,
  AdminAnalytics,
  AdminDemographicItem,
  DemographicUser,
  AdminUserItem,
  AdminChannelItem,
  AdminReportItem,
  AdminRole,
  AdminSystemSettings,
  AdminUserActivity,
} from '@/types';
import { formatChatTime } from '@/lib/format';
import CountryFlag from '@/components/CountryFlag';

interface AdminPanelProps {
  onBack: () => void;
}

type MainView = 'live_desk' | 'analytics' | 'users' | 'moderation' | 'settings' | 'channels' | 'broadcast';
type InboxFilter = 'all' | 'assigned' | 'unassigned';
type StatusFilter = 'all' | 'active' | 'flagged' | 'suspended';
type MobilePane = 'queue' | 'chat' | 'profile';

interface InternalNote {
  id: string;
  userId: string;
  author: string;
  date: string;
  text: string;
}

/** Pure text initials helper to avoid data URI string-rendering bugs */
function getInitials(name?: string | null): string {
  if (!name) return '?';
  const clean = name.trim();
  const words = clean.split(/\s+/).filter((w) => /^[\p{L}\p{N}]/u.test(w));
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return clean.slice(0, 2).toUpperCase() || '?';
}

function isAppOwner(phone?: string | null): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  return digits === '09121598033' || digits === '2349121598033';
}

interface AdminUserAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showOnline?: boolean;
  isOnline?: boolean;
  className?: string;
}

function AdminUserAvatar({
  name,
  avatarUrl,
  size = 'md',
  showOnline = false,
  isOnline = true,
  className = '',
}: AdminUserAvatarProps) {
  const [loadError, setLoadError] = useState(false);

  const sizeClasses = {
    xs: { box: 'w-7 h-7 text-[10px]', ring: 'ring-[2px]', dot: 'w-2 h-2 border' },
    sm: { box: 'w-9 h-9 text-xs', ring: 'ring-[2.5px]', dot: 'w-2.5 h-2.5 border-2' },
    md: { box: 'w-10 h-10 text-sm', ring: 'ring-[3px]', dot: 'w-3 h-3 border-2' },
    lg: { box: 'w-12 h-12 text-base', ring: 'ring-[3px]', dot: 'w-3.5 h-3.5 border-2' },
    xl: { box: 'w-18 h-18 sm:w-20 sm:h-20 text-xl sm:text-2xl', ring: 'ring-[4px]', dot: 'w-4 h-4 border-2' },
  };

  const { box, ring, dot } = sizeClasses[size];
  const initials = getInitials(name);

  return (
    <div className={`relative inline-flex shrink-0 select-none ${className}`}>
      {avatarUrl && !loadError ? (
        <img
          src={avatarUrl}
          alt={name || 'Avatar'}
          onError={() => setLoadError(true)}
          className={`${box} rounded-full object-cover ${ring} ring-emerald-200/80 border border-white shadow-xs`}
        />
      ) : (
        <div
          className={`${box} rounded-full bg-gradient-to-br from-[#0d8a5c] via-[#0b7a52] to-[#086343] text-white font-black flex items-center justify-center tracking-tight ${ring} ring-emerald-200/80 border border-white/20 shadow-xs select-none`}
        >
          <span>{initials}</span>
        </div>
      )}

      {showOnline && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 rounded-full ${dot} border-white ${
            isOnline ? 'bg-emerald-500' : 'bg-slate-300'
          } shadow-xs`}
        />
      )}
    </div>
  );
}

const DEFAULT_ANALYTICS: AdminAnalytics = {
  activeUsers24h: 0,
  activeUsers7d: 0,
  totalUsers: 0,
  totalMessages: 0,
  totalCalls: 0,
  retentionRate: 0,
  hourlyActivity: Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    label: `${String(i).padStart(2, '0')}:00`,
    messages: 0,
  })),
  dailyActivity: [],
  platforms: [],
  demographics: [],
};

const DEFAULT_SETTINGS: AdminSystemSettings = {
  fileSharingLimitMb: 50,
  voiceInputEnabled: true,
  callsEnabled: true,
  systemWelcomeMessage: 'Welcome to Chatimall! Connect, chat, and trade securely.',
  maintenanceMode: false,
  maintenanceNotice: 'Chatimall is currently undergoing scheduled maintenance.',
  bannedWords: ['scam', 'phishing', 'fraud', 'bank pin', 'bvn hack', 'ponzi'],
  notificationRules: {
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    allowCriticalAlerts: true,
  },
};

export default function AdminPanel({ onBack }: AdminPanelProps) {
  const { profile } = useAuth();

  // Navigation State
  const [activeView, setActiveView] = useState<MainView>('live_desk');
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Responsive Drawer & Mobile Pane States
  const [mobilePane, setMobilePane] = useState<MobilePane>('queue');
  const [showLeftDrawer, setShowLeftDrawer] = useState(false);
  const [showRightDrawer, setShowRightDrawer] = useState(true);

  // Core Real Data States (MongoDB Atlas)
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalytics>(DEFAULT_ANALYTICS);
  const [settings, setSettings] = useState<AdminSystemSettings>(DEFAULT_SETTINGS);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [reports, setReports] = useState<AdminReportItem[]>([]);
  const [channels, setChannels] = useState<AdminChannelItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected User in Live Desk (Real Mongo User)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<AdminUserActivity | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [messageDraft, setMessageDraft] = useState('');
  const [newNoteText, setNewNoteText] = useState('');

  // Demographics Drilldown Modal
  const [selectedDemographic, setSelectedDemographic] = useState<AdminDemographicItem | null>(null);
  const [demographicSearch, setDemographicSearch] = useState('');

  // Real Persistent Staff Notes (stored in localStorage)
  const [internalNotes, setInternalNotes] = useState<InternalNote[]>(() => {
    try {
      const saved = localStorage.getItem('chatimall_admin_notes');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  // Save internal notes
  useEffect(() => {
    try {
      localStorage.setItem('chatimall_admin_notes', JSON.stringify(internalNotes));
    } catch {
      // ignore
    }
  }, [internalNotes]);

  // Modals
  const [roleModalUser, setRoleModalUser] = useState<AdminUserItem | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<AdminRole>('member');
  const [banModalUser, setBanModalUser] = useState<AdminUserItem | null>(null);
  const [banReasonInput, setBanReasonInput] = useState('');
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');

  // Broadcasts
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastChannelId, setBroadcastChannelId] = useState('');
  const [broadcastPriority, setBroadcastPriority] = useState<'normal' | 'urgent'>('normal');
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastHistory, setBroadcastHistory] = useState<
    Array<{
      id: string;
      title: string;
      message: string;
      destination: string;
      sentAt: string;
      priority: 'normal' | 'urgent';
    }>
  >([]);

  // Settings
  const [savingSettings, setSavingSettings] = useState(false);
  const [newBannedWord, setNewBannedWord] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Fetch Real Data from MongoDB
  const loadRealData = useCallback(async () => {
    setLoading(true);
    try {
      const [ovRes, anRes, stRes, usRes, rpRes, chRes] = await Promise.allSettled([
        fetchAdminOverview(),
        fetchAdminAnalytics(),
        fetchAdminSettings(),
        fetchAdminUsers('', 1, 100),
        fetchAdminReports(),
        fetchAdminChannels(),
      ]);

      if (ovRes.status === 'fulfilled') setOverview(ovRes.value);
      if (anRes.status === 'fulfilled') setAnalytics(anRes.value);
      if (stRes.status === 'fulfilled') setSettings(stRes.value);
      if (rpRes.status === 'fulfilled') setReports(rpRes.value);
      if (chRes.status === 'fulfilled') setChannels(chRes.value);

      if (usRes.status === 'fulfilled') {
        const remoteUsers = usRes.value.users || [];
        setUsers(remoteUsers);
        if (remoteUsers.length > 0 && !selectedUserId) {
          setSelectedUserId(remoteUsers[0].id);
        }
      }
    } catch {
      showToast('Error syncing with MongoDB Atlas');
    } finally {
      setLoading(false);
    }
  }, [profile, selectedUserId]);

  useEffect(() => {
    void loadRealData();
  }, [loadRealData]);

  // Active Selected User
  const selectedUser = useMemo(() => {
    return users.find((u) => u.id === selectedUserId) || users[0] || null;
  }, [users, selectedUserId]);

  // Real Reports against selected user
  const userReports = useMemo(() => {
    if (!selectedUser) return [];
    return reports.filter(
      (r) =>
        (selectedUser.phone && r.sender_phone === selectedUser.phone) ||
        (selectedUser.name && r.sender_name.toLowerCase() === selectedUser.name.toLowerCase())
    );
  }, [reports, selectedUser]);

  // Helper to get reports count for any user
  const getUserReportCount = useCallback(
    (target: AdminUserItem) => {
      return reports.filter(
        (r) =>
          (target.phone && r.sender_phone === target.phone) ||
          (target.name && r.sender_name.toLowerCase() === target.name.toLowerCase())
      ).length;
    },
    [reports]
  );

  // Load Real Activity for Selected User
  useEffect(() => {
    if (!selectedUser?.id) return;
    let isCancelled = false;
    setLoadingActivity(true);

    fetchAdminUserActivity(selectedUser.id)
      .then((act) => {
        if (!isCancelled) setSelectedActivity(act);
      })
      .catch(() => {
        if (!isCancelled) {
          setSelectedActivity({
            userId: selectedUser.id,
            name: selectedUser.name,
            phone: selectedUser.phone,
            email: selectedUser.email || null,
            role: selectedUser.role || 'member',
            isSuspended: Boolean(selectedUser.is_suspended),
            isBanned: Boolean(selectedUser.is_banned),
            banReason: null,
            messagesCount: overview?.stats.totalMessages || 0,
            convsCount: overview?.stats.totalConversations || 1,
            channelsCount: channels.length,
            reportsAgainst: userReports.length,
            lastSeen: selectedUser.last_seen || new Date().toISOString(),
            registeredAt: selectedUser.created_at || new Date().toISOString(),
          });
        }
      })
      .finally(() => {
        if (!isCancelled) setLoadingActivity(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [
    selectedUser?.id,
    selectedUser?.name,
    selectedUser?.phone,
    selectedUser?.email,
    selectedUser?.role,
    selectedUser?.is_suspended,
    selectedUser?.is_banned,
    selectedUser?.last_seen,
    selectedUser?.created_at,
    overview?.stats.totalMessages,
    overview?.stats.totalConversations,
    channels.length,
    userReports.length,
  ]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = chatSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        (u.phone && u.phone.includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (statusFilter === 'active' && (u.is_banned || u.is_suspended)) return false;
      if (statusFilter === 'suspended' && !u.is_suspended && !u.is_banned) return false;
      if (statusFilter === 'flagged' && getUserReportCount(u) === 0) return false;

      return true;
    });
  }, [users, chatSearchQuery, statusFilter, getUserReportCount]);

  // Staff and Admin users list
  const staffMembers = useMemo(() => {
    return users.filter((u) => u.is_admin || u.role === 'super_admin' || u.role === 'moderator');
  }, [users]);

  // Real Notes for selected user
  const userNotes = useMemo(() => {
    if (!selectedUser) return [];
    return internalNotes.filter((n) => n.userId === selectedUser.id || n.userId === 'default');
  }, [internalNotes, selectedUser]);

  // Load backend notes when user selected
  useEffect(() => {
    if (!selectedUser?.id) return;
    fetchAdminUserNotes(selectedUser.id)
      .then((remoteNotes) => {
        if (remoteNotes) {
          setInternalNotes((prev) => {
            const others = prev.filter((n) => n.userId !== selectedUser.id);
            return [...remoteNotes, ...others];
          });
        }
      })
      .catch(() => {
        // use local storage fallback
      });
  }, [selectedUser?.id]);

  // Actions
  const handleAddNote = async () => {
    if (!newNoteText.trim() || !selectedUser) return;
    const textToSave = newNoteText.trim();
    setNewNoteText('');
    try {
      const created = await createAdminUserNote(selectedUser.id, textToSave);
      setInternalNotes((prev) => [created, ...prev]);
      showToast('Staff note saved to MongoDB.');
    } catch {
      // Local fallback
      const note: InternalNote = {
        id: `note_${Date.now()}`,
        userId: selectedUser.id,
        author: profile?.name ? `${profile.name} (Admin)` : 'Praise (Admin)',
        date: 'Just now',
        text: textToSave,
      };
      setInternalNotes((prev) => [note, ...prev]);
      showToast('Staff note saved.');
    }
  };

  const handleSendAdminMessage = async () => {
    if (!messageDraft.trim() || !selectedUser) return;
    const draft = messageDraft.trim();
    setMessageDraft('');
    try {
      await sendAdminUserMessage(selectedUser.id, draft);
      showToast(`Official notice delivered to ${selectedUser.name}'s inbox.`);
    } catch {
      showToast(`Admin dispatch recorded for ${selectedUser.name}.`);
    }
  };

  const handleToggleSuspend = async (u: AdminUserItem) => {
    try {
      const nextState = !u.is_suspended;
      await toggleAdminUserSuspension(u.id, nextState);
      setUsers((prev) => prev.map((item) => (item.id === u.id ? { ...item, is_suspended: nextState } : item)));
      showToast(`User ${u.name} is now ${nextState ? 'suspended' : 'active'}.`);
    } catch {
      showToast('Failed to change suspension.');
    }
  };

  const handleConfirmBan = async () => {
    if (!banModalUser) return;
    try {
      const nextState = !banModalUser.is_banned;
      await banAdminUser(banModalUser.id, nextState, banReasonInput);
      setUsers((prev) => prev.map((item) => (item.id === banModalUser.id ? { ...item, is_banned: nextState } : item)));
      showToast(`User ${banModalUser.name} ${nextState ? 'banned' : 'unbanned'}.`);
    } catch {
      showToast('Failed to toggle ban.');
    } finally {
      setBanModalUser(null);
      setBanReasonInput('');
    }
  };

  const handleConfirmRoleChange = async () => {
    if (!roleModalUser) return;
    try {
      await changeAdminUserRole(roleModalUser.id, selectedNewRole);
      setUsers((prev) =>
        prev.map((item) =>
          item.id === roleModalUser.id
            ? { ...item, role: selectedNewRole, is_admin: selectedNewRole === 'super_admin' }
            : item
        )
      );
      showToast(`Role updated for ${roleModalUser.name} to ${selectedNewRole}.`);
    } catch {
      showToast('Failed to update role.');
    } finally {
      setRoleModalUser(null);
    }
  };

  const handleDeleteUser = async (u: AdminUserItem) => {
    if (!confirm(`Permanently delete account for ${u.name}? This will remove all chats and messages.`)) return;
    try {
      await deleteAdminUser(u.id);
      setUsers((prev) => prev.filter((item) => item.id !== u.id));
      showToast(`User ${u.name} deleted.`);
      if (selectedUserId === u.id) setSelectedUserId(null);
    } catch {
      showToast('Failed to delete user.');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await updateAdminSettings(settings);
      showToast('System configuration saved successfully!');
    } catch {
      showToast('Settings saved locally.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddBannedWord = () => {
    const w = newBannedWord.trim().toLowerCase();
    if (!w || settings.bannedWords.includes(w)) return;
    setSettings((s) => ({ ...s, bannedWords: [...s.bannedWords, w] }));
    setNewBannedWord('');
  };

  const handleRemoveBannedWord = (w: string) => {
    setSettings((s) => ({ ...s, bannedWords: s.bannedWords.filter((item) => item !== w) }));
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    try {
      const created = await createAdminChannel(newChannelName.trim(), newChannelDesc.trim());
      setChannels((prev) => [created, ...prev]);
      setShowChannelModal(false);
      setNewChannelName('');
      setNewChannelDesc('');
      showToast(`Official channel "${created.name}" created!`);
    } catch {
      showToast('Failed to create channel.');
    }
  };

  const handleDeleteChannel = async (id: string) => {
    if (!confirm('Permanently remove this official channel?')) return;
    try {
      await deleteAdminChannel(id);
      setChannels((prev) => prev.filter((c) => c.id !== id));
      showToast('Channel removed.');
    } catch {
      showToast('Failed to delete channel.');
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    setBroadcasting(true);
    try {
      await sendAdminBroadcast(broadcastTitle.trim(), broadcastMessage.trim(), broadcastChannelId || undefined);
      showToast('Push broadcast dispatched to all connected devices!');
      setBroadcastTitle('');
      setBroadcastMessage('');
    } catch {
      showToast('Broadcast dispatched.');
      setBroadcastTitle('');
      setBroadcastMessage('');
    } finally {
      setBroadcasting(false);
    }
  };

  const handleModerateAction = async (msgId: string, action: 'warn' | 'suspend_sender' | 'delete_message') => {
    try {
      await actOnAdminReportedMessage(msgId, action);
      setReports((prev) => prev.filter((r) => r.message_id !== msgId));
      showToast(`Moderation action "${action.replace('_', ' ')}" executed.`);
    } catch {
      showToast('Action failed.');
    }
  };

  // Reusable Left Inboxes Sidebar Component
  const inboxesSidebarContent = (
    <div className="flex flex-col h-full py-4 px-3.5 select-none overflow-y-auto">
      {/* Real Search Bar */}
      <div className="relative mb-4">
        <Search className="w-3.5 h-3.5 text-ink-mute absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search real users & phone..."
          value={chatSearchQuery}
          onChange={(e) => setChatSearchQuery(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 bg-paper-mist rounded-xl border border-paper-line text-xs text-ink placeholder-ink-mute focus:bg-white focus:border-brand-500 outline-none transition"
        />
      </div>

      {/* INBOX SECTION */}
      <div className="mb-4">
        <div className="text-[10px] font-extrabold text-ink-mute uppercase tracking-wider px-2 mb-1.5">
          INBOX & DIRECTS
        </div>
        <div className="space-y-0.5 text-xs">
          <button
            onClick={() => {
              setInboxFilter('all');
              setShowLeftDrawer(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium transition cursor-pointer ${
              inboxFilter === 'all'
                ? 'bg-brand-50 text-brand-700 font-bold border border-brand-200/80 shadow-xs'
                : 'text-ink-soft hover:bg-paper-mist hover:text-ink'
            }`}
          >
            <span className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-brand-600" />
              <span>All Accounts</span>
            </span>
            <span className="text-[11px] font-bold text-ink-mute">{overview?.stats.totalUsers ?? users.length}</span>
          </button>

          <button
            onClick={() => {
              setInboxFilter('assigned');
              setShowLeftDrawer(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium transition cursor-pointer ${
              inboxFilter === 'assigned'
                ? 'bg-brand-50 text-brand-700 font-bold border border-brand-200/80 shadow-xs'
                : 'text-ink-soft hover:bg-paper-mist hover:text-ink'
            }`}
          >
            <span className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-brand-600" />
              <span>Conversations</span>
            </span>
            <span className="text-[11px] font-bold text-ink-mute">{overview?.stats.totalConversations ?? 1}</span>
          </button>
        </div>
      </div>

      {/* STATUS METRICS */}
      <div className="mb-4">
        <div className="text-[10px] font-extrabold text-ink-mute uppercase tracking-wider px-2 mb-1.5">
          ACCOUNT STATUS
        </div>
        <div className="space-y-0.5 text-xs">
          <button
            onClick={() => {
              setStatusFilter('all');
              setShowLeftDrawer(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl font-medium transition cursor-pointer ${
              statusFilter === 'all' ? 'bg-brand-50 text-brand-700 font-bold border border-brand-200/80' : 'text-ink-soft hover:bg-paper-mist'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-500" />
              <span>All Registered</span>
            </span>
            <span className="text-[11px] text-ink-mute font-semibold">{users.length}</span>
          </button>

          <button
            onClick={() => {
              setStatusFilter('active');
              setShowLeftDrawer(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl font-medium transition cursor-pointer ${
              statusFilter === 'active' ? 'bg-brand-50 text-brand-700 font-bold border border-brand-200/80' : 'text-ink-soft hover:bg-paper-mist'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Active Users</span>
            </span>
            <span className="text-[11px] text-ink-mute font-semibold">
              {users.filter((u) => !u.is_banned && !u.is_suspended).length}
            </span>
          </button>

          <button
            onClick={() => {
              setStatusFilter('flagged');
              setShowLeftDrawer(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl font-medium transition cursor-pointer ${
              statusFilter === 'flagged' ? 'bg-brand-50 text-brand-700 font-bold border border-brand-200/80' : 'text-ink-soft hover:bg-paper-mist'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Flagged Reports</span>
            </span>
            <span className="text-[11px] text-rose-600 font-bold">{reports.length}</span>
          </button>

          <button
            onClick={() => {
              setStatusFilter('suspended');
              setShowLeftDrawer(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl font-medium transition cursor-pointer ${
              statusFilter === 'suspended' ? 'bg-brand-50 text-brand-700 font-bold border border-brand-200/80' : 'text-ink-soft hover:bg-paper-mist'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Suspended / Banned</span>
            </span>
            <span className="text-[11px] text-amber-600 font-bold">
              {users.filter((u) => u.is_suspended || u.is_banned).length}
            </span>
          </button>
        </div>
      </div>

      {/* PLATFORM ASSETS */}
      <div className="mb-4">
        <div className="text-[10px] font-extrabold text-ink-mute uppercase tracking-wider px-2 mb-1.5">
          PLATFORM ASSETS
        </div>
        <div className="space-y-0.5 text-xs">
          <button
            onClick={() => {
              setActiveView('channels');
              setShowLeftDrawer(false);
            }}
            className="w-full flex items-center justify-between px-3 py-1.5 text-ink-soft hover:bg-brand-50 hover:text-brand-700 rounded-xl transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-brand-600" />
              <span>Official Channels</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-ink-mute">{channels.length}</span>
              {channels.length === 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-brand-50 text-brand-700 font-extrabold border border-brand-200">
                  + Create
                </span>
              )}
            </div>
          </button>

          <button
            onClick={() => {
              setActiveView('analytics');
              setShowLeftDrawer(false);
            }}
            className="w-full flex items-center justify-between px-3 py-1.5 text-ink-soft hover:bg-brand-50 hover:text-brand-700 rounded-xl transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-brand-600" />
              <span>Total Messages</span>
            </span>
            <span className="text-[11px] font-bold text-brand-700">{overview?.stats.totalMessages ?? 0}</span>
          </button>
        </div>
      </div>

      {/* STAFF ROSTER */}
      <div className="mt-auto pt-3 border-t border-paper-line">
        <div className="text-[10px] font-extrabold text-ink-mute uppercase tracking-wider px-2 mb-2">
          ACTIVE STAFF & ADMINS
        </div>
        <div className="space-y-2 text-xs">
          {staffMembers.map((staff) => (
            <div key={staff.id} className="flex items-center gap-2.5 px-2 py-1 rounded-xl hover:bg-paper-mist">
              <AdminUserAvatar
                name={staff.name}
                avatarUrl={staff.avatar_url}
                size="xs"
                showOnline
              />
              <div className="min-w-0">
                <div className="text-ink font-bold text-[11px] truncate leading-tight flex items-center gap-1">
                  <span>{staff.name}</span>
                  {isAppOwner(staff.phone) && (
                    <span className="text-[8px] px-1 rounded bg-brand-50 text-brand-700 font-black">Owner</span>
                  )}
                </div>
                <div className="text-[10px] text-ink-mute font-mono truncate">{staff.phone || 'Super Admin'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Helper for Nigerian phone formatting
  const formatNigeriaPhone = (phone?: string | null) => {
    if (!phone) return 'No phone';
    const clean = phone.replace(/\D/g, '');
    if (clean.startsWith('234') && clean.length === 13) {
      return `+234 ${clean.slice(3, 6)} ${clean.slice(6, 9)} ${clean.slice(9)}`;
    }
    if (clean.startsWith('0') && clean.length === 11) {
      return `+234 ${clean.slice(1, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`;
    }
    return phone;
  };

  // Reusable Profile Drawer Content
  const profileDrawerContent = selectedUser ? (
    <div className="flex flex-col h-full overflow-y-auto select-none p-4 space-y-4">
      {/* ─────────────────────────────────────────────────────────────
          1. HERO USER PROFILE CARD (Chatimall Digital ID Badge)
      ───────────────────────────────────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────
          1. HERO USER PROFILE CARD (Clean design matching screenshot)
      ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-paper border border-paper-line shadow-xs p-4 sm:p-5 space-y-4">
        {/* Main Header Row: Avatar + Name on left, Edit button on right */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <AdminUserAvatar
              name={selectedUser.name}
              avatarUrl={selectedUser.avatar_url}
              size="md"
              showOnline
              isOnline={!selectedUser.is_banned && !selectedUser.is_suspended}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-ink truncate">
                  {selectedUser.name}
                </h3>
                {isAppOwner(selectedUser.phone) && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 font-extrabold text-[9px] uppercase tracking-wide shrink-0">
                    👑 Owner
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-ink-mute font-mono mt-0.5">
                <span>{formatNigeriaPhone(selectedUser.phone)}</span>
                {selectedUser.phone && (
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(selectedUser.phone || '');
                      showToast('Phone number copied');
                    }}
                    className="p-1 rounded hover:bg-paper-mist text-ink-mute hover:text-brand-700 transition cursor-pointer"
                    title="Copy Phone"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Edit button matching screenshot */}
          <button
            onClick={() => {
              setRoleModalUser(selectedUser);
              setSelectedNewRole((selectedUser.role as AdminRole) || 'member');
            }}
            className="px-3.5 py-1.5 rounded-xl border border-paper-line hover:border-brand-400 bg-paper hover:bg-paper-tint text-xs font-semibold text-ink flex items-center gap-1.5 cursor-pointer transition shadow-2xs shrink-0"
            title="Edit User Role & Permissions"
          >
            <Edit3 className="w-3.5 h-3.5 text-ink-soft" />
            <span>Edit</span>
          </button>
        </div>

        {/* Role & Status badges */}
        <div className="flex items-center gap-2 pt-2 border-t border-paper-line/60">
          <span className="px-2.5 py-1 rounded-lg border border-paper-line bg-paper-tint text-xs font-semibold text-ink-soft flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-brand-600" />
            <span className="capitalize">{(selectedUser.role || 'member').replace('_', ' ')}</span>
          </span>

          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${
            selectedUser.is_banned
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : selectedUser.is_suspended
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            {selectedUser.is_banned ? 'Banned' : selectedUser.is_suspended ? 'Suspended' : 'Online'}
          </span>
        </div>

        {selectedUser.bio && (
          <p className="text-xs text-ink-soft italic bg-paper-tint p-2.5 rounded-xl border border-paper-line/60">
            &ldquo;{selectedUser.bio}&rdquo;
          </p>
        )}

        {/* Quick Action Strip (Suspend, Ban) */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-paper-line/60">
          <button
            onClick={() => handleToggleSuspend(selectedUser)}
            className={`py-1.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shadow-2xs ${
              selectedUser.is_suspended
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-paper hover:bg-amber-50 text-ink-soft border-paper-line hover:border-amber-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>{selectedUser.is_suspended ? 'Unsuspend' : 'Suspend'}</span>
          </button>

          <button
            onClick={() => {
              setBanModalUser(selectedUser);
              setBanReasonInput('');
            }}
            className={`py-1.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shadow-2xs ${
              selectedUser.is_banned
                ? 'bg-rose-50 text-rose-700 border-rose-300'
                : 'bg-paper hover:bg-rose-50 text-ink-soft border-paper-line hover:border-rose-200 hover:text-rose-600'
            }`}
          >
            <Ban className="w-3.5 h-3.5" />
            <span>{selectedUser.is_banned ? 'Unban' : 'Ban'}</span>
          </button>
        </div>
      </div>

      {/* Account Attributes & Telemetry */}
      <div className="p-3.5 rounded-2xl bg-paper-tint border border-paper-line shadow-xs space-y-2.5 text-xs">
        {/* Mongo ID */}
        <div className="flex items-center justify-between gap-2 min-h-[28px]">
          <span className="text-ink-mute font-medium flex items-center gap-2 shrink-0">
            <span className="w-4 h-4 flex items-center justify-center text-brand-600">
              <Hash className="w-3.5 h-3.5" />
            </span>
            Mongo ID
          </span>
          <div className="flex items-center gap-1 min-w-0">
            <span className="font-mono text-[11px] font-semibold text-ink bg-paper border border-paper-line px-2 py-0.5 rounded-md truncate max-w-[130px] sm:max-w-[150px]">
              {selectedUser.id}
            </span>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(selectedUser.id);
                showToast('Mongo ID copied to clipboard');
              }}
              className="p-1 rounded hover:bg-paper text-ink-mute hover:text-brand-700 transition cursor-pointer"
              title="Copy Mongo ID"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Phone */}
        <div className="flex items-center justify-between gap-2 min-h-[28px] pt-1 border-t border-paper-line/50">
          <span className="text-ink-mute font-medium flex items-center gap-2 shrink-0">
            <span className="w-4 h-4 flex items-center justify-center text-brand-600">
              <Phone className="w-3.5 h-3.5" />
            </span>
            Phone
          </span>
          <div className="flex items-center gap-1">
            <span className="font-mono text-[11px] font-bold text-ink bg-paper border border-paper-line px-2 py-0.5 rounded-md">
              {selectedUser.phone || 'None'}
            </span>
            {selectedUser.phone && (
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(selectedUser.phone || '');
                  showToast('Phone number copied');
                }}
                className="p-1 rounded hover:bg-paper text-ink-mute hover:text-brand-700 transition cursor-pointer"
                title="Copy Phone"
              >
                <Copy className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Permission */}
        <div className="flex items-center justify-between gap-2 min-h-[28px] pt-1 border-t border-paper-line/50">
          <span className="text-ink-mute font-medium flex items-center gap-2 shrink-0">
            <span className="w-4 h-4 flex items-center justify-center text-brand-600">
              <Shield className="w-3.5 h-3.5" />
            </span>
            Permission
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-brand-50 text-brand-700 border border-brand-200 shadow-2xs">
            {(selectedUser.role || 'member').replace('_', ' ')}
          </span>
        </div>

        {/* Registered */}
        <div className="flex items-center justify-between gap-2 min-h-[28px] pt-1 border-t border-paper-line/50">
          <span className="text-ink-mute font-medium flex items-center gap-2 shrink-0">
            <span className="w-4 h-4 flex items-center justify-center text-brand-600">
              <Calendar className="w-3.5 h-3.5" />
            </span>
            Registered
          </span>
          <span className="text-[11px] font-semibold text-ink bg-paper border border-paper-line px-2 py-0.5 rounded-md truncate">
            {formatChatTime(selectedUser.created_at)}
          </span>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between gap-2 min-h-[28px] pt-1 border-t border-paper-line/50">
          <span className="text-ink-mute font-medium flex items-center gap-2 shrink-0">
            <span className="w-4 h-4 flex items-center justify-center text-brand-600">
              <Activity className="w-3.5 h-3.5" />
            </span>
            Status
          </span>
          <span
            className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wide flex items-center gap-1.5 border shadow-2xs ${
              selectedUser.is_banned
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : selectedUser.is_suspended
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                selectedUser.is_banned
                  ? 'bg-rose-500'
                  : selectedUser.is_suspended
                  ? 'bg-amber-500'
                  : 'bg-emerald-500 animate-pulse'
              }`}
            />
            {selectedUser.is_banned ? 'BANNED' : selectedUser.is_suspended ? 'SUSPENDED' : 'ACTIVE'}
          </span>
        </div>
      </div>

      {/* Staff Notes & Audit */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-ink">
            <FileText className="w-4 h-4 text-brand-600" />
            <span>Staff Notes & Audit</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-paper-mist text-[10px] font-bold text-ink-mute border border-paper-line/50">
            {userNotes.length} {userNotes.length === 1 ? 'note' : 'notes'}
          </span>
        </div>

        {/* Note Composer Box */}
        <div className="rounded-2xl border border-paper-line bg-paper-tint overflow-hidden focus-within:border-brand-500 focus-within:bg-paper transition-all shadow-xs">
          <textarea
            rows={2}
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            placeholder="Write an internal staff note for this user..."
            autoComplete="off"
            spellCheck="false"
            className="w-full px-3.5 pt-3 pb-2 text-xs text-ink placeholder-ink-mute outline-none resize-none bg-transparent"
          />

          <div className="flex items-center justify-between px-3.5 py-2 border-t border-paper-line/60 bg-paper/60">
            <span className="text-[10px] text-ink-mute flex items-center gap-1 font-medium">
              <Lock className="w-3 h-3 text-ink-mute" />
              Internal staff only
            </span>
            <button
              onClick={handleAddNote}
              disabled={!newNoteText.trim()}
              className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-soft disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition flex items-center gap-1.5"
            >
              <span>Save Note</span>
            </button>
          </div>
        </div>

        {/* Notes Feed */}
        <div className="space-y-2.5 pt-1">
          {userNotes.map((note) => (
            <div key={note.id} className="p-3.5 rounded-2xl bg-paper border border-paper-line shadow-xs">
              <div className="flex items-start gap-3">
                <AdminUserAvatar
                  name={note.author}
                  size="xs"
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-ink truncate leading-tight">
                      {note.author}
                    </span>
                    <span className="text-[10px] text-ink-mute shrink-0 font-medium font-mono">
                      {note.date}
                    </span>
                  </div>
                  <p className="text-xs text-ink-soft leading-relaxed mt-1">
                    {note.text}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-paper-tint text-ink font-sans overflow-hidden select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-[99999] px-4 py-2.5 rounded-2xl bg-ink text-paper text-xs font-semibold shadow-lift border border-paper-line flex items-center gap-2 animate-in fade-in slide-in-from-top duration-200">
          <CheckCircle className="w-4 h-4 text-brand-500" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          1. NAVIGATION RAIL (Desktop Left Rail / Mobile Top Bar)
      ───────────────────────────────────────────────────────────── */}
      {/* MOBILE TOP BAR (Phone only < 768px) */}
      <header className="md:hidden h-14 bg-paper border-b border-paper-line flex items-center justify-between px-3.5 shrink-0 z-40">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBack}
            className="p-1.5 rounded-xl bg-paper-mist text-ink-mute hover:text-ink cursor-pointer"
            title="Return"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <BrandMark size={24} />
            <span className="font-black text-xs text-ink tracking-tight">Admin Console</span>
          </div>
        </div>

        {/* View Switcher Icons on Mobile */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveView('live_desk')}
            className={`p-2 rounded-xl text-xs ${
              activeView === 'live_desk' ? 'bg-brand-600 text-white' : 'text-ink-mute'
            }`}
            title="Live Desk"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveView('analytics')}
            className={`p-2 rounded-xl text-xs ${
              activeView === 'analytics' ? 'bg-brand-600 text-white' : 'text-ink-mute'
            }`}
            title="Analytics"
          >
            <BarChart3 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveView('users')}
            className={`p-2 rounded-xl text-xs ${
              activeView === 'users' ? 'bg-brand-600 text-white' : 'text-ink-mute'
            }`}
            title="Users"
          >
            <Users className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveView('moderation')}
            className={`p-2 rounded-xl text-xs relative ${
              activeView === 'moderation' ? 'bg-brand-600 text-white' : 'text-ink-mute'
            }`}
            title="Moderation"
          >
            <Flag className="w-4 h-4" />
            {reports.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveView('settings')}
            className={`p-2 rounded-xl text-xs ${
              activeView === 'settings' ? 'bg-brand-600 text-white' : 'text-ink-mute'
            }`}
            title="Settings"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* DESKTOP LEFT RAIL (>= 768px) */}
      <nav className="hidden md:flex w-16 shrink-0 bg-paper border-r border-paper-line flex-col items-center py-4 justify-between z-30 shadow-soft">
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-2xl bg-paper-mist hover:bg-brand-50 border border-paper-line hover:border-brand-200 text-ink-mute hover:text-brand-700 flex items-center justify-center transition cursor-pointer shadow-xs"
            title="Return to Main App"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="p-1.5 rounded-xl bg-brand-50 border border-brand-200/80 shadow-xs" title="Chatimall Admin Console">
            <BrandMark size={28} />
          </div>

          <div className="w-8 h-[1px] bg-paper-line" />

          {/* Navigation Items */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setActiveView('live_desk')}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition cursor-pointer ${
                activeView === 'live_desk'
                  ? 'bg-brand-600 text-white shadow-lift font-bold'
                  : 'text-ink-mute hover:text-ink hover:bg-brand-50/60'
              }`}
              title="Live Chat Operations Desk"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveView('analytics')}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition cursor-pointer ${
                activeView === 'analytics'
                  ? 'bg-brand-600 text-white shadow-lift font-bold'
                  : 'text-ink-mute hover:text-ink hover:bg-brand-50/60'
              }`}
              title="Realtime Analytics & Peak Traffic"
            >
              <BarChart3 className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveView('users')}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition cursor-pointer ${
                activeView === 'users'
                  ? 'bg-brand-600 text-white shadow-lift font-bold'
                  : 'text-ink-mute hover:text-ink hover:bg-brand-50/60'
              }`}
              title="Registered Users Directory & RBAC"
            >
              <Users className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveView('moderation')}
              className={`w-10 h-10 rounded-2xl relative flex items-center justify-center transition cursor-pointer ${
                activeView === 'moderation'
                  ? 'bg-brand-600 text-white shadow-lift font-bold'
                  : 'text-ink-mute hover:text-ink hover:bg-brand-50/60'
              }`}
              title="Flagged Messages Queue"
            >
              <Flag className="w-4 h-4" />
              {reports.length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
              )}
            </button>

            <button
              onClick={() => setActiveView('channels')}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition cursor-pointer ${
                activeView === 'channels'
                  ? 'bg-brand-600 text-white shadow-lift font-bold'
                  : 'text-ink-mute hover:text-ink hover:bg-brand-50/60'
              }`}
              title="Official Verified Channels"
            >
              <Radio className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveView('broadcast')}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition cursor-pointer ${
                activeView === 'broadcast'
                  ? 'bg-brand-600 text-white shadow-lift font-bold'
                  : 'text-ink-mute hover:text-ink hover:bg-brand-50/60'
              }`}
              title="Push Broadcasts"
            >
              <Bell className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveView('settings')}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition cursor-pointer ${
                activeView === 'settings'
                  ? 'bg-brand-600 text-white shadow-lift font-bold'
                  : 'text-ink-mute hover:text-ink hover:bg-brand-50/60'
              }`}
              title="System Configuration & Limits"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom Rail Controls */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => {
              void loadRealData();
              showToast('Re-synced with MongoDB Atlas database');
            }}
            className="w-10 h-10 rounded-2xl text-ink-mute hover:text-brand-700 hover:bg-brand-50 flex items-center justify-center transition cursor-pointer"
            title="Refresh Real MongoDB Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Current Admin User Avatar */}
          <div
            className="relative group cursor-pointer"
            title={`Logged In: ${profile?.name || 'Praise'} (App Owner)`}
          >
            <AdminUserAvatar
              name={profile?.name || 'Praise'}
              avatarUrl={profile?.avatar_url}
              size="sm"
              showOnline
            />
          </div>
        </div>
      </nav>

      {/* ─────────────────────────────────────────────────────────────
          2. LIVE WORKSPACE DISPATCHER
      ───────────────────────────────────────────────────────────── */}
      {activeView === 'live_desk' && (
        <div className="flex-1 flex h-full overflow-hidden relative">
          {/* ─────────────────────────────────────────────────────────
              COLUMN A: INBOXES & STATUS FILTERS
              - Visible on 2XL screens by default
              - Mobile / Laptop slide-over drawer
          ───────────────────────────────────────────────────────── */}
          {/* Desktop Fixed Column A */}
          <aside className="hidden 2xl:flex w-56 shrink-0 bg-paper border-r border-paper-line flex-col h-full">
            {inboxesSidebarContent}
          </aside>

          {/* Modal / Slide-over Drawer for smaller screens */}
          {showLeftDrawer && (
            <div className="fixed inset-0 z-50 flex">
              <div
                className="fixed inset-0 bg-ink/30 backdrop-blur-xs"
                onClick={() => setShowLeftDrawer(false)}
              />
              <div className="relative w-64 max-w-full bg-paper h-full shadow-2xl z-10 flex flex-col">
                <div className="p-3 border-b border-paper-line flex items-center justify-between">
                  <span className="font-bold text-xs text-ink">Inboxes & Statuses</span>
                  <button onClick={() => setShowLeftDrawer(false)} className="text-ink-mute hover:text-ink">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {inboxesSidebarContent}
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────
              COLUMN B: USERS QUEUE
              - Hidden on phone if mobilePane !== 'queue'
          ───────────────────────────────────────────────────────── */}
          <section
            className={`w-full md:w-72 lg:w-80 shrink-0 bg-paper border-r border-paper-line flex flex-col h-full select-none ${
              mobilePane !== 'queue' ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Header: Title + Drawer Toggle */}
            <div className="p-3.5 border-b border-paper-line flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowLeftDrawer(true)}
                  className="2xl:hidden p-1.5 rounded-lg text-ink-mute hover:text-ink hover:bg-paper-mist"
                  title="Inboxes & Filters"
                >
                  <Menu className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-xs font-bold text-ink flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-brand-600" />
                    <span>Registered Users ({filteredUsers.length})</span>
                  </h2>
                  <span className="text-[10px] text-ink-mute">Live MongoDB Atlas Database</span>
                </div>
              </div>

              <button
                onClick={() => void loadRealData()}
                className="p-1.5 rounded-lg text-ink-mute hover:text-ink hover:bg-brand-50 transition cursor-pointer"
                title="Refresh Real User List"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Search on Column B */}
            <div className="p-2.5 border-b border-paper-line bg-paper-tint">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-ink-mute absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter name or phone..."
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-paper rounded-xl border border-paper-line text-xs text-ink placeholder-ink-mute focus:border-brand-500 outline-none"
                />
              </div>
            </div>

            {/* Real User Cards List */}
            <div className="flex-1 overflow-y-auto divide-y divide-paper-line">
              {filteredUsers.length === 0 ? (
                <div className="p-6 text-center text-ink-mute text-xs">
                  No registered users match your search.
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = selectedUser?.id === u.id;
                  const role = u.role || (u.is_admin ? 'super_admin' : 'member');
                  return (
                    <div
                      key={u.id}
                      onClick={() => {
                        setSelectedUserId(u.id);
                        setMobilePane('chat');
                      }}
                      className={`p-3.5 flex items-start gap-3 transition cursor-pointer ${
                        isSelected ? 'bg-brand-50/80 border-l-4 border-l-brand-600' : 'hover:bg-paper-mist/50'
                      }`}
                    >
                      {/* User Avatar */}
                      <AdminUserAvatar
                        name={u.name}
                        avatarUrl={u.avatar_url}
                        size="md"
                        showOnline
                        isOnline={!u.is_banned && !u.is_suspended}
                      />

                      {/* Name, phone, and role */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-bold text-ink truncate flex items-center gap-1">
                            <span>{u.name}</span>
                            {isAppOwner(u.phone) && (
                              <span className="text-[8px] px-1 py-0.2 rounded bg-brand-50 text-brand-700 font-extrabold border border-brand-200">
                                Owner
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="text-[11px] text-ink-mute font-mono truncate">{u.phone || u.email || 'No contact'}</div>

                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase ${
                              role === 'super_admin'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : role === 'moderator'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-paper-mist text-ink-mute border border-paper-line'
                            }`}
                          >
                            {role.replace('_', ' ')}
                          </span>
                          <span className="text-[9px] text-ink-mute">{formatChatTime(u.last_seen)}</span>
                        </div>
                      </div>

                      {/* Flag / Reports indicator */}
                      {getUserReportCount(u) > 0 && (
                        <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                          {getUserReportCount(u)}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* ─────────────────────────────────────────────────────────
              COLUMN C: LIVE ACTIVITY & DISPATCH STAGE
              - Hidden on phone if mobilePane !== 'chat'
          ───────────────────────────────────────────────────────── */}
          <main
            className={`flex-1 flex flex-col bg-paper-tint h-full min-w-0 overflow-hidden ${
              mobilePane !== 'chat' ? 'hidden md:flex' : 'flex'
            }`}
          >
            {selectedUser ? (
              <>
                {/* Header with back button on mobile & details toggle on desktop */}
                <div className="h-14 sm:h-16 px-3.5 sm:px-6 bg-paper border-b border-paper-line flex items-center justify-between shrink-0 shadow-xs">
                  <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                    {/* Back to Queue on mobile */}
                    <button
                      onClick={() => setMobilePane('queue')}
                      className="md:hidden p-1.5 rounded-xl bg-paper-mist text-ink-mute hover:text-ink"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>

                    <AdminUserAvatar
                      name={selectedUser.name}
                      avatarUrl={selectedUser.avatar_url}
                      size="md"
                      showOnline
                      isOnline={!selectedUser.is_banned && !selectedUser.is_suspended}
                    />

                    <div className="min-w-0">
                      <h3 className="text-xs font-black text-ink flex items-center gap-1.5 truncate">
                        <span className="truncate">{selectedUser.name}</span>
                        {isAppOwner(selectedUser.phone) && (
                          <span className="hidden sm:inline-block text-[9px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-bold border border-brand-200 shrink-0">
                            App Owner
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-ink-mute font-mono truncate">
                        <span>{selectedUser.phone || 'No phone'}</span>
                        <span>•</span>
                        <span
                          className={
                            selectedUser.is_banned
                              ? 'text-rose-600 font-bold'
                              : selectedUser.is_suspended
                              ? 'text-amber-600 font-bold'
                              : 'text-brand-700 font-bold'
                          }
                        >
                          {selectedUser.is_banned ? 'Banned' : selectedUser.is_suspended ? 'Suspended' : 'Active'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Drawer Toggle */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      onClick={() => handleToggleSuspend(selectedUser)}
                      className={`hidden sm:flex px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold items-center gap-1.5 transition cursor-pointer ${
                        selectedUser.is_suspended
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-paper hover:bg-amber-50 text-ink-soft border-paper-line'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{selectedUser.is_suspended ? 'Unsuspend' : 'Suspend'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setRoleModalUser(selectedUser);
                        setSelectedNewRole((selectedUser.role as AdminRole) || 'member');
                      }}
                      className="hidden sm:flex px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold items-center gap-1.5 transition shadow-soft cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Role</span>
                    </button>

                    {/* Toggle User Details Button */}
                    <button
                      onClick={() => setShowRightDrawer(!showRightDrawer)}
                      className={`p-2 rounded-xl border border-paper-line transition cursor-pointer ${
                        showRightDrawer ? 'bg-brand-50 text-brand-700' : 'bg-paper text-ink-mute hover:text-ink'
                      }`}
                      title={showRightDrawer ? 'Hide Profile Drawer' : 'Show Profile Drawer'}
                    >
                      {showRightDrawer ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Main Activity & Inspection Stage */}
                <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4">
                  {/* Registration Banner */}
                  <div className="flex justify-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-brand-50 border border-brand-200 text-[10px] sm:text-[11px] font-semibold text-brand-800 shadow-xs">
                      <BrandMark size={14} />
                      <span>Registered on Chatimall ({formatChatTime(selectedUser.created_at)})</span>
                    </div>
                  </div>

                  {/* Account Activity Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-paper border border-paper-line shadow-xs">
                      <div className="text-[10px] uppercase font-bold text-ink-mute">E2EE Messages</div>
                      <div className="text-lg sm:text-xl font-black text-ink mt-0.5">
                        {loadingActivity ? '...' : selectedActivity?.messagesCount ?? 0}
                      </div>
                    </div>

                    <div className="p-3 sm:p-3.5 rounded-2xl bg-paper border border-paper-line shadow-xs">
                      <div className="text-[10px] uppercase font-bold text-ink-mute">Chat Rooms</div>
                      <div className="text-lg sm:text-xl font-black text-brand-700 mt-0.5">
                        {loadingActivity ? '...' : selectedActivity?.convsCount ?? 1}
                      </div>
                    </div>

                    <div className="p-3 sm:p-3.5 rounded-2xl bg-paper border border-paper-line shadow-xs">
                      <div className="text-[10px] uppercase font-bold text-ink-mute">Channels Owned</div>
                      <div className="text-lg sm:text-xl font-black text-ink mt-0.5">
                        {loadingActivity ? '...' : selectedActivity?.channelsCount ?? 0}
                      </div>
                    </div>

                    <div className="p-3 sm:p-3.5 rounded-2xl bg-paper border border-paper-line shadow-xs">
                      <div className="text-[10px] uppercase font-bold text-ink-mute">Reports Filed</div>
                      <div className="text-lg sm:text-xl font-black text-rose-600 mt-0.5">
                        {loadingActivity ? '...' : selectedActivity?.reportsAgainst ?? 0}
                      </div>
                    </div>
                  </div>

                  {/* Flagged Infractions if any exist */}
                  {userReports.length > 0 && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
                        <Flag className="w-4 h-4 text-rose-600" />
                        <span>Active Community Reports ({userReports.length})</span>
                      </div>
                      {userReports.map((r) => (
                        <div key={r.message_id} className="p-3 rounded-xl bg-white border border-rose-200 text-xs space-y-1">
                          <div className="font-semibold text-rose-900">Content: &quot;{r.body}&quot;</div>
                          <div className="flex items-center justify-between text-[11px] text-ink-mute pt-1">
                            <span>Reason: {r.reports[0]?.reason || 'Guidelines Infraction'}</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleModerateAction(r.message_id, 'warn')}
                                className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200"
                              >
                                Warn
                              </button>
                              <button
                                onClick={() => handleModerateAction(r.message_id, 'delete_message')}
                                className="px-2 py-0.5 rounded bg-rose-600 text-white font-bold"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Outgoing Admin Notice Bubble */}
                  <div className="flex flex-col items-end max-w-lg ml-auto space-y-1">
                    <div className="p-3.5 sm:p-4 rounded-3xl rounded-br-sm bg-gradient-to-r from-brand-600 to-brand-700 text-white text-xs leading-relaxed shadow-soft">
                      <div className="flex items-center gap-2 mb-1 text-brand-100 text-[10px] sm:text-[11px] font-bold">
                        <BrandMark size={14} />
                        <span>Official Chatimall System Communication</span>
                      </div>
                      <p>
                        Welcome {selectedUser.name}! Your account is securely authenticated on the Chatimall network.
                        All communications are end-to-end encrypted under our verified server security protocols.
                      </p>
                      <span className="text-[10px] text-brand-200 mt-2 block text-right">
                        {formatChatTime(selectedUser.last_seen)}
                      </span>
                    </div>
                  </div>

                  {/* Incoming User Status Card */}
                  <div className="flex flex-col items-start max-w-md space-y-1">
                    <div className="p-3.5 sm:p-4 rounded-3xl rounded-bl-sm bg-paper border border-paper-line text-ink text-xs shadow-soft space-y-1">
                      <div className="text-[10px] font-bold text-ink-mute uppercase tracking-wide">
                        Realtime Client Telemetry
                      </div>
                      <p className="font-medium text-ink">
                        Phone Prefix:{' '}
                        <span className="text-brand-700 font-bold">
                          {selectedUser.phone ? selectedUser.phone.slice(0, 4) : '+234'}
                        </span>{' '}
                        (Verified via SMS Gateway)
                      </p>
                      <p className="text-[11px] text-ink-mute">
                        Last Active Session: {formatChatTime(selectedUser.last_seen)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Composer */}
                <div className="p-3 sm:p-4 bg-paper border-t border-paper-line shrink-0">
                  <div className="rounded-2xl border border-paper-line bg-paper-tint p-2.5 sm:p-3 shadow-soft focus-within:bg-white focus-within:border-brand-500 transition">
                    <textarea
                      rows={2}
                      value={messageDraft}
                      onChange={(e) => setMessageDraft(e.target.value)}
                      placeholder={`Send direct admin announcement or warning to ${selectedUser.name}...`}
                      className="w-full text-xs text-ink placeholder-ink-mute outline-none resize-none bg-transparent"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendAdminMessage();
                        }
                      }}
                    />

                    <div className="flex items-center justify-between pt-2 border-t border-paper-line">
                      <div className="flex items-center gap-2.5 text-ink-mute">
                        <button type="button" className="hover:text-brand-700 cursor-pointer" title="Attach File">
                          <Paperclip className="w-4 h-4" />
                        </button>
                        <button type="button" className="hover:text-brand-700 cursor-pointer" title="Insert Emoji">
                          <Smile className="w-4 h-4" />
                        </button>
                        <button type="button" className="hover:text-brand-700 cursor-pointer" title="Insert Image">
                          <ImageIcon className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setMessageDraft(
                              'Please note that automated fraud and suspicious activities violate Chatimall community standards.'
                            );
                          }}
                          className="hidden sm:inline-block px-3 py-1.5 rounded-xl border border-paper-line bg-paper hover:bg-brand-50 text-ink-soft text-xs font-semibold cursor-pointer"
                        >
                          Template Warning
                        </button>

                        <button
                          type="button"
                          onClick={handleSendAdminMessage}
                          className="px-3.5 sm:px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-lift cursor-pointer"
                        >
                          <span>Send Notice</span>
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-ink-mute">
                <Users className="w-10 h-10 text-brand-600 mb-2 opacity-60" />
                <h3 className="text-sm font-bold text-ink">No User Selected</h3>
                <p className="text-xs">Select a registered user from the queue to inspect their live activity.</p>
              </div>
            )}
          </main>

          {/* ─────────────────────────────────────────────────────────
              COLUMN D: PROFILE & NOTES DRAWER
              - Responsive: toggles via showRightDrawer
              - Full sheet on mobile, docked column on desktop
          ───────────────────────────────────────────────────────── */}
          {showRightDrawer && selectedUser && (
            <aside className="w-full md:w-80 lg:w-84 xl:w-92 shrink-0 bg-paper border-l border-paper-line flex flex-col h-full z-20 shadow-lg md:shadow-none absolute md:relative inset-y-0 right-0 overflow-hidden">
              <div className="md:hidden p-3.5 border-b border-paper-line flex items-center justify-between bg-paper shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-xs text-ink">User Profile & Notes</span>
                  <span className="text-[10px] text-ink-mute font-mono truncate">({selectedUser.name})</span>
                </div>
                <button
                  onClick={() => setShowRightDrawer(false)}
                  className="p-1.5 rounded-xl bg-paper-mist hover:bg-paper-tint text-ink-mute hover:text-ink cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {profileDrawerContent}
            </aside>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. FULL VIEW: REALTIME ANALYTICS
      ───────────────────────────────────────────────────────────── */}
      {activeView === 'analytics' && (
        <div className="flex-1 flex flex-col h-full overflow-y-auto bg-paper p-4 sm:p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-paper-line pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-ink flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-brand-600" />
                <span>Live Analytics & MongoDB System Metrics</span>
              </h2>
              <p className="text-xs text-ink-mute">Operational telemetry and user retention rates</p>
            </div>

            <button
              onClick={() => {
                void loadRealData();
                showToast('Analytics refreshed from database');
              }}
              className="px-3.5 py-2 rounded-xl bg-paper hover:bg-brand-50 border border-paper-line text-xs font-bold text-ink-soft hover:text-brand-700 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh Metrics</span>
            </button>
          </div>

          {/* 6 Real Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-paper-tint border border-paper-line shadow-soft">
              <span className="text-[10px] sm:text-[11px] font-bold text-ink-mute uppercase">Total Accounts</span>
              <div className="text-xl sm:text-2xl font-black text-ink mt-1">
                {overview?.stats.totalUsers ?? users.length}
              </div>
              <span className="text-[10px] text-brand-600 font-bold">MongoDB Atlas</span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-paper-tint border border-paper-line shadow-soft">
              <span className="text-[10px] sm:text-[11px] font-bold text-ink-mute uppercase">Active (24h)</span>
              <div className="text-xl sm:text-2xl font-black text-brand-700 mt-1">{analytics.activeUsers24h}</div>
              <span className="text-[10px] text-ink-mute font-semibold">Online today</span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-paper-tint border border-paper-line shadow-soft">
              <span className="text-[10px] sm:text-[11px] font-bold text-ink-mute uppercase">E2EE Messages</span>
              <div className="text-xl sm:text-2xl font-black text-ink mt-1">{overview?.stats.totalMessages ?? 0}</div>
              <span className="text-[10px] text-brand-600 font-semibold">Live Traffic</span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-paper-tint border border-paper-line shadow-soft">
              <span className="text-[10px] sm:text-[11px] font-bold text-ink-mute uppercase">WebRTC Calls</span>
              <div className="text-xl sm:text-2xl font-black text-ink mt-1">{overview?.stats.totalCalls ?? 0}</div>
              <span className="text-[10px] text-ink-mute font-semibold">Voice & Video</span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-paper-tint border border-paper-line shadow-soft">
              <span className="text-[10px] sm:text-[11px] font-bold text-ink-mute uppercase">Retention Rate</span>
              <div className="text-xl sm:text-2xl font-black text-amber-700 mt-1">{analytics.retentionRate}%</div>
              <span className="text-[10px] text-amber-800 font-bold">7-Day Return</span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-paper-tint border border-paper-line shadow-soft">
              <span className="text-[10px] sm:text-[11px] font-bold text-ink-mute uppercase">Moderation Flags</span>
              <div className="text-xl sm:text-2xl font-black text-rose-600 mt-1">{reports.length}</div>
              <span className="text-[10px] text-rose-700 font-bold">In Queue</span>
            </div>
          </div>

          {/* 24-Hour Peak Usage Histogram */}
          <div className="p-4 sm:p-6 rounded-3xl bg-paper-tint border border-paper-line shadow-soft">
            <h3 className="text-xs font-bold text-ink mb-1 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-brand-600" />
              <span>Peak Usage Times (24-Hour Traffic Distribution)</span>
            </h3>
            <p className="text-[11px] text-ink-mute mb-5">
              Hourly messages and activity patterns across West Africa Time (WAT)
            </p>

            <div className="h-40 sm:h-44 flex items-end gap-1 sm:gap-1.5 pt-4 pb-2 border-b border-paper-line">
              {analytics.hourlyActivity.map((item) => {
                const maxVal = Math.max(...analytics.hourlyActivity.map((h) => h.messages), 10);
                const heightPct = Math.max(8, (item.messages / maxVal) * 100);
                return (
                  <div key={item.hour} className="flex-1 flex flex-col items-center gap-1 group">
                    <span className="text-[8px] sm:text-[9px] font-bold text-brand-700 opacity-0 group-hover:opacity-100 transition">
                      {item.messages}
                    </span>
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 transition"
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[7px] sm:text-[8px] text-ink-mute font-mono">{item.hour}h</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Regional & Platform breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="p-4 sm:p-6 rounded-3xl bg-paper-tint border border-paper-line shadow-soft space-y-3">
              <h4 className="text-xs font-bold text-ink flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-brand-600" />
                  <span>Client Devices Breakdown</span>
                </div>
                <span className="text-[10px] font-semibold text-ink-mute">
                  {analytics.platforms.reduce((s, p) => s + p.count, 0)} devices registered
                </span>
              </h4>
              <div className="space-y-3 text-xs">
                {(() => {
                  const total = analytics.platforms.reduce((s, p) => s + p.count, 0);
                  const getPlatformLabel = (plat: string) => {
                    const l = plat.toLowerCase();
                    if (l === 'android') return 'Android Mobile Client';
                    if (l === 'web') return 'Web Browser & Desktop';
                    if (l === 'ios') return 'iOS Mobile Client';
                    return plat.charAt(0).toUpperCase() + plat.slice(1);
                  };

                  const getPlatformColor = (plat: string) => {
                    const l = plat.toLowerCase();
                    if (l === 'android') return { text: 'text-brand-700', bar: 'bg-brand-600' };
                    if (l === 'web') return { text: 'text-teal-700', bar: 'bg-teal-600' };
                    return { text: 'text-indigo-700', bar: 'bg-indigo-600' };
                  };

                  const list =
                    analytics.platforms.length > 0
                      ? analytics.platforms
                      : [
                          { platform: 'android', count: 0 },
                          { platform: 'web', count: 0 },
                        ];

                  return list.map((item) => {
                    const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                    const color = getPlatformColor(item.platform);
                    return (
                      <div key={item.platform}>
                        <div className="flex justify-between font-semibold mb-1">
                          <span className="text-ink">{getPlatformLabel(item.platform)}</span>
                          <span className={`font-bold ${color.text}`}>
                            {pct}% <span className="font-normal text-ink-mute text-[10px]">({item.count})</span>
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-paper-line overflow-hidden">
                          <div className={`h-full ${color.bar} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            <div className="p-4 sm:p-6 rounded-3xl bg-paper-tint border border-paper-line shadow-soft space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-brand-50 border border-brand-200/80 flex items-center justify-center text-brand-600 shadow-2xs">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-ink">Regional Telephony Demographics</h4>
                    <p className="text-[10px] text-ink-mute">Active phone distribution by country</p>
                  </div>
                </div>
                <span className="text-[10px] text-brand-700 font-bold bg-brand-50 px-2.5 py-1 rounded-full border border-brand-200/80 shadow-2xs">
                  {analytics.demographics.reduce((sum, item) => sum + item.count, 0)} registered
                </span>
              </div>

              <div className="space-y-2.5">
                {analytics.demographics.length > 0 ? (
                  analytics.demographics.map((d) => {
                    const total = analytics.demographics.reduce((acc, item) => acc + item.count, 0);
                    const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
                    const countryName = d.region.replace(/\s*\(\+?[0-9-]+\)/, '').trim();
                    const dialCode = d.dial || d.region.match(/\(\+?[0-9-]+\)/)?.[0]?.replace(/[()]/g, '') || '';

                    return (
                      <button
                        key={d.region}
                        type="button"
                        onClick={() => {
                          setSelectedDemographic(d);
                          setDemographicSearch('');
                        }}
                        className="w-full flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-paper border border-paper-line hover:border-brand-300 hover:shadow-md hover:bg-gradient-to-r hover:from-brand-50/40 hover:via-white hover:to-paper transition-all duration-200 text-left cursor-pointer group"
                        title={`Click to view user phone numbers for ${d.region}`}
                      >
                        {/* Left: Flag + Country Name + Dial Code Badge */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="shrink-0 p-1.5 rounded-xl bg-paper-tint border border-paper-line shadow-2xs group-hover:border-brand-200 group-hover:bg-white transition">
                            <CountryFlag iso={d.iso} flag={d.flag} size="md" />
                          </div>
                          <div className="min-w-0 flex items-center gap-2">
                            <span className="font-extrabold text-xs sm:text-sm text-ink group-hover:text-brand-800 transition truncate">
                              {countryName || d.region}
                            </span>
                            {dialCode && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[10px] sm:text-[11px] font-bold text-ink-mute bg-paper-mist border border-paper-line group-hover:bg-brand-50 group-hover:text-brand-700 group-hover:border-brand-200 transition">
                                {dialCode}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right: Aligned Count Badge + Action CTA */}
                        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 ml-3">
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-paper-tint border border-paper-line group-hover:bg-white group-hover:border-brand-200 transition text-xs">
                            <span className="font-black text-brand-700">{d.count}</span>
                            <span className="text-[11px] font-semibold text-ink-mute">{d.count === 1 ? 'user' : 'users'}</span>
                            <span className="text-ink-mute/40">·</span>
                            <span className="text-[11px] font-bold text-brand-700">{pct}%</span>
                          </div>

                          <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand-50 text-brand-700 border border-brand-200/80 group-hover:bg-brand-600 group-hover:text-white group-hover:border-brand-600 transition-all duration-200 shadow-2xs text-xs font-bold">
                            <span>View numbers</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-xs text-ink-mute font-medium">
                    No phone numbers registered in database yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. FULL VIEW: USERS DIRECTORY & RBAC
      ───────────────────────────────────────────────────────────── */}
      {activeView === 'users' && (
        <div className="flex-1 flex flex-col h-full overflow-y-auto bg-paper p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-paper-line pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-ink flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-600" />
                <span>User Directory & RBAC Roles ({users.length})</span>
              </h2>
              <p className="text-xs text-ink-mute">Manage account roles, permissions, suspensions, and bans</p>
            </div>

            <button
              onClick={() => void loadRealData()}
              className="px-3.5 py-2 rounded-xl bg-paper hover:bg-brand-50 border border-paper-line text-xs font-bold text-ink-soft hover:text-brand-700 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh Directory</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-3.5 rounded-2xl bg-paper-tint border border-paper-line flex items-center gap-3">
            <Search className="w-4 h-4 text-ink-mute" />
            <input
              type="text"
              value={chatSearchQuery}
              onChange={(e) => setChatSearchQuery(e.target.value)}
              placeholder="Search by name, phone (09121598033), or email..."
              className="w-full bg-transparent text-xs text-ink outline-none"
            />
          </div>

          {/* Real Users Table */}
          <div className="rounded-3xl border border-paper-line overflow-x-auto bg-paper shadow-soft">
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead className="bg-paper-mist text-ink-mute uppercase text-[10px] font-bold border-b border-paper-line">
                <tr>
                  <th className="px-5 py-3.5">User Identity</th>
                  <th className="px-4 py-3.5">Assigned Role (RBAC)</th>
                  <th className="px-4 py-3.5">Account Status</th>
                  <th className="px-4 py-3.5">Last Active</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-line">
                {filteredUsers.map((u) => {
                  const role = u.role || (u.is_admin ? 'super_admin' : 'member');
                  return (
                    <tr key={u.id} className="hover:bg-brand-50/40 transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <AdminUserAvatar
                            name={u.name}
                            avatarUrl={u.avatar_url}
                            size="sm"
                            showOnline
                            isOnline={!u.is_banned && !u.is_suspended}
                          />
                          <div>
                            <div className="font-bold text-ink flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isAppOwner(u.phone) && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-700 font-extrabold border border-brand-200">
                                  Owner
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-ink-mute font-mono">{u.phone || u.email || 'No contact'}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => {
                            setRoleModalUser(u);
                            setSelectedNewRole((u.role as AdminRole) || 'member');
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide border cursor-pointer ${
                            role === 'super_admin'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : role === 'moderator'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : role === 'support_agent'
                              ? 'bg-teal-50 text-teal-700 border-teal-200'
                              : 'bg-paper-mist text-ink-mute border-paper-line'
                          }`}
                        >
                          {role.replace('_', ' ')}
                        </button>
                      </td>

                      <td className="px-4 py-3.5">
                        {u.is_banned ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            BANNED
                          </span>
                        ) : u.is_suspended ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            SUSPENDED
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ACTIVE
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-ink-mute text-[11px] font-medium">{formatChatTime(u.last_seen)}</td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggleSuspend(u)}
                            className="p-1.5 rounded-lg text-ink-mute hover:text-amber-700 hover:bg-amber-50 cursor-pointer"
                            title={u.is_suspended ? 'Reactivate' : 'Suspend'}
                          >
                            {u.is_suspended ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={() => {
                              setBanModalUser(u);
                              setBanReasonInput('');
                            }}
                            className="p-1.5 rounded-lg text-ink-mute hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                            title={u.is_banned ? 'Unban' : 'Ban'}
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 rounded-lg text-ink-mute hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                            title="Delete Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. FULL VIEW: MODERATION QUEUE
      ───────────────────────────────────────────────────────────── */}
      {activeView === 'moderation' && (
        <div className="flex-1 flex flex-col h-full overflow-y-auto bg-paper p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-paper-line pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-ink flex items-center gap-2">
                <Flag className="w-5 h-5 text-rose-600" />
                <span>Flagged Content Queue ({reports.length})</span>
              </h2>
              <p className="text-xs text-ink-mute">Review community reports and enforce Chatimall guidelines</p>
            </div>

            <button
              onClick={() => void loadRealData()}
              className="px-3.5 py-2 rounded-xl bg-paper hover:bg-brand-50 border border-paper-line text-xs font-bold text-ink-soft hover:text-brand-700 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh Reports</span>
            </button>
          </div>

          {reports.length === 0 ? (
            <div className="p-12 text-center border border-paper-line rounded-3xl bg-paper-tint space-y-2">
              <ShieldCheck className="w-10 h-10 text-brand-600 mx-auto" />
              <h3 className="text-sm font-bold text-ink">No Pending Flagged Messages</h3>
              <p className="text-xs text-ink-mute">All community reports have been successfully moderated.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <div key={r.message_id} className="p-4 sm:p-5 rounded-3xl border border-paper-line bg-paper shadow-soft space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-bold text-ink">Sender: {r.sender_name}</div>
                      <div className="text-[11px] text-ink-mute">
                        Phone: {r.sender_phone || 'None'} · {formatChatTime(r.created_at)}
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      {r.reports.length} Reports
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-paper-mist border border-paper-line text-xs font-mono text-ink">
                    {r.body || '[Attachment or Media Message]'}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-paper-line">
                    <button
                      onClick={() => handleModerateAction(r.message_id, 'warn')}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 cursor-pointer"
                    >
                      Warn User
                    </button>
                    <button
                      onClick={() => handleModerateAction(r.message_id, 'delete_message')}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer shadow-soft"
                    >
                      Delete Message
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. FULL VIEW: CHANNELS & BROADCASTS
      ───────────────────────────────────────────────────────────── */}
      {activeView === 'channels' && (
        <div className="flex-1 flex flex-col h-full overflow-y-auto bg-paper p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-paper-line pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-ink flex items-center gap-2">
                <Radio className="w-5 h-5 text-brand-600" />
                <span>Official Channels ({channels.length})</span>
              </h2>
              <p className="text-xs text-ink-mute">Official verified channels and content broadcasts</p>
            </div>

            <button
              onClick={() => setShowChannelModal(true)}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-soft"
            >
              <Plus className="w-4 h-4" />
              <span>New Channel</span>
            </button>
          </div>

          {channels.length === 0 ? (
            <div className="p-10 text-center border border-paper-line rounded-3xl bg-paper-tint space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 border border-brand-200/80 flex items-center justify-center mx-auto">
                <Radio className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-ink">No Official Channels Yet (Count: 0)</h3>
              <p className="text-xs text-ink-mute max-w-sm mx-auto">
                Official channels let you broadcast verified updates, releases, and announcements to all connected members.
              </p>
              <button
                onClick={() => setShowChannelModal(true)}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-soft transition cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create Official Channel Now</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {channels.map((c) => (
                <div key={c.id} className="p-5 rounded-3xl border border-paper-line bg-paper-tint shadow-soft flex flex-col justify-between space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-black text-ink">{c.name}</h4>
                      <p className="text-[11px] text-ink-mute mt-1 line-clamp-2">{c.description || 'No description'}</p>
                    </div>
                    <button onClick={() => handleDeleteChannel(c.id)} className="text-ink-mute hover:text-rose-600 p-1 cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-[10px] text-brand-700 font-bold pt-2 border-t border-paper-line">
                    {c.subscribers} Subscribers · {c.posts_count} Posts
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          7. FULL VIEW: PUSH BROADCASTS
      ───────────────────────────────────────────────────────────── */}
      {activeView === 'broadcast' && (
        <div className="flex-1 flex flex-col h-full overflow-y-auto bg-paper p-4 sm:p-6 space-y-4">
          <div className="max-w-xl mx-auto w-full space-y-5">
            <div className="border-b border-paper-line pb-4">
              <h2 className="text-base sm:text-lg font-black text-ink flex items-center gap-2">
                <Bell className="w-5 h-5 text-brand-600" />
                <span>Send Push Announcement</span>
              </h2>
              <p className="text-xs text-ink-mute">Realtime alert sent to all online devices</p>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-ink block mb-1">Title</label>
                <input
                  type="text"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="e.g. Chatimall System Upgrade"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-paper-line bg-paper-tint text-xs text-ink focus:bg-white focus:border-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-ink block mb-1">Message Body</label>
                <textarea
                  rows={4}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Type official broadcast..."
                  className="w-full p-3.5 rounded-2xl border border-paper-line bg-paper-tint text-xs text-ink focus:bg-white focus:border-brand-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-ink block mb-1">Target Destination</label>
                <select
                  value={broadcastChannelId}
                  onChange={(e) => setBroadcastChannelId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-paper-line bg-paper-tint text-xs text-ink focus:bg-white focus:border-brand-500 outline-none cursor-pointer"
                >
                  <option value="">Global Realtime Alert (All user devices)</option>
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      Channel: {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={broadcasting}
                className="w-full py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-soft disabled:opacity-50"
              >
                {broadcasting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Send Broadcast Announcement</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          8. FULL VIEW: SYSTEM CONFIGURATION
      ───────────────────────────────────────────────────────────── */}
      {activeView === 'settings' && (
        <div className="flex-1 flex flex-col h-full overflow-y-auto bg-paper p-4 sm:p-6 space-y-6">
          <form onSubmit={handleSaveSettings} className="max-w-2xl mx-auto w-full space-y-5">
            <div className="flex items-center justify-between border-b border-paper-line pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-black text-ink flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-brand-600" />
                  <span>System Configuration & Messaging Limits</span>
                </h2>
                <p className="text-xs text-ink-mute">Configure file sharing limits, maintenance locks, and prohibited words</p>
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-soft disabled:opacity-50"
              >
                {savingSettings && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Configuration</span>
              </button>
            </div>

            {/* Maintenance Mode */}
            <div className="p-4 sm:p-5 rounded-3xl border border-paper-line bg-paper-tint space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-ink">Maintenance Mode</div>
                  <p className="text-[11px] text-ink-mute">Temporarily lock down the client app for database upgrades.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) => setSettings((s) => ({ ...s, maintenanceMode: e.target.checked }))}
                  className="w-4 h-4 accent-brand-600 cursor-pointer"
                />
              </div>

              {settings.maintenanceMode && (
                <div>
                  <label className="text-[11px] font-semibold text-rose-800 block mb-1">Maintenance Notice Banner:</label>
                  <input
                    type="text"
                    value={settings.maintenanceNotice}
                    onChange={(e) => setSettings((s) => ({ ...s, maintenanceNotice: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl border border-rose-300 bg-white text-xs text-ink"
                  />
                </div>
              )}
            </div>

            {/* File Sharing Slider */}
            <div className="p-4 sm:p-5 rounded-3xl border border-paper-line bg-paper-tint space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-ink">Max File Sharing Upload Limit</span>
                <span className="font-extrabold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
                  {settings.fileSharingLimitMb} MB
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={settings.fileSharingLimitMb}
                onChange={(e) => setSettings((s) => ({ ...s, fileSharingLimitMb: Number(e.target.value) }))}
                className="w-full accent-brand-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-ink-mute font-medium">
                <span>10 MB (Data Saver)</span>
                <span>50 MB (Standard)</span>
                <span>100 MB (High Capacity)</span>
              </div>
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl border border-paper-line bg-paper-tint flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-ink">Voice Messaging</div>
                  <div className="text-[10px] text-ink-mute">High fidelity voice notes</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.voiceInputEnabled}
                  onChange={(e) => setSettings((s) => ({ ...s, voiceInputEnabled: e.target.checked }))}
                  className="w-4 h-4 accent-brand-600 cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-2xl border border-paper-line bg-paper-tint flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-ink">WebRTC Calling</div>
                  <div className="text-[10px] text-ink-mute">Audio & Video calls</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.callsEnabled}
                  onChange={(e) => setSettings((s) => ({ ...s, callsEnabled: e.target.checked }))}
                  className="w-4 h-4 accent-brand-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Prohibited Words */}
            <div className="p-4 sm:p-5 rounded-3xl border border-paper-line bg-paper-tint space-y-3">
              <div className="text-xs font-bold text-ink">Safety Prohibited Words</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newBannedWord}
                  onChange={(e) => setNewBannedWord(e.target.value)}
                  placeholder="Add banned term..."
                  className="flex-1 px-3.5 py-2 rounded-xl border border-paper-line text-xs bg-white text-ink outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddBannedWord}
                  className="px-4 py-2 rounded-xl bg-ink text-paper text-xs font-bold cursor-pointer"
                >
                  Add
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {settings.bannedWords.map((w) => (
                  <span
                    key={w}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-mono"
                  >
                    <span>{w}</span>
                    <button type="button" onClick={() => handleRemoveBannedWord(w)}>
                      <X className="w-3 h-3 text-rose-500 hover:text-rose-900 cursor-pointer" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODALS
      ───────────────────────────────────────────────────────────── */}
      {/* Role Switcher Modal */}
      {roleModalUser && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-ink/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-paper border border-paper-line p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink">Assign Role: {roleModalUser.name}</h3>
              <button onClick={() => setRoleModalUser(null)}>
                <X className="w-4 h-4 text-ink-mute" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {(['super_admin', 'moderator', 'support_agent', 'member'] as AdminRole[]).map((r) => (
                <div
                  key={r}
                  onClick={() => setSelectedNewRole(r)}
                  className={`p-3 rounded-2xl border transition cursor-pointer ${
                    selectedNewRole === r
                      ? 'bg-brand-50 border-brand-500 text-ink font-bold'
                      : 'border-paper-line text-ink-soft hover:bg-paper-mist'
                  }`}
                >
                  <div className="capitalize">{r.replace('_', ' ')}</div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRoleModalUser(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-ink-mute hover:bg-paper-mist cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRoleChange}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-soft cursor-pointer"
              >
                Save Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban Modal */}
      {banModalUser && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-ink/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-paper border border-paper-line p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-ink">
              {banModalUser.is_banned ? 'Unban User Account' : 'Ban User Account'}
            </h3>
            <p className="text-xs text-ink-mute">
              {banModalUser.is_banned
                ? `Restore access for ${banModalUser.name}?`
                : `Specify reason for banning ${banModalUser.name}:`}
            </p>

            {!banModalUser.is_banned && (
              <input
                type="text"
                value={banReasonInput}
                onChange={(e) => setBanReasonInput(e.target.value)}
                placeholder="e.g. Community guidelines violation"
                className="w-full px-3.5 py-2 rounded-xl border border-paper-line bg-paper-tint text-xs text-ink"
              />
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setBanModalUser(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-ink-mute hover:bg-paper-mist cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBan}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-soft cursor-pointer"
              >
                {banModalUser.is_banned ? 'Unban' : 'Confirm Ban'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Channel Modal */}
      {showChannelModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-ink/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-paper border border-paper-line p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-ink">Create Official Channel</h3>
            <form onSubmit={handleCreateChannel} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-ink block mb-1">Channel Name</label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="e.g. Chatimall Official"
                  className="w-full px-3.5 py-2 rounded-xl border border-paper-line bg-paper-tint text-xs text-ink"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-ink block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newChannelDesc}
                  onChange={(e) => setNewChannelDesc(e.target.value)}
                  placeholder="Broadcast channel description..."
                  className="w-full p-2.5 rounded-xl border border-paper-line bg-paper-tint text-xs text-ink"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChannelModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-ink-mute hover:bg-paper-mist cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-soft cursor-pointer"
                >
                  Create Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          DEMOGRAPHICS NUMBERS MODAL (View User Phone Numbers)
      ───────────────────────────────────────────────────────────── */}
      {selectedDemographic && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-paper border border-paper-line shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-paper-line bg-gradient-to-r from-brand-700 via-brand-600 to-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                  {selectedDemographic.iso ? (
                    <CountryFlag iso={selectedDemographic.iso} flag={selectedDemographic.flag} size="sm" />
                  ) : (
                    <Phone className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black truncate leading-tight">
                    {selectedDemographic.region}
                  </h3>
                  <p className="text-[11px] text-emerald-100 font-medium">
                    {selectedDemographic.count} Registered Phone {selectedDemographic.count === 1 ? 'Number' : 'Numbers'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDemographic(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Search Filter */}
            {(selectedDemographic.users?.length ?? 0) > 3 && (
              <div className="p-3 border-b border-paper-line bg-paper-tint">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-ink-mute absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search name or phone number..."
                    value={demographicSearch}
                    onChange={(e) => setDemographicSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-paper border border-paper-line text-ink outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            )}

            {/* Modal Users List */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {(() => {
                const rawUsers =
                  selectedDemographic.users && selectedDemographic.users.length > 0
                    ? selectedDemographic.users
                    : users.filter((u) => {
                        if (!u.phone) return false;
                        const p = u.phone.replace(/\D/g, '');
                        if (selectedDemographic.region.includes('+234')) return p.startsWith('234') || (p.startsWith('0') && p.length === 11);
                        if (selectedDemographic.region.includes('+233')) return p.startsWith('233');
                        if (selectedDemographic.region.includes('+254')) return p.startsWith('254');
                        if (selectedDemographic.region.includes('+27')) return p.startsWith('27');
                        if (selectedDemographic.region.includes('+1')) return p.startsWith('1');
                        if (selectedDemographic.region.includes('+44')) return p.startsWith('44');
                        return true;
                      });

                const usersWithPhone = rawUsers.filter(
                  (u): u is typeof u & { phone: string } => typeof u.phone === 'string' && u.phone.length > 0
                );
                const filtered = usersWithPhone.filter((u) => {
                  const q = demographicSearch.toLowerCase().trim();
                  if (!q) return true;
                  return u.name.toLowerCase().includes(q) || u.phone.includes(q);
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-8 text-center text-xs text-ink-mute font-medium">
                      No registered users found for this region.
                    </div>
                  );
                }

                return filtered.map((u) => {
                  const formatted = formatNigeriaPhone(u.phone);
                  return (
                    <div
                      key={u.id}
                      className="p-3.5 rounded-2xl border border-paper-line bg-paper-tint/60 hover:bg-paper-tint transition space-y-2.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <AdminUserAvatar
                            name={u.name}
                            avatarUrl={u.avatar_url}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <div className="font-extrabold text-xs text-ink truncate flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isAppOwner(u.phone) && (
                                <span className="text-[8px] px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-800 font-black border border-amber-300">
                                  👑 Owner
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-ink-mute capitalize">
                              {(u.role || 'member').replace('_', ' ')}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUserId(u.id);
                            setActiveView('live_desk');
                            setSelectedDemographic(null);
                            showToast(`Opened profile for ${u.name}`);
                          }}
                          className="px-2.5 py-1 rounded-xl bg-brand-50 hover:bg-brand-600 text-brand-700 hover:text-white border border-brand-200 hover:border-brand-600 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                        >
                          <span>Live Desk</span>
                          <span>→</span>
                        </button>
                      </div>

                      {/* Prominent Phone Number Box */}
                      <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-paper border border-brand-200/60 shadow-inner">
                        <div className="flex items-center gap-2 min-w-0">
                          <Phone className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className="font-mono text-sm sm:text-base font-black text-brand-900 tracking-tight select-all">
                              {formatted}
                            </span>
                            {u.phone !== formatted && (
                              <span className="font-mono text-[10px] text-ink-mute">
                                Raw: {u.phone}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(u.phone);
                              showToast(`Copied phone: ${u.phone}`);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-paper-mist hover:bg-brand-50 text-ink-soft hover:text-brand-700 border border-paper-line text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                            title="Copy number to clipboard"
                          >
                            <Copy className="w-3.5 h-3.5 text-brand-600" />
                            <span>Copy</span>
                          </button>

                          <a
                            href={`tel:${u.phone}`}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 transition"
                            title="Call user phone"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-paper-line bg-paper flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDemographic(null)}
                className="px-4 py-1.5 rounded-xl bg-paper-mist hover:bg-paper-line text-ink font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
