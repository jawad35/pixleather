// components/admin/AnalyticsDashboard.tsx

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Users, MapPin, Calendar, Globe, Clock, UserCheck } from "lucide-react";

type DateRange = "today" | "week" | "month" | "all";

export function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState<DateRange>("week");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["analytics", dateRange],
    queryFn: async () => {
      let query = supabase.from("analytics_visits").select("*");
      
      // Filter by date range
      const now = new Date();
      if (dateRange === "today") {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        query = query.gte("visit_date", today.toISOString());
      } else if (dateRange === "week") {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte("visit_date", weekAgo.toISOString());
      } else if (dateRange === "month") {
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte("visit_date", monthAgo.toISOString());
      }
      
      const { data, error } = await query.order("visit_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate stats
  const totalVisits = data?.length || 0;
  
  // Unique visitors (by device_id)
  const uniqueDevices = new Set(data?.map(d => d.device_id) || []);
  const uniqueVisitors = uniqueDevices.size;
  
  // Unique visitors today
  const today = new Date().toDateString();
  const todayUnique = new Set(
    data?.filter(d => new Date(d.visit_date).toDateString() === today)
      .map(d => d.device_id) || []
  ).size;
  
  // Countries breakdown (filter out Unknown)
  const countries: Record<string, number> = {};
  data?.forEach(d => {
    if (d.country && d.country !== 'Unknown') {
      countries[d.country] = (countries[d.country] || 0) + 1;
    }
  });
  const sortedCountries = Object.entries(countries).sort((a, b) => b[1] - a[1]);
  
  // Cities breakdown
  const cities: Record<string, number> = {};
  data?.forEach(d => {
    if (d.city && d.city !== 'Unknown') {
      const key = `${d.city}, ${d.country || ''}`;
      cities[key] = (cities[key] || 0) + 1;
    }
  });
  const sortedCities = Object.entries(cities).sort((a, b) => b[1] - a[1]);
  
  // Daily visits
  const dailyVisits: Record<string, number> = {};
  data?.forEach(d => {
    const date = new Date(d.visit_date).toLocaleDateString();
    dailyVisits[date] = (dailyVisits[date] || 0) + 1;
  });
  const sortedDays = Object.entries(dailyVisits).sort((a, b) => 
    new Date(a[0]).getTime() - new Date(b[0]).getTime()
  );

  // Recent visits (only show valid country data)
  const recentVisits = data?.filter(d => d.country && d.country !== 'Unknown').slice(0, 10) || [];

  // Visitor types
  const newVisitors = data?.filter(d => d.visitor_type === 'new').length || 0;
  const returningVisitors = data?.filter(d => d.visitor_type === 'returning').length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-xl font-semibold">Analytics Dashboard</h2>
        <div className="flex gap-2 flex-wrap">
          {(["today", "week", "month", "all"] as DateRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                dateRange === range
                  ? "bg-primary text-primary-foreground"
                  : "border border-border hover:bg-secondary"
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 rounded-full text-sm border border-border hover:bg-secondary transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <BarChart3 className="text-primary" size={22} />
            <span className="text-xs text-muted-foreground">Total</span>
          </div>
          <p className="mt-3 text-3xl font-semibold">{totalVisits}</p>
          <p className="text-sm text-muted-foreground">Total Page Views</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <Users className="text-primary" size={22} />
            <span className="text-xs text-muted-foreground">Unique</span>
          </div>
          <p className="mt-3 text-3xl font-semibold">{uniqueVisitors}</p>
          <p className="text-sm text-muted-foreground">Unique Visitors (All Time)</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <UserCheck className="text-primary" size={22} />
            <span className="text-xs text-muted-foreground">Today</span>
          </div>
          <p className="mt-3 text-3xl font-semibold">{todayUnique}</p>
          <p className="text-sm text-muted-foreground">Unique Visitors Today</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <Globe className="text-primary" size={22} />
            <span className="text-xs text-muted-foreground">Countries</span>
          </div>
          <p className="mt-3 text-3xl font-semibold">{sortedCountries.length}</p>
          <p className="text-sm text-muted-foreground">Countries Reached</p>
        </div>
      </div>

      {/* Visitor Type Breakdown */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h3 className="font-display text-lg font-semibold mb-4">Visitor Types</h3>
          <div className="flex gap-8">
            <div>
              <p className="text-sm text-muted-foreground">New Visitors</p>
              <p className="text-2xl font-semibold">{newVisitors}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Returning</p>
              <p className="text-2xl font-semibold">{returningVisitors}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Visits Chart */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h3 className="font-display text-lg font-semibold mb-4">Daily Visits</h3>
        {sortedDays.length > 0 ? (
          <div className="flex items-end gap-1 h-48">
            {sortedDays.slice(-14).map(([date, count]) => {
              const maxCount = Math.max(...sortedDays.map(([, c]) => c), 1);
              const height = (count / maxCount) * 100;
              const isToday = date === new Date().toLocaleDateString();
              return (
                <div key={date} className="flex-1 flex flex-col items-center">
                  <div 
                    className={`w-full rounded-t transition-all ${
                      isToday ? "bg-primary" : "bg-primary/40"
                    }`}
                    style={{ height: `${Math.max(height, 2)}%`, minHeight: '4px' }}
                  />
                  <span className="text-[10px] text-muted-foreground mt-1">
                    {date.split('/').slice(0, 2).join('/')}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">No data available</p>
        )}
      </div>

      {/* Countries and Cities Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin size={18} className="text-primary" /> Top Countries
          </h3>
          {sortedCountries.length > 0 ? (
            <div className="space-y-3">
              {sortedCountries.slice(0, 10).map(([country, count]) => {
                const percentage = ((count / totalVisits) * 100).toFixed(1);
                return (
                  <div key={country} className="flex items-center gap-3">
                    <span className="text-sm w-28 truncate">{country}</span>
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-14 text-right">
                      {count} ({percentage}%)
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No country data yet. Visitors will show up here.</p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock size={18} className="text-primary" /> Recent Visits
          </h3>
          {recentVisits.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
              {recentVisits.map((visit: any) => (
                <div key={visit.id} className="flex items-center justify-between text-sm border-b border-border pb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {visit.country || 'Unknown'}
                      </span>
                      {visit.city && visit.city !== 'Unknown' && (
                        <span className="text-xs text-muted-foreground">
                          {visit.city}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {visit.page_url}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                    {new Date(visit.visit_date).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No visits with location data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}