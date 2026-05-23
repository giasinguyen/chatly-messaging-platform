import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  Database,
  FileText,
  Globe,
  MessageSquare,
  MessagesSquare,
  ShieldAlert,
  UserPlus,
  Users,
} from "lucide-react";
import type { AdminStatsResponse } from "@/types/admin";

interface KpiCardData {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  colorClass: string;
  trend?: string;
}

interface BreakdownData {
  label: string;
  value: number;
  percentage: number;
  colorClass: string;
}

interface OperationalStatData {
  label: string;
  value: number;
  icon: LucideIcon;
  colorClass: string;
  suffix?: string;
}

interface DashboardViewModel {
  averageMessagesPerConversation: number;
  kpiCards: KpiCardData[];
  userBreakdown: BreakdownData[];
  conversationBreakdown: BreakdownData[];
  contentBreakdown: BreakdownData[];
  operationalStats: OperationalStatData[];
}

export function formatNumber(value: number) {
  return value.toLocaleString();
}

export function formatDecimal(value: number) {
  return value.toFixed(1);
}

function getPercent(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return (value / total) * 100;
}

function getAverage(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return value / total;
}

export function buildDashboardViewModel(
  stats: AdminStatsResponse
): DashboardViewModel {
  const directConversations = Math.max(stats.totalConversations - stats.totalGroups, 0);
  const activeOfflineUsers = Math.max(stats.activeUsers - stats.onlineUsers, 0);
  const inactiveUsers = Math.max(stats.totalUsers - stats.activeUsers, 0);
  const maxContentVolume = Math.max(
    stats.totalMessages,
    stats.totalPosts,
    stats.totalConversations,
    1
  );
  const healthUpCount = stats.systemHealth.filter(
    (item) => item.status === "UP"
  ).length;
  const healthScore = getPercent(healthUpCount, stats.systemHealth.length);
  const activeRate = getPercent(stats.activeUsers, stats.totalUsers);
  const onlineRate = getPercent(stats.onlineUsers, stats.totalUsers);
  const groupConversationRate = getPercent(stats.totalGroups, stats.totalConversations);
  const averageMessagesPerConversation = getAverage(
    stats.totalMessages,
    stats.totalConversations
  );
  const averagePostsPerUser = getAverage(stats.totalPosts, stats.totalUsers);

  return {
    averageMessagesPerConversation,
    kpiCards: buildKpiCards(
      stats,
      activeRate,
      onlineRate,
      groupConversationRate,
      averageMessagesPerConversation,
      averagePostsPerUser
    ),
    userBreakdown: [
      {
        label: "Online",
        value: stats.onlineUsers,
        percentage: onlineRate,
        colorClass: "bg-emerald-500",
      },
      {
        label: "Active offline",
        value: activeOfflineUsers,
        percentage: getPercent(activeOfflineUsers, stats.totalUsers),
        colorClass: "bg-blue-500",
      },
      {
        label: "Inactive",
        value: inactiveUsers,
        percentage: getPercent(inactiveUsers, stats.totalUsers),
        colorClass: "bg-slate-300",
      },
    ],
    conversationBreakdown: [
      {
        label: "Direct chats",
        value: directConversations,
        percentage: getPercent(directConversations, stats.totalConversations),
        colorClass: "bg-cyan-500",
      },
      {
        label: "Group chats",
        value: stats.totalGroups,
        percentage: groupConversationRate,
        colorClass: "bg-amber-500",
      },
    ],
    contentBreakdown: [
      {
        label: "Messages",
        value: stats.totalMessages,
        percentage: getPercent(stats.totalMessages, maxContentVolume),
        colorClass: "bg-blue-500",
      },
      {
        label: "Posts",
        value: stats.totalPosts,
        percentage: getPercent(stats.totalPosts, maxContentVolume),
        colorClass: "bg-indigo-500",
      },
      {
        label: "Conversations",
        value: stats.totalConversations,
        percentage: getPercent(stats.totalConversations, maxContentVolume),
        colorClass: "bg-cyan-500",
      },
    ],
    operationalStats: [
      {
        label: "Active users",
        value: stats.activeUsers,
        icon: Activity,
        colorClass: "text-teal-600",
      },
      {
        label: "New today",
        value: stats.todayNewUsers,
        icon: UserPlus,
        colorClass: "text-indigo-600",
      },
      {
        label: "Groups",
        value: stats.totalGroups,
        icon: Database,
        colorClass: "text-amber-600",
      },
      {
        label: "Health score",
        value: Math.round(healthScore),
        suffix: "%",
        icon: healthScore < 100 ? AlertTriangle : Activity,
        colorClass: healthScore < 100 ? "text-red-600" : "text-emerald-600",
      },
    ],
  };
}

function buildKpiCards(
  stats: AdminStatsResponse,
  activeRate: number,
  onlineRate: number,
  groupConversationRate: number,
  averageMessagesPerConversation: number,
  averagePostsPerUser: number
): KpiCardData[] {
  return [
    {
      label: "Total Users",
      value: formatNumber(stats.totalUsers),
      helper: `${formatDecimal(activeRate)}% active in 24h`,
      trend: `+${formatNumber(stats.todayNewUsers)} today`,
      icon: Users,
      colorClass: "text-purple-600 bg-purple-50 border-purple-100",
    },
    {
      label: "Online Now",
      value: formatNumber(stats.onlineUsers),
      helper: `${formatDecimal(onlineRate)}% of accounts`,
      icon: Globe,
      colorClass: "text-emerald-600 bg-emerald-50 border-emerald-100",
    },
    {
      label: "Messages",
      value: formatNumber(stats.totalMessages),
      helper: `${formatDecimal(averageMessagesPerConversation)} per conversation`,
      icon: MessageSquare,
      colorClass: "text-blue-600 bg-blue-50 border-blue-100",
    },
    {
      label: "Conversations",
      value: formatNumber(stats.totalConversations),
      helper: `${formatDecimal(groupConversationRate)}% group chats`,
      icon: MessagesSquare,
      colorClass: "text-cyan-600 bg-cyan-50 border-cyan-100",
    },
    {
      label: "Posts",
      value: formatNumber(stats.totalPosts),
      helper: `${formatDecimal(averagePostsPerUser)} per user`,
      icon: FileText,
      colorClass: "text-indigo-600 bg-indigo-50 border-indigo-100",
    },
    {
      label: "Pending Reports",
      value: formatNumber(stats.pendingReports),
      helper:
        stats.pendingReports > 0 ? "Needs moderator review" : "Queue is clear",
      icon: ShieldAlert,
      colorClass:
        stats.pendingReports > 0
          ? "text-red-600 bg-red-50 border-red-100"
          : "text-slate-500 bg-slate-50 border-slate-100",
    },
  ];
}
