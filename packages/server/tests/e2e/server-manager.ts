import { Server } from 'colyseus';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { GameRoom } from '../../src/room';

/**
 * E2E Test Server Manager
 * Manages server instances for end-to-end testing
 */
export class TestServerManager {
  private httpServer: any;
  private gameServer: Server;
  private app: express.Application;
  private port: number;

  constructor(port: number = 0) { // 0 = let OS assign port
    this.port = port;
    this.app = express();
    this.app.use(cors());
    this.app.get("/health", (_req, res) => res.json({ ok: true, test: true }));
    
    this.httpServer = createServer(this.app);
    this.gameServer = new Server({
      server: this.httpServer,
    });
    
    this.gameServer.define("toodee", GameRoom);
  }

  /**
   * Start the test server
   * @returns Promise that resolves when server is listening
   */
  async start(): Promise<{ port: number; url: string }> {
    return new Promise((resolve, reject) => {
      this.httpServer.listen(this.port, () => {
        const address = this.httpServer.address();
        if (!address || typeof address === 'string') {
          reject(new Error('Failed to get server address'));
          return;
        }
        
        const actualPort = address.port;
        const url = `ws://localhost:${actualPort}`;
        
        console.log(`[TestServer] Started on port ${actualPort}`);
        resolve({ port: actualPort, url });
      });
      
      this.httpServer.on('error', reject);
    });
  }

  /**
   * Stop the test server
   */
  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.httpServer) {
        this.httpServer.close((err: any) => {
          if (err) {
            reject(err);
          } else {
            console.log('[TestServer] Stopped');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get the server instance (for direct testing if needed)
   */
  getGameServer(): Server {
    return this.gameServer;
  }
}

/**
 * Create and manage a test server for the duration of a test suite
 */
export async function withTestServer<T>(
  testFn: (serverUrl: string, port: number) => Promise<T>
): Promise<T> {
  const serverManager = new TestServerManager();
  
  try {
    const { port, url } = await serverManager.start();
    return await testFn(url, port);
  } finally {
    await serverManager.stop();
  }
}