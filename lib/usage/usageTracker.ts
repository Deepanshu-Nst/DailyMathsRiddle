import { promises as fs } from 'fs';
import path from 'path';

export const MAX_EXTRA_RIDDLES_PER_DAY = 10;
export const COOLDOWN_SECONDS = 8;

interface UsageData {
  count: number;
  lastGeneratedAt: number; // timestamp
  locked: boolean;
}

class JsonUsageTracker {
  private getDbPath() {
    return path.join(process.cwd(), 'data', 'usage.json');
  }

  private async readDb(): Promise<Record<string, UsageData>> {
    try {
      const data = await fs.readFile(this.getDbPath(), 'utf-8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  private async writeDb(data: Record<string, UsageData>) {
    await fs.mkdir(path.dirname(this.getDbPath()), { recursive: true });
    await fs.writeFile(this.getDbPath(), JSON.stringify(data, null, 2));
  }

  private getKey(sessionId: string, date: string) {
    return `${sessionId}_${date}`;
  }

  async getUsage(sessionId: string, date: string): Promise<UsageData> {
    const db = await this.readDb();
    const key = this.getKey(sessionId, date);
    return db[key] || { count: 0, lastGeneratedAt: 0, locked: false };
  }

  async checkAndLock(sessionId: string, date: string): Promise<{ allowed: boolean; reason?: string }> {
    const db = await this.readDb();
    const key = this.getKey(sessionId, date);
    const usage = db[key] || { count: 0, lastGeneratedAt: 0, locked: false };

    if (usage.count >= MAX_EXTRA_RIDDLES_PER_DAY) {
      return { allowed: false, reason: "Daily limit reached." };
    }

    if (usage.locked) {
      return { allowed: false, reason: "A generation is already in progress." };
    }

    const now = Date.now();
    if (now - usage.lastGeneratedAt < COOLDOWN_SECONDS * 1000) {
      return { allowed: false, reason: "Please wait a few seconds before generating another." };
    }

    // Lock it
    usage.locked = true;
    db[key] = usage;
    await this.writeDb(db);

    return { allowed: true };
  }

  async incrementAndUnlock(sessionId: string, date: string): Promise<void> {
    const db = await this.readDb();
    const key = this.getKey(sessionId, date);
    const usage = db[key] || { count: 0, lastGeneratedAt: 0, locked: false };

    usage.count += 1;
    usage.lastGeneratedAt = Date.now();
    usage.locked = false;
    db[key] = usage;
    
    await this.writeDb(db);
  }

  async unlockOnFailure(sessionId: string, date: string): Promise<void> {
    const db = await this.readDb();
    const key = this.getKey(sessionId, date);
    const usage = db[key] || { count: 0, lastGeneratedAt: 0, locked: false };

    usage.locked = false;
    db[key] = usage;

    await this.writeDb(db);
  }
}

export const usageTracker = new JsonUsageTracker();
