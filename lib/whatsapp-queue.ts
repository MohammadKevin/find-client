export interface QueueTask {
  id: string;
  leadId: string;
  targetPhone: string;
  businessName: string;
  message: string;
  customToken?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  delayBeforeSendMs: number;
  scheduledAt: string;
  executedAt?: string;
  error?: string;
  response?: unknown;
}

export function getRandomDelayMs(minSeconds = 45, maxSeconds = 120): number {
  const min = Math.min(minSeconds, maxSeconds) * 1000;
  const max = Math.max(minSeconds, maxSeconds) * 1000;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export class WhatsAppQueueManager {
  private queue: QueueTask[] = [];
  private isProcessing = false;
  private isPaused = false;
  private onTaskUpdate?: (task: QueueTask, stats: QueueStats) => void;

  constructor(onTaskUpdate?: (task: QueueTask, stats: QueueStats) => void) {
    this.onTaskUpdate = onTaskUpdate;
  }

  public enqueue(
    tasks: Array<{
      leadId: string;
      targetPhone: string;
      businessName: string;
      message: string;
      customToken?: string;
    }>,
    minSeconds = 45,
    maxSeconds = 120
  ): QueueTask[] {
    const newTasks: QueueTask[] = tasks.map((item, index) => {
      const delay = index === 0 ? 0 : getRandomDelayMs(minSeconds, maxSeconds);
      return {
        id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        leadId: item.leadId,
        targetPhone: item.targetPhone,
        businessName: item.businessName,
        message: item.message,
        customToken: item.customToken,
        status: 'pending',
        delayBeforeSendMs: delay,
        scheduledAt: new Date().toISOString(),
      };
    });

    this.queue.push(...newTasks);
    this.triggerProcessing();
    return newTasks;
  }

  public getStats(): QueueStats {
    const total = this.queue.length;
    const completed = this.queue.filter((t) => t.status === 'completed').length;
    const failed = this.queue.filter((t) => t.status === 'failed').length;
    const pending = this.queue.filter((t) => t.status === 'pending').length;
    const processing = this.queue.filter((t) => t.status === 'processing').length;
    return { total, completed, failed, pending, processing, isPaused: this.isPaused };
  }

  public getQueue(): QueueTask[] {
    return [...this.queue];
  }

  public pause() {
    this.isPaused = true;
  }

  public resume() {
    if (this.isPaused) {
      this.isPaused = false;
      this.triggerProcessing();
    }
  }

  public clear() {
    this.queue = [];
    this.isProcessing = false;
  }

  private async triggerProcessing() {
    if (this.isProcessing || this.isPaused) return;
    this.isProcessing = true;

    while (this.queue.some((t) => t.status === 'pending')) {
      if (this.isPaused) break;

      const currentTask = this.queue.find((t) => t.status === 'pending');
      if (!currentTask) break;

      if (currentTask.delayBeforeSendMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, currentTask.delayBeforeSendMs));
      }

      if (this.isPaused) break;

      currentTask.status = 'processing';
      this.notify(currentTask);

      try {
        const response = await fetch('/api/send-wa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target: currentTask.targetPhone,
            message: currentTask.message,
            token: currentTask.customToken,
          }),
        });

        const data = await response.json().catch(() => null);

        if (response.ok && data?.success) {
          currentTask.status = 'completed';
          currentTask.response = data;
          currentTask.executedAt = new Date().toISOString();
        } else {
          currentTask.status = 'failed';
          currentTask.error = data?.error || 'Gagal mengirim pesan';
          currentTask.executedAt = new Date().toISOString();
        }
      } catch (err) {
        currentTask.status = 'failed';
        currentTask.error = err instanceof Error ? err.message : 'Kesalahan jaringan/sistem';
        currentTask.executedAt = new Date().toISOString();
      }

      this.notify(currentTask);
    }

    this.isProcessing = false;
  }

  private notify(task: QueueTask) {
    if (this.onTaskUpdate) {
      this.onTaskUpdate(task, this.getStats());
    }
  }
}

export interface QueueStats {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  processing: number;
  isPaused: boolean;
}
