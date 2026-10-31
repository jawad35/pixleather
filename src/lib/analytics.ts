// lib/analytics.ts

import { supabase } from "@/integrations/supabase/client";

// Get location from IP using multiple free APIs (fallback)
async function getLocationFromIP(): Promise<{ country: string; city: string; region: string }> {
  try {
    // Try ipapi.co first
    const response = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.country_name) {
        return {
          country: data.country_name || 'Unknown',
          city: data.city || 'Unknown',
          region: data.region || 'Unknown'
        };
      }
    }
    
    // Fallback to ip-api.com
    const fallbackResponse = await fetch('http://ip-api.com/json/', {
      signal: AbortSignal.timeout(5000)
    });
    
    if (fallbackResponse.ok) {
      const data = await fallbackResponse.json();
      if (data.country) {
        return {
          country: data.country || 'Unknown',
          city: data.city || 'Unknown',
          region: data.regionName || 'Unknown'
        };
      }
    }
    
    return { country: 'Unknown', city: 'Unknown', region: 'Unknown' };
  } catch (error) {
    console.error('Error getting location:', error);
    return { country: 'Unknown', city: 'Unknown', region: 'Unknown' };
  }
}

// Generate or get device fingerprint (for unique visitor tracking)
function getDeviceId(): string {
  let deviceId = localStorage.getItem('analytics_device_id');
  if (!deviceId) {
    // Create a unique device fingerprint
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      screen.colorDepth,
      navigator.hardwareConcurrency || '',
      navigator.deviceMemory || ''
    ].join('|');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    deviceId = `device_${Math.abs(hash).toString(36)}`;
    localStorage.setItem('analytics_device_id', deviceId);
  }
  return deviceId;
}

// Generate a session ID (stored in sessionStorage)
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
}

// Get visitor type based on stored data
function getVisitorType(): 'new' | 'returning' {
  const lastVisit = localStorage.getItem('analytics_last_visit');
  const today = new Date().toDateString();
  
  if (!lastVisit) {
    localStorage.setItem('analytics_last_visit', today);
    return 'new';
  }
  
  if (lastVisit === today) {
    return 'returning';
  }
  
  localStorage.setItem('analytics_last_visit', today);
  return 'returning';
}

// Track a page visit
export async function trackPageVisit(pageUrl: string, userId?: string) {
  try {
    // Don't track in development
    if (import.meta.env.DEV) return;
    
    // Get location data
    const location = await getLocationFromIP();
    const sessionId = getSessionId();
    const deviceId = getDeviceId();
    const visitorType = getVisitorType();
    
    // Check if this device already visited today (for unique visitor count)
    const today = new Date().toISOString().split('T')[0];
    const { data: existingVisit } = await supabase
      .from('analytics_visits')
      .select('id')
      .eq('device_id', deviceId)
      .gte('visit_date', today)
      .limit(1);
    
    // Only insert if this is the first visit of the day for this device
    if (existingVisit && existingVisit.length > 0) {
      // This device already visited today, but still track page view
      // We'll handle this with a different approach
      console.log('Device already visited today');
    }
    
    // Insert the visit
    const { error } = await supabase
      .from('analytics_visits')
      .insert({
        page_url: pageUrl,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        country: location.country,
        city: location.city,
        region: location.region,
        session_id: sessionId,
        device_id: deviceId,
        user_id: userId || null,
        visitor_type: visitorType,
        is_unique_day: !(existingVisit && existingVisit.length > 0)
      });
    
    if (error) {
      console.error('Error tracking visit:', error);
    }
  } catch (error) {
    console.error('Error tracking visit:', error);
  }
}

// Get unique visitor count
export async function getUniqueVisitors(dateRange: 'today' | 'week' | 'month' | 'all' = 'week') {
  let query = supabase
    .from('analytics_visits')
    .select('device_id', { count: 'exact', head: false })
    .eq('is_unique_day', true);
  
  const now = new Date();
  if (dateRange === 'today') {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    query = query.gte('visit_date', today.toISOString());
  } else if (dateRange === 'week') {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    query = query.gte('visit_date', weekAgo.toISOString());
  } else if (dateRange === 'month') {
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    query = query.gte('visit_date', monthAgo.toISOString());
  }
  
  const { data, error } = await query;
  if (error) throw error;
  
  // Count unique devices
  const uniqueDevices = new Set(data?.map(d => d.device_id) || []);
  return uniqueDevices.size;
}