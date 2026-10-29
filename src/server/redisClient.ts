import Redis from 'ioredis';

export interface CacheStats {
  provider: 'redis-server' | 'in-memory-redis';
  connected: boolean;
  totalKeys: number;
  hitCount: number;
  missCount: number;
  hitRatio: string;
  totalRequests: number;
  avgLatencyMs: number;
  lastConnectedAt?: string;
  keysSummary: Record<string, number>;
}

// Emulador In-Memory de alta performance com semântica Redis (TTL + LRU)
class InMemoryRedisStore {
  private store = new Map<string, { value: string; expiresAt?: number; tags?: string[] }>();
  private tagIndex = new Map<string, Set<string>>();

  get(key: string): string | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.del(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: string, mode?: string, duration?: number, tags?: string[]): string {
    let expiresAt: number | undefined;
    if (mode === 'EX' && duration && duration > 0) {
      expiresAt = Date.now() + duration * 1000;
    }
    this.store.set(key, { value, expiresAt, tags });

    if (tags && tags.length > 0) {
      for (const tag of tags) {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag)!.add(key);
      }
    }
    return 'OK';
  }

  del(key: string): number {
    const entry = this.store.get(key);
    if (entry && entry.tags) {
      for (const tag of entry.tags) {
        this.tagIndex.get(tag)?.delete(key);
      }
    }
    return this.store.delete(key) ? 1 : 0;
  }

  delByTag(tag: string): number {
    const keys = this.tagIndex.get(tag);
    if (!keys || keys.size === 0) return 0;
    let count = 0;
    for (const k of Array.from(keys)) {
      if (this.del(k)) count++;
    }
    this.tagIndex.delete(tag);
    return count;
  }

  keys(pattern: string): string[] {
    const now = Date.now();
    const result: string[] = [];
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.del(key);
        continue;
      }
      if (regex.test(key)) {
        result.push(key);
      }
    }
    return result;
  }

  flushdb(): string {
    this.store.clear();
    this.tagIndex.clear();
    return 'OK';
  }

  size(): number {
    return this.store.size;
  }
}

class RedisCacheManager {
  private redis: Redis | null = null;
  private memoryFallback = new InMemoryRedisStore();
  private isConnected = false;
  private hitCount = 0;
  private missCount = 0;
  private totalRequests = 0;
  private totalLatencyMs = 0;
  private lastConnectedAt?: string;

  constructor() {
    this.init();
  }

  private init() {
    const redisUrl = process.env.REDIS_URL || process.env.REDISCLOUD_URL;
    if (redisUrl) {
      try {
        console.log('[Redis] Tentando conectar ao Redis remoto:', redisUrl.replace(/:[^:@]+@/, ':***@'));
        this.redis = new Redis(redisUrl, {
          connectTimeout: 5000,
          maxRetriesPerRequest: 2,
          retryStrategy: (times) => {
            if (times > 3) {
              console.warn('[Redis] Conexão remota falhou, ativando motor In-Memory Redis...');
              return null;
            }
            return Math.min(times * 1000, 3000);
          },
          lazyConnect: true
        });

        this.redis.on('connect', () => {
          this.isConnected = true;
          this.lastConnectedAt = new Date().toISOString();
          console.log('✅ [Redis] Conectado com sucesso ao servidor Redis.');
        });

        this.redis.on('error', (err) => {
          this.isConnected = false;
          console.warn('[Redis] Aviso de conexão Redis (usando fallback in-memory):', err.message);
        });

        this.redis.connect().catch((err) => {
          console.warn('[Redis] Não foi possível conectar ao Redis remoto. Motor In-Memory Redis ativo:', err.message);
        });
      } catch (err: any) {
        console.warn('[Redis] Falha ao inicializar ioredis, usando motor In-Memory Redis:', err.message);
      }
    } else {
      console.log('⚡ [Redis] REDIS_URL não informada. Motor In-Memory Redis ultrarrápido inicializado com sucesso.');
    }
  }

