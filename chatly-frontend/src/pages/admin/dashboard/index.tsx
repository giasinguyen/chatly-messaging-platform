import { useMemo } from "react";
import {
    Users,
    Activity,
    ShieldCheck,
    AlertTriangle,
    Download,
    UserPlus,
    RefreshCw,
    MailOpen,
    Filter,
    ArrowUpRight,
} from "lucide-react";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const overviewStats = [
    {
        label: "Total Users",
        value: "68,245",
        delta: "+18% vs last month",
        icon: Users,
        accent: "from-[#5D5FEF]/80 to-[#5D9CFF]/60",
        trend: [12, 16, 11, 19, 15, 21, 18],
    },
    {
        label: "Active Now",
        value: "4,981",
        delta: "512 real-time sessions",
        icon: Activity,
        accent: "from-[#0EC5A5]/80 to-[#5BCEFA]/70",
        trend: [8, 12, 10, 14, 17, 20, 16],
    },
    {
        label: "New Requests",
        value: "426",
        delta: "64 reports + 21 flagged",
        icon: AlertTriangle,
        accent: "from-[#FF7B54]/80 to-[#FFB347]/60",
        trend: [4, 6, 5, 7, 6, 8, 9],
    },
    {
        label: "Retention Rate",
        value: "92%",
        delta: "+6% in 30 days",
        icon: ShieldCheck,
        accent: "from-[#6A5ACD]/80 to-[#9B6BFF]/60",
        trend: [15, 14, 17, 18, 16, 20, 21],
    },
];

const newUsers = [
    { id: "#981", name: "Minh Tran", email: "minh.tran@chatly.app", plan: "Pro", country: "VN", lastActive: "5 mins ago" },
    { id: "#982", name: "Sara Lee", email: "sara.lee@chatly.app", plan: "Starter", country: "SG", lastActive: "12 mins ago" },
    { id: "#983", name: "Long Pham", email: "long.pham@chatly.app", plan: "Enterprise", country: "VN", lastActive: "30 mins ago" },
    { id: "#984", name: "Daisy Ortega", email: "daisy@chatly.app", plan: "Pro", country: "PH", lastActive: "45 mins ago" },
];

const moderationQueue = [
    { id: "U-1822", name: "bao.nguyen", issue: "Automated Spam", severity: "high", openedAt: "09:14" },
    { id: "U-1827", name: "quinn.do", issue: "Content Report", severity: "medium", openedAt: "08:52" },
    { id: "U-1832", name: "lucas.ng", issue: "Strange multi-device access", severity: "medium", openedAt: "08:21" },
];

const usageSplit = [
    { label: "Enterprise", value: 42, color: "bg-[#6A5ACD]" },
    { label: "Pro", value: 36, color: "bg-[#0EC5A5]" },
    { label: "Starter", value: 22, color: "bg-[#FF7B54]" },
];

const activityTimeline = [
    { label: "Deploy real-time patch", time: "09:45", owner: "Reliability", status: "Success" },
    { label: "Sync user data", time: "08:20", owner: "Data Lake", status: "Processing" },
    { label: "Sync marketing webhook", time: "07:05", owner: "Growth", status: "Completed" },
];

