// Client-side auth utilities
export interface AuthUser {
  id: string;
  username: string;
  sessionToken: string;
}

export class ClientAuth {
  private static readonly AUTH_KEY = 'toodee_auth';
  private static readonly SERVER_URL = import.meta.env.VITE_SERVER_URL || 'ws://localhost:2567';
  
  static async authenticateAsGuest(username?: string): Promise<AuthUser | null> {
    try {
      const serverUrl = this.SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://');
      
      const response = await fetch(`${serverUrl}/auth/guest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username: username || this.generateRandomName() 
        }),
      });
      
      if (!response.ok) {
        throw new Error('Authentication failed');
      }
      
      const data = await response.json();
      
      if (data.success && data.user && data.sessionToken) {
        const authUser: AuthUser = {
          id: data.user.id,
          username: data.user.username,
          sessionToken: data.sessionToken,
        };
        
        // Store in localStorage
        localStorage.setItem(this.AUTH_KEY, JSON.stringify(authUser));
        
        return authUser;
      }
      
      return null;
    } catch (error) {
      console.error('Guest authentication failed:', error);
      return null;
    }
  }
  
  static getStoredAuth(): AuthUser | null {
    try {
      const stored = localStorage.getItem(this.AUTH_KEY);
      if (stored) {
        const auth = JSON.parse(stored);
        // Simple token expiry check (tokens are valid for 24 hours)
        if (auth.sessionToken) {
          const payload = JSON.parse(atob(auth.sessionToken.split('.')[1]));
          if (payload.exp && payload.exp > Date.now() / 1000) {
            return auth;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load stored auth:', error);
    }
    
    // Clear invalid auth
    localStorage.removeItem(this.AUTH_KEY);
    return null;
  }
  
  static clearAuth(): void {
    localStorage.removeItem(this.AUTH_KEY);
  }
  
  static async getOrCreateAuth(preferredUsername?: string): Promise<AuthUser | null> {
    // Try to get stored auth first
    let auth = this.getStoredAuth();
    
    if (!auth) {
      // Create new guest account
      auth = await this.authenticateAsGuest(preferredUsername);
    }
    
    return auth;
  }
  
  private static generateRandomName(): string {
    const adjectives = ["Bold", "Swift", "Calm", "Brave", "Merry", "Clever", "Noble", "Wise"];
    const nouns = ["Fox", "Owl", "Pine", "Fawn", "Wolf", "Hawk", "Bear", "Sage"];
    
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${adj}${noun}`;
  }
}

// Legacy save system (kept for backward compatibility)
export function loadLegacySave() {
  try {
    const save = localStorage.getItem("toodee_save");
    return save ? JSON.parse(save) : null;
  } catch {
    return null;
  }
}

export function saveLegacySave(player: any) {
  localStorage.setItem("toodee_save", JSON.stringify({
    name: player.name,
    x: player.x,
    y: player.y,
    gold: player.gold,
    pots: player.pots,
  }));
}