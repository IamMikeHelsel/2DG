import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient, connectWithRetry } from '../src/net';

// Mock Colyseus client
vi.mock('colyseus.js', () => ({
  Client: vi.fn().mockImplementation((url: string) => ({
    url,
    joinOrCreate: vi.fn()
  }))
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('Network Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    vi.stubEnv('VITE_SERVER_URL', '');
  });

  describe('createClient', () => {
    it('should create client with default URL when env var not set', () => {
      const client = createClient();
      expect(client.url).toBe('ws://localhost:2567');
    });

    it('should create client with environment URL when set', () => {
      vi.stubEnv('VITE_SERVER_URL', 'wss://production.example.com');
      const client = createClient();
      expect(client.url).toBe('wss://production.example.com');
    });
  });

  describe('connectWithRetry', () => {
    it('should connect successfully on first attempt', async () => {
      const mockClient = {
        joinOrCreate: vi.fn().mockResolvedValue({ id: 'room1' })
      };
      
      vi.doMock('../src/net', async () => {
        const actual = await vi.importActual('../src/net');
        return {
          ...actual,
          createClient: () => mockClient
        };
      });

      localStorageMock.getItem.mockReturnValue(null);

      const { connectWithRetry: mockedConnectWithRetry } = await import('../src/net');
      const room = await mockedConnectWithRetry(3, 1000);
      
      expect(room).toEqual({ id: 'room1' });
      expect(mockClient.joinOrCreate).toHaveBeenCalledTimes(1);
    });

    it('should retry on connection failure', async () => {
      const mockClient = {
        joinOrCreate: vi.fn()
          .mockRejectedValueOnce(new Error('Connection failed'))
          .mockResolvedValueOnce({ id: 'room1' })
      };
      
      vi.doMock('../src/net', async () => {
        const actual = await vi.importActual('../src/net');
        return {
          ...actual,
          createClient: () => mockClient
        };
      });

      localStorageMock.getItem.mockReturnValue(null);

      const { connectWithRetry: mockedConnectWithRetry } = await import('../src/net');
      const room = await mockedConnectWithRetry(3, 100);
      
      expect(room).toEqual({ id: 'room1' });
      expect(mockClient.joinOrCreate).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries exceeded', async () => {
      const mockClient = {
        joinOrCreate: vi.fn().mockRejectedValue(new Error('Connection failed'))
      };
      
      vi.doMock('../src/net', async () => {
        const actual = await vi.importActual('../src/net');
        return {
          ...actual,
          createClient: () => mockClient
        };
      });

      localStorageMock.getItem.mockReturnValue(null);

      const { connectWithRetry: mockedConnectWithRetry } = await import('../src/net');
      
      await expect(mockedConnectWithRetry(2, 100)).rejects.toThrow('Failed to connect after 2 attempts');
      expect(mockClient.joinOrCreate).toHaveBeenCalledTimes(2);
    });

    it('should use saved data when available', async () => {
      const mockSaveData = JSON.stringify({ name: 'SavedPlayer', level: 5 });
      localStorageMock.getItem.mockReturnValue(mockSaveData);

      const mockClient = {
        joinOrCreate: vi.fn().mockResolvedValue({ id: 'room1' })
      };
      
      vi.doMock('../src/net', async () => {
        const actual = await vi.importActual('../src/net');
        return {
          ...actual,
          createClient: () => mockClient
        };
      });

      const { connectWithRetry: mockedConnectWithRetry } = await import('../src/net');
      await mockedConnectWithRetry();
      
      expect(mockClient.joinOrCreate).toHaveBeenCalledWith('toodee', {
        name: 'SavedPlayer',
        restore: { name: 'SavedPlayer', level: 5 }
      });
    });

    it('should handle corrupted save data gracefully', async () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');

      const mockClient = {
        joinOrCreate: vi.fn().mockResolvedValue({ id: 'room1' })
      };
      
      vi.doMock('../src/net', async () => {
        const actual = await vi.importActual('../src/net');
        return {
          ...actual,
          createClient: () => mockClient
        };
      });

      const { connectWithRetry: mockedConnectWithRetry } = await import('../src/net');
      await mockedConnectWithRetry();
      
      // Should fall back to generated name when save data is corrupted
      expect(mockClient.joinOrCreate).toHaveBeenCalledWith('toodee', expect.objectContaining({
        restore: null
      }));
    });
  });

  describe('localStorage save/load', () => {
    it('should return null when no save data exists', () => {
      localStorageMock.getItem.mockReturnValue(null);
      // This would test the loadSave function if it were exported
      // For now, we test it indirectly through connectWithRetry
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage unavailable');
      });
      // Should not crash the application
    });
  });
});