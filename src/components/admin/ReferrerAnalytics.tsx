import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useReferrerAnalytics, useRealtimeSiteStats } from '@/hooks/useSiteVisits';
import { getSourceTypeName, getSourceTypeIcon, SourceType } from '@/lib/referrer-parser';
import { Link2, PieChart, Activity, Download, RefreshCw, ExternalLink, Eye, Users, TrendingUp, Globe, Radio, MapPin, Clock } from 'lucide-react';
import { PieChart as RechartsePieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

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

const GEO_COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#14b8a6', '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16'];

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

interface GeoDistribution {
  country: string;
  visit_count: number;
  unique_sessions: number;
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
  country: string | null;
}

// Country flag emoji helper
function getCountryFlag(country: string): string {
  const flags: Record<string, string> = {
    'United States': '🇺🇸',
    'United Kingdom': '🇬🇧',
    'Germany': '🇩🇪',
    'France': '🇫🇷',
    'Canada': '🇨🇦',
    'Australia': '🇦🇺',
    'India': '🇮🇳',
    'Brazil': '🇧🇷',
    'Japan': '🇯🇵',
    'South Korea': '🇰🇷',
    'Mexico': '🇲🇽',
    'Spain': '🇪🇸',
    'Italy': '🇮🇹',
    'Netherlands': '🇳🇱',
    'Poland': '🇵🇱',
    'Russia': '🇷🇺',
    'China': '🇨🇳',
    'Indonesia': '🇮🇩',
    'Philippines': '🇵🇭',
    'Turkey': '🇹🇷',
    'Croatia': '🇭🇷',
    'Serbia': '🇷🇸',
    'Bosnia and Herzegovina': '🇧🇦',
    'Slovenia': '🇸🇮',
    'Unknown': '🌍',
  };
  return flags[country] || '🌍';
}

export function ReferrerAnalytics() {
  const [days, setDays] = useState(30);
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([]);
  const [sourceDistribution, setSourceDistribution] = useState<SourceDistribution[]>([]);
  const [geoDistribution, setGeoDistribution] = useState<GeoDistribution[]>([]);
  const [watchStats, setWatchStats] = useState<ReferrerWatchStats[]>([]);
  const [liveVisitors, setLiveVisitors] = useState<LiveVisitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('realtime');

  const { stats: realtimeStats, isLoading: realtimeLoading } = useRealtimeSiteStats(15000);

  const {
    fetchTopReferrers,
    fetchSourceDistribution,
    fetchGeoDistribution,
    fetchReferrerWatchStats,
    fetchLiveVisitors,
  } = useReferrerAnalytics(days);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [referrers, distribution, geo, stats, live] = await Promise.all([
        fetchTopReferrers(100),
        fetchSourceDistribution(),
        fetchGeoDistribution(),
        fetchReferrerWatchStats(50),
        fetchLiveVisitors(),
      ]);
      
      setTopReferrers(referrers || []);
      setSourceDistribution(distribution || []);
      setGeoDistribution(geo || []);
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
    if (activeTab !== 'live' && activeTab !== 'realtime') return;
    
    const interval = setInterval(async () => {
      try {
        const live = await fetchLiveVisitors();
        setLiveVisitors(live || []);
      } catch (error) {
        console.error('Failed to refresh live visitors:', error);
      }
    }, 15000);

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
          <h2 className="text-2xl font-bold">Traffic Analytics</h2>
          <p className="text-muted-foreground">Real-time visitors, geo data & referrer tracking</p>
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

      {/* Real-time Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-green-500 animate-pulse" />
              <span className="text-sm text-muted-foreground">Active Now</span>
            </div>
            <p className="text-3xl font-bold mt-2 text-green-500">
              {realtimeLoading ? <Skeleton className="h-9 w-16" /> : realtimeStats?.active_visitors || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Last Hour</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {realtimeLoading ? <Skeleton className="h-8 w-16" /> : realtimeStats?.visitors_last_hour || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Today</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {realtimeLoading ? <Skeleton className="h-8 w-16" /> : realtimeStats?.visitors_today || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Countries (Last Hour)</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {realtimeLoading ? <Skeleton className="h-8 w-16" /> : realtimeStats?.top_countries?.length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="realtime" className="gap-2">
            <Radio className="w-4 h-4" />
            <span className="hidden sm:inline">Realtime</span>
          </TabsTrigger>
          <TabsTrigger value="geo" className="gap-2">
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">Geography</span>
          </TabsTrigger>
          <TabsTrigger value="referrers" className="gap-2">
            <Link2 className="w-4 h-4" />
            <span className="hidden sm:inline">Referrers</span>
          </TabsTrigger>
          <TabsTrigger value="sources" className="gap-2">
            <PieChart className="w-4 h-4" />
            <span className="hidden sm:inline">Sources</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Performance</span>
          </TabsTrigger>
        </TabsList>

        {/* Realtime Tab */}
        <TabsContent value="realtime" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Live Visitors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Radio className="w-5 h-5 text-green-500 animate-pulse" />
                  Live Visitors
                  <Badge variant="secondary" className="ml-2">{liveVisitors.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : liveVisitors.length > 0 ? (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {liveVisitors.map((visitor, index) => (
                      <div
                        key={visitor.session_id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border"
                      >
                        <div className="flex-shrink-0 text-2xl">
                          {getCountryFlag(visitor.country || 'Unknown')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate text-sm">
                              {visitor.page_path}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {visitor.country && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {visitor.country}
                              </span>
                            )}
                            {visitor.referrer_domain && (
                              <span>from {visitor.referrer_domain}</span>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {getSourceTypeIcon(visitor.source_type as SourceType)} {visitor.source_type}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(visitor.visited_at).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No active visitors right now
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Pages & Countries in Real-time */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Pages (Last Hour)</CardTitle>
                </CardHeader>
                <CardContent>
                  {realtimeLoading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-8 w-full" />
                      ))}
                    </div>
                  ) : realtimeStats?.top_pages && realtimeStats.top_pages.length > 0 ? (
                    <div className="space-y-2">
                      {realtimeStats.top_pages.slice(0, 8).map((page, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                          <span className="truncate text-sm max-w-[200px]">{page.path}</span>
                          <Badge variant="secondary">{page.count}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-4">No data</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Countries (Last Hour)</CardTitle>
                </CardHeader>
                <CardContent>
                  {realtimeLoading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-8 w-full" />
                      ))}
                    </div>
                  ) : realtimeStats?.top_countries && realtimeStats.top_countries.length > 0 ? (
                    <div className="space-y-2">
                      {realtimeStats.top_countries.slice(0, 8).map((c, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                          <span className="flex items-center gap-2">
                            <span className="text-lg">{getCountryFlag(c.country)}</span>
                            <span className="text-sm">{c.country}</span>
                          </span>
                          <Badge variant="secondary">{c.count}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-4">No data</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Geography Tab */}
        <TabsContent value="geo" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Visitors by Country</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : geoDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={geoDistribution.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="country" width={100} tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value: number) => [value.toLocaleString(), 'Visits']}
                      />
                      <Bar dataKey="visit_count" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                        {geoDistribution.slice(0, 10).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={GEO_COLORS[index % GEO_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No geo data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>All Countries</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(10)].map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Country</TableHead>
                          <TableHead className="text-right">Visits</TableHead>
                          <TableHead className="text-right">Sessions</TableHead>
                          <TableHead className="text-right">%</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {geoDistribution.map((geo, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <span className="flex items-center gap-2">
                                <span className="text-lg">{getCountryFlag(geo.country)}</span>
                                <span>{geo.country}</span>
                              </span>
                            </TableCell>
                            <TableCell className="text-right">{geo.visit_count.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{geo.unique_sessions.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{geo.percentage}%</TableCell>
                          </TableRow>
                        ))}
                        {geoDistribution.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              No geo data available
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

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
                        className="w-4 h-4 rounded-full flex-shrink-0"
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
      </Tabs>
    </div>
  );
}