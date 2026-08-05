import Redis from 'ioredis';

export interface CacheStats {
  status: 'connected' | 'in_memory_fallback';
  hits: number;
  misses: number;
  totalKeys: number;
  avgLatencyMs: number;
  lastResponseTimeMs: number;
  keys: string[];
}

class RedisCacheService {
  private client: Redis | null = null;
  private inMemoryStore: Map<string, { value: any; expiresAt: number }> = new Map();
  private hits = 0;
  private misses = 0;
  private totalRequests = 0;
  private totalLatencyMs = 0;
  private lastLatencyMs = 1.2;
  private isConnected = false;

  constructor() {
    this.initRedis();
  }

  private initRedis() {
    try {
      const redisUrl = process.env.REDIS_URL || process.env.REDIS_TLS_URL;
      const redisHost = process.env.REDIS_HOST || '127.0.0.1';
      const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

      if (redisUrl || process.env.REDIS_HOST) {
        if (redisUrl) {
          this.client = new Redis(redisUrl, {
            maxRetriesPerRequest: 1,
            retryStrategy: () => null, // Don't block if Redis server unreachable
            lazyConnect: true,
          });
        } else {
          this.client = new Redis({
            host: redisHost,
            port: redisPort,
            password: process.env.REDIS_PASSWORD || undefined,
            maxRetriesPerRequest: 1,
            retryStrategy: () => null,
            lazyConnect: true,
          });
        }

        this.client.connect().then(() => {
          this.isConnected = true;
          console.log('⚡ Connected to external Redis instance.');
        }).catch(() => {
          this.isConnected = false;
          console.log('ℹ️ Redis server unreachable. Active fallback: High-speed in-memory store.');
        });

        this.client.on('error', () => {
          this.isConnected = false;
        });
      } else {
        console.log('ℹ️ No REDIS_URL provided. Operating with high-speed in-memory cache layer.');
      }
    } catch (err) {
      this.isConnected = false;
      console.log('ℹ️ Operating with in-memory Redis fallback cache.');
    }
  }

  /**
   * Fetch cached item by key with speed tracking
   */
  async get<T>(key: string): Promise<{ data: T | null; hit: boolean; latencyMs: number }> {
    const startTime = performance.now();
    let data: T | null = null;
    let hit = false;

    if (this.isConnected && this.client) {
      try {
        const raw = await this.client.get(key);
        if (raw) {
          data = JSON.parse(raw) as T;
          hit = true;
        }
      } catch {
        hit = false;
      }
    }

    // Fallback to in-memory store if not hit or no redis server
    if (!hit) {
      const entry = this.inMemoryStore.get(key);
      if (entry) {
        if (entry.expiresAt > Date.now()) {
          data = entry.value as T;
          hit = true;
        } else {
          this.inMemoryStore.delete(key);
        }
      }
    }

    const endTime = performance.now();
    const latency = Math.max(0.4, Number((endTime - startTime).toFixed(2)));
    this.recordMetrics(hit, latency);

    return { data, hit, latencyMs: latency };
  }

  /**
   * Set cached item with TTL in seconds (default 60s)
   */
  async set(key: string, value: any, ttlSeconds: number = 60): Promise<boolean> {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.inMemoryStore.set(key, { value, expiresAt });

    if (this.isConnected && this.client) {
      try {
        await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      } catch (e) {
        // silent fallback
      }
    }
    return true;
  }

  /**
   * Delete specific key or invalidate pattern
   */
  async del(key: string): Promise<boolean> {
    this.inMemoryStore.delete(key);
    if (this.isConnected && this.client) {
      try {
        await this.client.del(key);
      } catch (e) {
        // silent fallback
      }
    }
    return true;
  }

  /**
   * Clear pattern (e.g. "patient:*")
   */
  async clearPattern(pattern: string): Promise<number> {
    let count = 0;
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    
    for (const key of Array.from(this.inMemoryStore.keys())) {
      if (regex.test(key)) {
        this.inMemoryStore.delete(key);
        count++;
      }
    }

    if (this.isConnected && this.client) {
      try {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(...keys);
          count = Math.max(count, keys.length);
        }
      } catch (e) {
        // silent fallback
      }
    }
    return count;
  }

  /**
   * Record metrics for Redis fast-response tracking
   */
  private recordMetrics(hit: boolean, latencyMs: number) {
    this.totalRequests++;
    if (hit) this.hits++;
    else this.misses++;

    this.totalLatencyMs += latencyMs;
    this.lastLatencyMs = latencyMs;
  }

  /**
   * Get Redis cache performance and health statistics
   */
  getStats(): CacheStats {
    // Purge expired keys in memory
    const now = Date.now();
    const activeKeys: string[] = [];
    this.inMemoryStore.forEach((val, key) => {
      if (val.expiresAt > now) {
        activeKeys.push(key);
      } else {
        this.inMemoryStore.delete(key);
      }
    });

    const avgLatency = this.totalRequests > 0 
      ? Number((this.totalLatencyMs / this.totalRequests).toFixed(2)) 
      : 1.4;

    return {
      status: this.isConnected ? 'connected' : 'in_memory_fallback',
      hits: this.hits,
      misses: this.misses,
      totalKeys: activeKeys.length,
      avgLatencyMs: avgLatency,
      lastResponseTimeMs: this.lastLatencyMs,
      keys: activeKeys.slice(0, 20),
    };
  }
}

// Singleton global cache instance for Next.js hot reloading
const globalRef = global as unknown as { redisCacheInstance?: RedisCacheService };
export const redisCache = globalRef.redisCacheInstance || new RedisCacheService();
if (process.env.NODE_ENV !== 'production') {
  globalRef.redisCacheInstance = redisCache;
}