export default function DashboardPage() {
    const totalFlagged = useMemo(
        () => moderationQueue.filter((item) => item.severity === "high").length,
        [],
    );

    return (
        <div className="min-h-screen w-full bg-slate-950/95 text-foreground">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-12 pt-8 md:px-8">
                <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#070b21] via-[#081839] to-[#0b214f] p-8 text-slate-100 shadow-2xl">
                    <div className="absolute right-12 top-8 hidden h-40 w-40 rounded-full bg-white/10 blur-3xl md:block" />
                    <div className="absolute -left-10 bottom-0 h-56 w-56 rounded-full bg-[#5D5FEF]/20 blur-[110px]" />
                    <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="max-w-xl space-y-3">
                            <Badge className="bg-white/15 text-xs font-medium uppercase tracking-widest text-white">
                                Admin Dashboard
                            </Badge>
                            <h1 className="text-3xl font-semibold leading-tight text-white sm:text-4xl">
                                All user activities in one view.
                            </h1>
                            <p className="text-sm text-white/70">
                                Monitor real-time sessions, process reports, and allocate system resources.
                                Metrics based on the last 24h.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 rounded-2xl border border-white/15 bg-white/5 p-4 text-sm text-white/80 backdrop-blur">
                            <div className="flex items-center justify-between">
                                <span>API latency</span>
                                <span className="font-semibold text-white">142 ms</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Socket throughput</span>
                                <span className="font-semibold text-white">12.4k msg/s</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Admin sessions</span>
                                <span className="font-semibold text-white">5</span>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-3 text-xs text-white/60">
                        <Badge variant="outline" className="border-white/20 bg-white/5 text-white">
                            24/7 Incident response ready
                        </Badge>
                        <Badge variant="outline" className="border-white/20 bg-white/5 text-white">
                            SOC2 • GDPR • PDPA
                        </Badge>
                        <Badge variant="outline" className="border-white/20 bg-white/5 text-white">
                            Multi-tenant control
                        </Badge>
                    </div>
                </section>

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {overviewStats.map((stat) => (
                        <Card
                            key={stat.label}
                            className="relative overflow-hidden border-white/10 bg-white/5 text-white shadow-lg"
                        >
                            <div
                                className={`absolute inset-y-0 right-0 w-1/2 rounded-bl-[160px] bg-gradient-to-br ${stat.accent} opacity-40 blur-2xl`}
                            />
                            <CardHeader className="relative">
                                <div className="flex items-center justify-between">
                                    <CardDescription className="text-white/70">
                                        {stat.label}
                                    </CardDescription>
                                    <stat.icon className="h-5 w-5 text-white/70" />
                                </div>
                                <CardTitle className="text-3xl text-white">{stat.value}</CardTitle>
                                <p className="text-xs text-white/70">{stat.delta}</p>
                            </CardHeader>
                            <CardContent className="relative">
                                <div className="flex h-16 items-end gap-1">
                                    {stat.trend.map((point, index) => (
                                        <span
                                            key={`${stat.label}-${index}`}
                                            className="flex-1 rounded-t-full bg-white/55"
                                            style={{ height: `${point * 2}px` }}
                                        />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </section>

                <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                    <Card className="border-border/60 bg-background/95">
                        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle>Recent Users</CardTitle>
                                <CardDescription>
                                    Filter by status, plan, and country.
                                </CardDescription>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" className="gap-2">
                                    <Filter className="h-4 w-4" />
                                    Filters
                                </Button>
                                <Button variant="outline" size="sm" className="gap-2">
                                    <Download className="h-4 w-4" />
                                    Export CSV
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-5 gap-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                <span>ID</span>
                                <span>Name</span>
                                <span>Plan</span>
                                <span>Country</span>
                                <span className="text-right">Activity</span>
                            </div>
                            <Separator />
                            <div className="space-y-6">
                                {newUsers.map((user) => (
                                    <div key={user.id} className="grid grid-cols-5 items-center gap-3 text-sm">
                                        <span className="font-mono text-muted-foreground">{user.id}</span>
                                        <div className="min-w-0">
                                            <p className="font-medium text-foreground">{user.name}</p>
                                            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                                        </div>
                                        <Badge className="w-fit bg-muted text-xs font-semibold text-foreground">
                                            {user.plan}
                                        </Badge>
                                        <span className="text-muted-foreground">{user.country}</span>
                                        <span className="text-right text-muted-foreground">{user.lastActive}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-5">
                        <Card className="border-border/60 bg-background/95">
                            <CardHeader className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Moderation Queue</CardTitle>
                                    <CardDescription>{totalFlagged} high priority cases</CardDescription>
                                </div>
                                <Button size="sm" variant="outline" className="gap-2">
                                    <RefreshCw className="h-4 w-4" />
                                    Refresh
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {moderationQueue.map((item) => (
                                    <div key={item.id} className="rounded-2xl border border-border/50 p-4">
                                        <div className="flex items-center justify-between text-sm">
                                            <p className="font-semibold">{item.name}</p>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    item.severity === "high"
                                                        ? "border-red-500/40 text-red-500"
                                                        : "border-amber-500/40 text-amber-600"
                                                }
                                            >
                                                {item.issue}
                                            </Badge>
                                        </div>
                                        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                                            <span>ID: {item.id}</span>
                                            <span>Opened • {item.openedAt}</span>
                                        </div>
                                        <div className="mt-3 flex gap-2">
                                            <Button size="sm" className="gap-1">
                                                <ShieldCheck className="h-4 w-4" />
                                                Process now
                                            </Button>
                                            <Button size="sm" variant="ghost" className="gap-1">
                                                <MailOpen className="h-4 w-4" />
                                                Send warning
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <Card className="border-border/60 bg-background/95">
                            <CardHeader>
                                <CardTitle>Service Plan Allocation</CardTitle>
                                <CardDescription>Percentage chart by tenant</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="rounded-2xl border border-dashed border-border/70 p-5">
                                    <div className="flex h-6 w-full overflow-hidden rounded-full bg-muted/60">
                                        {usageSplit.map((split) => (
                                            <div
                                                key={split.label}
                                                className={`${split.color} text-xs font-semibold text-white/90`}
                                                style={{ width: `${split.value}%` }}
                                            />
                                        ))}
                                    </div>
                                    <div className="mt-4 space-y-3 text-sm">
                                        {usageSplit.map((split) => (
                                            <div key={split.label} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className={`h-2 w-2 rounded-full ${split.color}`} />
                                                    <span>{split.label}</span>
                                                </div>
                                                <span className="font-semibold">{split.value}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                    <span>Updated 5 mins ago</span>
                                    <Button variant="ghost" size="sm" className="gap-1">
                                        <ArrowUpRight className="h-4 w-4" />
                                        View details
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                <section className="grid gap-5 lg:grid-cols-2">
                    <Card className="border-border/60 bg-background/95">
                        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle>User Management</CardTitle>
                                <CardDescription>
                                    Tabs for main status actions.
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" className="gap-2">
                                    <UserPlus className="h-4 w-4" />
                                    Add User
                                </Button>
                                <Button variant="outline" size="sm" className="gap-2">
                                    <Download className="h-4 w-4" />
                                    Export Report
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="active">
                                <TabsList>
                                    <TabsTrigger value="active">Active</TabsTrigger>
                                    <TabsTrigger value="pending">Pending</TabsTrigger>
                                    <TabsTrigger value="flagged">Needs Review</TabsTrigger>
                                </TabsList>
                                <TabsContent value="active" className="mt-5 space-y-4">
                                    {newUsers.slice(0, 3).map((user) => (
                                        <div
                                            key={`active-${user.id}`}
                                            className="flex items-center justify-between rounded-2xl border border-border/60 p-4"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={`https://avatar.vercel.sh/${user.name}.svg`} />
                                                    <AvatarFallback>
                                                        {user.name
                                                            .split(" ")
                                                            .map((part) => part[0])
                                                            .join("")}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">{user.name}</p>
                                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs">
                                                <Badge variant="outline" className="border-emerald-400/40 text-emerald-500">
                                                    Online
                                                </Badge>
                                                <Button size="sm" variant="ghost" className="gap-1">
                                                    <MailOpen className="h-4 w-4" />
                                                    Message
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </TabsContent>
                                <TabsContent value="pending" className="mt-5 space-y-3">
                                    {Array.from({ length: 2 }).map((_, idx) => (
                                        <div key={`pending-${idx}`} className="rounded-2xl border border-dashed border-border/60 p-4">
                                            <p className="text-sm font-medium text-muted-foreground">
                                                #{203 + idx} • Pending application
                                            </p>
                                            <div className="mt-3 flex gap-2">
                                                <Button size="sm">Approve</Button>
                                                <Button size="sm" variant="ghost">
                                                    Reject
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </TabsContent>
                                <TabsContent value="flagged" className="mt-5 space-y-3">
                                    {moderationQueue.map((item) => (
                                        <div key={`flagged-${item.id}`} className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
                                            <p className="text-sm font-semibold">{item.name}</p>
                                            <p className="text-xs text-red-500">{item.issue}</p>
                                            <div className="mt-3 flex gap-2">
                                                <Button size="sm" className="gap-1">
                                                    <ShieldCheck className="h-4 w-4" />
                                                    Resolve
                                                </Button>
                                                <Button size="sm" variant="ghost">
                                                    Forward to Trust & Safety
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 bg-background/95">
                        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle>System Activity</CardTitle>
                                <CardDescription>Deployment logs & real-time traffic.</CardDescription>
                            </div>
                            <Input placeholder="Search..." className="h-9 max-w-xs" />
                        </CardHeader>
                        <CardContent className="space-y-5">
                            {activityTimeline.map((activity) => (
                                <div key={activity.label} className="relative rounded-2xl border border-border/60 p-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold">{activity.label}</p>
                                        <span className="text-xs text-muted-foreground">{activity.time}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{activity.owner}</p>
                                    <div className="mt-3 flex items-center gap-2 text-xs">
                                        <Badge variant="outline" className="border-brand/40 text-brand">
                                            {activity.status}
                                        </Badge>
                                        <span className="text-muted-foreground">Automated by ChatOps</span>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </section>
            </div>
        </div>
    );
}

