import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useReferrerAnalytics } from '@/hooks/useSiteVisits';
import { getSourceTypeName, getSourceTypeIcon, SourceType } from '@/lib/referrer-parser';
import { Link2, PieChart, Activity, Download, RefreshCw, ExternalLink, Eye, Users, TrendingUp } from 'lucide-react';
import { PieChart as RechartsePieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const TIME_PERIODS = [
  { value: '1', label: 'Today' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 12 months' },
];

const SOURCE_COLORS: Record<SourceType, string> = {
  search: '#22c55e',
  social: '#3b82f6',
  direct: '#a855f7',
  ads: '#f59e0b',
  external: '#6b7280',
  internal: '#14b8a6',
};

interface TopReferrer {
  referrer_domain: string;
  visit_count: number;
  unique_sessions: number;
  source_type: SourceType;
}

interface SourceDistribution {
  source_type: SourceType;
  visit_count: number;
  percentage: number;
}

interface ReferrerWatchStats {
  referrer_domain: string;
  visit_count: number;
  unique_sessions: number;
  avg_pages_per_session: number;
  watch_events: number;
}

interface LiveVisitor {
  session_id: string;
  referrer_domain: string | null;
  source_type: string;
  page_path: string;
  tmdb_id: number | null;
  media_type: string | null;
  visited_at: string;
}

export function ReferrerAnalytics() {
  const [days, setDays] = useState(30);
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([]);
  const [sourceDistribution, setSourceDistribution] = useState<SourceDistribution[]>([]);
  const [watchStats, setWatchStats] = useState<ReferrerWatchStats[]>([]);
  const [liveVisitors, setLiveVisitors] = useState<LiveVisitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('referrers');

  const {
    fetchTopReferrers,
    fetchSourceDistribution,
    fetchReferrerWatchStats,
    fetchLiveVisitors,
  } = useReferrerAnalytics(days);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [referrers, distribution, stats, live] = await Promise.all([
        fetchTopReferrers(100),
        fetchSourceDistribution(),
        fetchReferrerWatchStats(50),
        fetchLiveVisitors(),
      ]);
      
      setTopReferrers(referrers || []);
      setSourceDistribution(distribution || []);
      setWatchStats(stats || []);
      setLiveVisitors(live || []);
    } catch (error) {
      console.error('Failed to load referrer analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [days]);

  // Auto-refresh live visitors
  useEffect(() => {
    if (activeTab !== 'live') return;
    
    const interval = setInterval(async () => {
      try {
        const live = await fetchLiveVisitors();
        setLiveVisitors(live || []);
      } catch (error) {
        console.error('Failed to refresh live visitors:', error);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [activeTab, fetchLiveVisitors]);

  const exportData = () => {
    const csvContent = [
      ['Domain', 'Visits', 'Unique Sessions', 'Source Type'].join(','),
      ...topReferrers.map(r => 
        [r.referrer_domain, r.visit_count, r.unique_sessions, r.source_type].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `referrers-${days}days-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalVisits = topReferrers.reduce((sum, r) => sum + r.visit_count, 0);
  const totalSessions = topReferrers.reduce((sum, r) => sum + r.unique_sessions, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Referrer Analytics</h2>
          <p className="text-muted-foreground">Track where your visitors come from</p>
        </div>
        <div className="flex gap-2">
          <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_PERIODS.map(period => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={exportData}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Visits</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {isLoading ? <Skeleton className="h-8 w-20" /> : totalVisits.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Unique Sessions</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {isLoading ? <Skeleton className="h-8 w-20" /> : totalSessions.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Unique Domains</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {isLoading ? <Skeleton className="h-8 w-20" /> : topReferrers.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Live Visitors</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {isLoading ? <Skeleton className="h-8 w-20" /> : liveVisitors.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="referrers" className="gap-2">
            <Link2 className="w-4 h-4" />
            Referrers
          </TabsTrigger>
          <TabsTrigger value="sources" className="gap-2">
            <PieChart className="w-4 h-4" />
            Sources
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="live" className="gap-2">
            <Activity className="w-4 h-4" />
            Live
          </TabsTrigger>
        </TabsList>

        {/* Referrers Tab */}
        <TabsContent value="referrers" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Referring Domains</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(10)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Domain</TableHead>
                      <TableHead>Source Type</TableHead>
                      <TableHead className="text-right">Visits</TableHead>
                      <TableHead className="text-right">Sessions</TableHead>
                      <TableHead className="text-right">% of Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topReferrers.map((referrer, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {referrer.referrer_domain !== 'direct' && (
                              <ExternalLink className="w-4 h-4 text-muted-foreground" />
                            )}
                            {referrer.referrer_domain || 'direct'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            style={{ backgroundColor: SOURCE_COLORS[referrer.source_type] + '20' }}
                          >
                            {getSourceTypeIcon(referrer.source_type)} {getSourceTypeName(referrer.source_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{referrer.visit_count.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{referrer.unique_sessions.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          {totalVisits > 0 ? ((referrer.visit_count / totalVisits) * 100).toFixed(1) : 0}%
                        </TableCell>
                      </TableRow>
                    ))}
                    {topReferrers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No referrer data available for this period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sources Tab */}
        <TabsContent value="sources" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Source Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : sourceDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsePieChart>
                      <Pie
                        data={sourceDistribution}
                        dataKey="visit_count"
                        nameKey="source_type"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${getSourceTypeName(name as SourceType)} ${(percent * 100).toFixed(0)}%`}
                      >
                        {sourceDistribution.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={SOURCE_COLORS[entry.source_type] || '#6b7280'}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          value.toLocaleString(),
                          getSourceTypeName(name as SourceType),
                        ]}
                      />
                      <Legend
                        formatter={(value: string) => getSourceTypeName(value as SourceType)}
                      />
                    </RechartsePieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Source Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sourceDistribution.map((source) => (
                    <div key={source.source_type} className="flex items-center gap-4">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: SOURCE_COLORS[source.source_type] }}
                      />
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">
                            {getSourceTypeIcon(source.source_type)} {getSourceTypeName(source.source_type)}
                          </span>
                          <span className="text-muted-foreground">
                            {source.visit_count.toLocaleString()} ({source.percentage}%)
                          </span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${source.percentage}%`,
                              backgroundColor: SOURCE_COLORS[source.source_type],
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Content Performance by Referrer</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(10)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Domain</TableHead>
                      <TableHead className="text-right">Visits</TableHead>
                      <TableHead className="text-right">Sessions</TableHead>
                      <TableHead className="text-right">Pages/Session</TableHead>
                      <TableHead className="text-right">Watch Events</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {watchStats.map((stat, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{stat.referrer_domain}</TableCell>
                        <TableCell className="text-right">{stat.visit_count.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{stat.unique_sessions.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{stat.avg_pages_per_session}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={stat.watch_events > 0 ? 'default' : 'secondary'}>
                            {stat.watch_events.toLocaleString()}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {watchStats.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No performance data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Live Tab */}
        <TabsContent value="live" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  Live Visitors (Last 5 minutes)
                </CardTitle>
                <Badge variant="outline">{liveVisitors.length} active</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {liveVisitors.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No active visitors right now
                  </p>
                ) : (
                  liveVisitors.map((visitor, index) => (
                    <div
                      key={visitor.session_id + index}
                      className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">
                          {getSourceTypeIcon(visitor.source_type as SourceType)}
                        </span>
                        <div>
                          <p className="font-medium">
                            User from {visitor.referrer_domain || 'direct'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {visitor.page_path}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        {new Date(visitor.visited_at).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
