import { promises as fs } from 'fs';
import path from 'path';
import { AIRiddle, ScoredRiddle } from '@/types/ai';

export interface RiddleStore {
  getByDate(date: string, difficulty: string): Promise<AIRiddle | null>;
  save(date: string, riddle: AIRiddle): Promise<void>;
  getRecent(limit: number): Promise<AIRiddle[]>;
  logRejection(date: string, scoredRiddle: ScoredRiddle, reason: string): Promise<void>;
}

class JsonFileStore implements RiddleStore {
  private getDbPath() {
    return path.join(process.cwd(), 'data', 'generated-riddles.json');
  }
  
  private getLogPath() {
    return path.join(process.cwd(), 'data', 'rejected-riddles.json');
  }

  private async readDb(): Promise<Record<string, AIRiddle>> {
    try {
      const data = await fs.readFile(this.getDbPath(), 'utf-8');
      return JSON.parse(data);
    } catch {
      return {}; // file doesn't exist yet or is empty
    }
  }

  private async writeDb(data: Record<string, AIRiddle>) {
    await fs.mkdir(path.dirname(this.getDbPath()), { recursive: true });
    await fs.writeFile(this.getDbPath(), JSON.stringify(data, null, 2));
  }

  async getByDate(date: string, difficulty: string): Promise<AIRiddle | null> {
    const db = await this.readDb();
    // We store using a composite key date_difficulty
    const key = `${date}_${difficulty}`;
    return db[key] || null;
  }

  async save(date: string, riddle: AIRiddle): Promise<void> {
    const db = await this.readDb();
    const key = `${date}_${riddle.difficulty}`;
    db[key] = riddle;
    await this.writeDb(db);
  }

  async getRecent(limit: number): Promise<AIRiddle[]> {
    const db = await this.readDb();
    const all = Object.values(db).sort((a, b) => 
      new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime()
    );
    return all.slice(0, limit);
  }

  async logRejection(date: string, scoredRiddle: ScoredRiddle, reason: string): Promise<void> {
    try {
      const logPath = this.getLogPath();
      let logs: any[] = [];
      try {
        const data = await fs.readFile(logPath, 'utf-8');
        logs = JSON.parse(data);
      } catch {}
      
      logs.push({
        date,
        reason,
        timestamp: new Date().toISOString(),
        scoredRiddle
      });
      
      await fs.writeFile(logPath, JSON.stringify(logs, null, 2));
    } catch (err) {
      console.error('Failed to log rejection', err);
    }
  }
}

// Export the singleton instance
export const riddleStore: RiddleStore = new JsonFileStore();
