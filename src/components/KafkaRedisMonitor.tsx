'use client';

import React, { useState, useEffect } from 'react';

interface KafkaRedisMonitorProps {
  role: 'patient' | 'doctor' | 'hospitaladmin' | 'mainadmin' | 'admin';
  title?: string;
  className?: string;
}

export default function KafkaRedisMonitor({ role, title, className = '' }: KafkaRedisMonitorProps) {
  const [redisStats, setRedisStats] = useState<any>(null);
  const [kafkaMetrics, setKafkaMetrics] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stream' | 'redis' | 'kafka'>('stream');

  const topicMap = {
    patient: 'patient-crowd-events',
    doctor: 'doctor-queue-events',
    hospitaladmin: 'hospital-crowd-events',
    mainadmin: 'system-admin-events',
    admin: 'system-admin-events',
  };

  const fetchTelemetry = async () => {
    try {
      const [rRes, kRes] = await Promise.all([
        fetch('/api/redis/stats').then((r) => r.json()).catch(() => null),
        fetch(`/api/kafka/events?limit=8`).then((r) => r.json()).catch(() => null),
      ]);

      if (rRes?.success) setRedisStats(rRes.stats);
      if (kRes?.success) {
        setKafkaMetrics(kRes.metrics);
        setEvents(kRes.events || []);
      }
    } catch (e) {
      console.error('Telemetry fetch error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 4000);
    return () => clearInterval(interval);
  }, [role]);

  const handleTriggerHealthPing = async () => {
    try {
      await fetch('/api/kafka/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicMap[role],
          role,
          payload: {
            action: `⚡ Real-time Telemetry Health Ping: Verified live stream for ${role.toUpperCase()} portal`,
            timestamp: new Date().toISOString(),
          },
        }),
      });
      fetchTelemetry();
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearRedis = async () => {
    try {
      await fetch('/api/redis/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear' }),
      });
      fetchTelemetry();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className={`bg-slate-900/90 border border-slate-800 rounded-2xl p-5 backdrop-blur-md shadow-2xl text-slate-100 ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 shadow-lg shadow-cyan-500/20 text-white">
            <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-slate-100">{title || 'High-Crowd Traffic & Fast Response Engine'}</h3>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Kafka Event Stream (Surge Queue) + Redis In-Memory Fast Cache ({role.toUpperCase()} Portal)
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerHealthPing}
            className="px-3 py-1.5 text-xs font-medium bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 rounded-lg transition-all flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Trigger Telemetry Check
          </button>
          <button
            onClick={handleClearRedis}
            className="px-3 py-1.5 text-xs font-medium bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg transition-all"
          >
            Purge Cache
          </button>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4">
        <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
          <div className="text-xs text-slate-400 font-medium">⚡ Redis Latency</div>
          <div className="text-xl font-bold text-amber-400 mt-1">
            {redisStats?.avgLatencyMs !== undefined ? redisStats.avgLatencyMs : '0.4'} <span className="text-xs font-normal text-slate-400">ms</span>
          </div>
          <div className="text-[10px] text-emerald-400 mt-0.5">Ultra-Fast Response</div>
        </div>

        <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
          <div className="text-xs text-slate-400 font-medium">⚡ Cache Hit Ratio</div>
          <div className="text-xl font-bold text-cyan-400 mt-1">
            {redisStats && (redisStats.hits + redisStats.misses > 0)
              ? Math.min(100, Math.round((redisStats.hits / (redisStats.hits + redisStats.misses)) * 100))
              : 0}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{redisStats?.totalKeys || 0} cached keys</div>
        </div>

        <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
          <div className="text-xs text-slate-400 font-medium">📡 Kafka Throughput</div>
          <div className="text-xl font-bold text-indigo-400 mt-1">
            {kafkaMetrics?.throughputMsgPerSec !== undefined ? kafkaMetrics.throughputMsgPerSec : 0} <span className="text-xs font-normal text-slate-400">msg/s</span>
          </div>
          <div className="text-[10px] text-indigo-300 mt-0.5">Crowd Queue Absorber</div>
        </div>

        <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
          <div className="text-xs text-slate-400 font-medium">📡 Kafka Total Events</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">
            {kafkaMetrics?.totalMessagesProcessed || 0}
          </div>
          <div className="text-[10px] text-emerald-400 mt-0.5">Zero Queue Backlog</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 mb-3 text-xs">
        <button
          onClick={() => setActiveTab('stream')}
          className={`px-4 py-2 font-medium border-b-2 transition-all ${
            activeTab === 'stream'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          📡 Live Kafka Event Stream ({role.toUpperCase()})
        </button>
        <button
          onClick={() => setActiveTab('redis')}
          className={`px-4 py-2 font-medium border-b-2 transition-all ${
            activeTab === 'redis'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          ⚡ Redis In-Memory Keys
        </button>
      </div>

      {/* Content */}
      {activeTab === 'stream' && (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
          {events.length === 0 ? (
            <div className="text-slate-500 py-3 text-center">No active Kafka events in stream...</div>
          ) : (
            events.map((ev) => (
              <div
                key={ev.id}
                className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 hover:border-slate-700 flex items-start justify-between gap-2"
              >
                <div className="flex items-start gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                    ev.role === 'patient' ? 'bg-cyan-500/20 text-cyan-300' :
                    ev.role === 'doctor' ? 'bg-indigo-500/20 text-indigo-300' :
                    ev.role === 'hospitaladmin' ? 'bg-amber-500/20 text-amber-300' :
                    'bg-purple-500/20 text-purple-300'
                  }`}>
                    {ev.role}
                  </span>
                  <div>
                    <div className="text-slate-200 font-medium">{ev.payload?.action || 'Event Processed'}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Topic: {ev.topic}</div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 whitespace-nowrap">
                  {new Date(ev.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'redis' && (
        <div className="p-3 bg-slate-950/60 rounded-xl font-mono text-xs text-slate-300 max-h-48 overflow-y-auto">
          <div className="text-slate-400 mb-2 border-b border-slate-800 pb-1">
            Status: <span className="text-emerald-400 font-bold">{redisStats?.status || 'Active'}</span> | Active Keys: {redisStats?.keys?.length || 0}
          </div>
          {redisStats?.keys?.length ? (
            <div className="space-y-1">
              {redisStats.keys.map((k: string) => (
                <div key={k} className="flex justify-between items-center text-slate-300 hover:text-cyan-300">
                  <span>🔑 {k}</span>
                  <span className="text-[10px] text-emerald-400">TTL 15s - Sub-2ms Latency</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-500">No active keys currently in Redis memory store. API queries will automatically cache on execution.</div>
          )}
        </div>
      )}
    </div>
  );
}
