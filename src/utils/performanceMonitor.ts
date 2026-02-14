// Performance monitoring utility for tracking moodboard performance improvements

interface PerformanceMetrics {
  imageLoadTime: number;
  dragLatency: number;
  saveTime: number;
  memoryUsage: number;
  frameRate: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    imageLoadTime: 0,
    dragLatency: 0,
    saveTime: 0,
    memoryUsage: 0,
    frameRate: 0
  };

  private frameCount = 0;
  private lastFrameTime = 0;
  private frameRateHistory: number[] = [];

  // Measure image loading performance
  measureImageLoad<T>(operation: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    return operation().then(result => {
      const endTime = performance.now();
      this.metrics.imageLoadTime = endTime - startTime;
      return result;
    });
  }

  // Measure drag operation latency
  measureDragLatency<T>(operation: () => T): T {
    const startTime = performance.now();
    const result = operation();
    const endTime = performance.now();
    this.metrics.dragLatency = endTime - startTime;
    return result;
  }

  // Measure save operation time
  measureSave<T>(operation: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    return operation().then(result => {
      const endTime = performance.now();
      this.metrics.saveTime = endTime - startTime;
      return result;
    });
  }

  // Track frame rate
  trackFrame(): void {
    const now = performance.now();
    this.frameCount++;
    
    if (this.lastFrameTime > 0) {
      const deltaTime = now - this.lastFrameTime;
      const fps = 1000 / deltaTime;
      
      this.frameRateHistory.push(fps);
      
      // Keep only last 60 frames for average calculation
      if (this.frameRateHistory.length > 60) {
        this.frameRateHistory.shift();
      }
      
      // Calculate average frame rate
      const avgFps = this.frameRateHistory.reduce((sum, fps) => sum + fps, 0) / this.frameRateHistory.length;
      this.metrics.frameRate = avgFps;
    }
    
    this.lastFrameTime = now;
  }

  // Get current memory usage (approximate)
  getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return this.metrics.memoryUsage;
  }

  // Get all metrics
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // Get performance summary
  getPerformanceSummary(): string {
    const memUsage = this.getMemoryUsage();
    return `
Performance Summary:
- Image Load Time: ${this.metrics.imageLoadTime.toFixed(2)}ms
- Drag Latency: ${this.metrics.dragLatency.toFixed(2)}ms
- Save Time: ${this.metrics.saveTime.toFixed(2)}ms
- Memory Usage: ${memUsage.toFixed(2)}MB
- Frame Rate: ${this.metrics.frameRate.toFixed(1)} FPS
    `.trim();
  }

  // Reset all metrics
  reset(): void {
    this.metrics = {
      imageLoadTime: 0,
      dragLatency: 0,
      saveTime: 0,
      memoryUsage: 0,
      frameRate: 0
    };
    this.frameCount = 0;
    this.lastFrameTime = 0;
    this.frameRateHistory = [];
  }

  // Log performance metrics to console
  logMetrics(): void {
    console.log('Moodboard Performance Metrics:', this.getPerformanceSummary());
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();
export default performanceMonitor;