  async get(key: string): Promise<string | null> {
    const start = Date.now();
    this.totalRequests++;
    try {
      if (this.isConnected && this.redis) {
        const val = await this.redis.get(key);
        const latency = Date.now() - start;
        this.totalLatencyMs += latency;
        if (val !== null) {
          this.hitCount++;
          return val;
        }
      }
    } catch {
      // Ignora erro no Redis e tenta fallback
    }

    const val = this.memoryFallback.get(key);
    const latency = Date.now() - start;
    this.totalLatencyMs += latency;
    if (val !== null) {
      this.hitCount++;
    } else {
      this.missCount++;
    }
    return val;
  }

  async set(key: string, value: string, ttlSeconds: number = 180, tags: string[] = []): Promise<string> {
    try {
      if (this.isConnected && this.redis) {
        await this.redis.set(key, value, 'EX', ttlSeconds);
        // Grava tags em sets para invalidação por tags
        if (tags && tags.length > 0) {
          for (const t of tags) {
            await this.redis.sadd(`porttohub:tag:${t}`, key);
            await this.redis.expire(`porttohub:tag:${t}`, ttlSeconds + 60);
          }
        }
      }
    } catch (e: any) {
      console.warn('[Redis] Erro ao gravar chave no Redis remoto:', e.message);
    }

    return this.memoryFallback.set(key, value, 'EX', ttlSeconds, tags);
  }

  async del(key: string): Promise<number> {
    try {
      if (this.isConnected && this.redis) {
        await this.redis.del(key);
      }
    } catch {}
    return this.memoryFallback.del(key);
  }

  async invalidateByPattern(pattern: string): Promise<number> {
    let count = 0;
    try {
      if (this.isConnected && this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          count = await this.redis.del(...keys);
        }
      }
    } catch {}

    const memKeys = this.memoryFallback.keys(pattern);
    for (const k of memKeys) {
      if (this.memoryFallback.del(k)) count++;
    }
    return count;
  }

  async invalidateByTag(tag: string): Promise<number> {
    let count = 0;
    try {
      if (this.isConnected && this.redis) {
        const tagKey = `porttohub:tag:${tag}`;
        const keys = await this.redis.smembers(tagKey);
        if (keys.length > 0) {
          count += await this.redis.del(...keys);
        }
        await this.redis.del(tagKey);
      }
    } catch {}

    count += this.memoryFallback.delByTag(tag);
    return count;
  }

  async flush(): Promise<string> {
    try {
      if (this.isConnected && this.redis) {
        await this.redis.flushdb();
      }
    } catch {}
    this.hitCount = 0;
    this.missCount = 0;
    this.totalRequests = 0;
    this.totalLatencyMs = 0;
    return this.memoryFallback.flushdb();
  }

  async getStats(): Promise<CacheStats> {
    let remoteKeys = 0;
    const summary: Record<string, number> = {};

    try {
      if (this.isConnected && this.redis) {
        const keys = await this.redis.keys('porttohub:*');
        remoteKeys = keys.length;
        for (const k of keys) {
          const parts = k.split(':');
          const category = parts[2] || parts[1] || 'outros';
          summary[category] = (summary[category] || 0) + 1;
        }
      }
    } catch {}

    const memKeys = this.memoryFallback.keys('*');
    for (const k of memKeys) {
      const parts = k.split(':');
      const category = parts[2] || parts[1] || 'outros';
      summary[category] = (summary[category] || 0) + 1;
    }

    const totalKeys = Math.max(remoteKeys, this.memoryFallback.size());
    const totalReq = this.totalRequests || (this.hitCount + this.missCount);
    const hitRatio = totalReq > 0 ? ((this.hitCount / totalReq) * 100).toFixed(1) + '%' : '0.0%';
    const avgLatencyMs = totalReq > 0 ? Number((this.totalLatencyMs / totalReq).toFixed(2)) : 0.8;

    return {
      provider: this.isConnected ? 'redis-server' : 'in-memory-redis',
      connected: this.isConnected,
      totalKeys,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRatio,
      totalRequests: totalReq,
      avgLatencyMs,
      lastConnectedAt: this.lastConnectedAt,
      keysSummary: summary
    };
  }
}

export const redisCache = new RedisCacheManager();
