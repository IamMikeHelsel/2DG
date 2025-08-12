import { AdminRole, AdminCommand, AdminAction, type ChatMessage } from "@toodee/shared";
import { GameRoom } from "./room.js";
import { Player } from "./state.js";

export class AdminSystem {
  private room: GameRoom;
  private adminActions: AdminAction[] = [];
  private bannedPlayers = new Map<string, { reason: string; expiresAt: number; bannedBy: string }>();

  constructor(room: GameRoom) {
    this.room = room;
  }

  isAdmin(playerId: string): boolean {
    const player = this.room.state.players.get(playerId);
    return player ? player.adminRole !== AdminRole.None : false;
  }

  hasPermission(playerId: string, requiredLevel: AdminRole): boolean {
    const player = this.room.state.players.get(playerId);
    if (!player) return false;

    const playerRole = player.adminRole as AdminRole;
    
    // Define role hierarchy
    const roleHierarchy = {
      [AdminRole.None]: 0,
      [AdminRole.Moderator]: 1,
      [AdminRole.Admin]: 2,
      [AdminRole.SuperAdmin]: 3
    };

    return roleHierarchy[playerRole] >= roleHierarchy[requiredLevel];
  }

  parseCommand(message: string): AdminCommand | null {
    if (!message.startsWith('/')) return null;

    const parts = message.slice(1).split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    return {
      type: command,
      args,
      adminId: '',
      timestamp: Date.now()
    };
  }

  async executeCommand(playerId: string, command: AdminCommand): Promise<{ success: boolean; message: string }> {
    if (!this.isAdmin(playerId)) {
      return { success: false, message: "Access denied: Admin privileges required" };
    }

    command.adminId = playerId;

    switch (command.type) {
      case 'kick':
        return this.kickPlayer(playerId, command.args);
      case 'ban':
        return this.banPlayer(playerId, command.args);
      case 'broadcast':
        return this.broadcastMessage(playerId, command.args);
      case 'spawn':
        return this.spawnItem(playerId, command.args);
      case 'teleport':
        return this.teleportPlayer(playerId, command.args);
      case 'shutdown':
        return this.scheduleShutdown(playerId, command.args);
      case 'unban':
        return this.unbanPlayer(playerId, command.args);
      case 'promote':
        return this.promotePlayer(playerId, command.args);
      case 'demote':
        return this.demotePlayer(playerId, command.args);
      default:
        return { success: false, message: `Unknown command: ${command.type}` };
    }
  }

  private kickPlayer(adminId: string, args: string[]): { success: boolean; message: string } {
    if (!this.hasPermission(adminId, AdminRole.Moderator)) {
      return { success: false, message: "Insufficient permissions" };
    }

    const targetName = args[0];
    const reason = args.slice(1).join(' ') || 'No reason provided';

    if (!targetName) {
      return { success: false, message: "Usage: /kick <player> [reason]" };
    }

    // Find player by name
    const targetPlayer = Array.from(this.room.state.players.values())
      .find(p => p.name.toLowerCase() === targetName.toLowerCase());

    if (!targetPlayer) {
      return { success: false, message: `Player '${targetName}' not found` };
    }

    // Don't allow kicking other admins of equal or higher rank
    const adminPlayer = this.room.state.players.get(adminId);
    if (this.isAdmin(targetPlayer.id) && adminPlayer) {
      const adminRole = adminPlayer.adminRole as AdminRole;
      const targetRole = targetPlayer.adminRole as AdminRole;
      
      const roleHierarchy = {
        [AdminRole.None]: 0,
        [AdminRole.Moderator]: 1,
        [AdminRole.Admin]: 2,
        [AdminRole.SuperAdmin]: 3
      };

      if (roleHierarchy[targetRole] >= roleHierarchy[adminRole]) {
        return { success: false, message: "Cannot kick admin of equal or higher rank" };
      }
    }

    // Disconnect the client
    const targetClient = this.room.clients.find(c => c.sessionId === targetPlayer.id);
    if (targetClient) {
      targetClient.leave(1000, `Kicked by admin: ${reason}`);
    }

    this.logAdminAction({
      id: `kick_${Date.now()}`,
      type: 'kick',
      adminId,
      targetPlayerId: targetPlayer.id,
      data: { reason, targetName: targetPlayer.name },
      timestamp: Date.now(),
      reason
    });

    return { success: true, message: `Player '${targetPlayer.name}' has been kicked. Reason: ${reason}` };
  }

  private banPlayer(adminId: string, args: string[]): { success: boolean; message: string } {
    if (!this.hasPermission(adminId, AdminRole.Admin)) {
      return { success: false, message: "Insufficient permissions" };
    }

    const targetName = args[0];
    const durationStr = args[1] || '24h';
    const reason = args.slice(2).join(' ') || 'No reason provided';

    if (!targetName) {
      return { success: false, message: "Usage: /ban <player> [duration] [reason]" };
    }

    // Parse duration (e.g., "1h", "30m", "7d", "permanent")
    let durationMs = 0;
    if (durationStr !== 'permanent') {
      const duration = this.parseDuration(durationStr);
      if (!duration) {
        return { success: false, message: "Invalid duration format. Use: 30m, 1h, 7d, or permanent" };
      }
      durationMs = duration;
    }

    const targetPlayer = Array.from(this.room.state.players.values())
      .find(p => p.name.toLowerCase() === targetName.toLowerCase());

    if (!targetPlayer) {
      return { success: false, message: `Player '${targetName}' not found` };
    }

    // Don't allow banning other admins of equal or higher rank
    const adminPlayer = this.room.state.players.get(adminId);
    if (this.isAdmin(targetPlayer.id) && adminPlayer) {
      const adminRole = adminPlayer.adminRole as AdminRole;
      const targetRole = targetPlayer.adminRole as AdminRole;
      
      const roleHierarchy = {
        [AdminRole.None]: 0,
        [AdminRole.Moderator]: 1,
        [AdminRole.Admin]: 2,
        [AdminRole.SuperAdmin]: 3
      };

      if (roleHierarchy[targetRole] >= roleHierarchy[adminRole]) {
        return { success: false, message: "Cannot ban admin of equal or higher rank" };
      }
    }

    const expiresAt = durationMs === 0 ? 0 : Date.now() + durationMs;
    
    // Update player state
    targetPlayer.isBanned = true;
    targetPlayer.banExpiresAt = expiresAt;
    targetPlayer.banReason = reason;

    // Store in ban list
    this.bannedPlayers.set(targetPlayer.id, {
      reason,
      expiresAt,
      bannedBy: adminId
    });

    // Disconnect the client
    const targetClient = this.room.clients.find(c => c.sessionId === targetPlayer.id);
    if (targetClient) {
      targetClient.leave(1000, `Banned: ${reason}`);
    }

    this.logAdminAction({
      id: `ban_${Date.now()}`,
      type: 'ban',
      adminId,
      targetPlayerId: targetPlayer.id,
      data: { reason, duration: durationStr, expiresAt, targetName: targetPlayer.name },
      timestamp: Date.now(),
      reason
    });

    const durationText = durationMs === 0 ? 'permanent' : durationStr;
    return { success: true, message: `Player '${targetPlayer.name}' has been banned for ${durationText}. Reason: ${reason}` };
  }

  private broadcastMessage(adminId: string, args: string[]): { success: boolean; message: string } {
    if (!this.hasPermission(adminId, AdminRole.Moderator)) {
      return { success: false, message: "Insufficient permissions" };
    }

    const message = args.join(' ');
    if (!message) {
      return { success: false, message: "Usage: /broadcast <message>" };
    }

    const adminPlayer = this.room.state.players.get(adminId);
    const adminName = adminPlayer?.name || 'Admin';

    const broadcastMsg: ChatMessage = {
      from: `[SERVER] ${adminName}`,
      text: message,
      ts: Date.now()
    };

    this.room.broadcast("chat", broadcastMsg);

    this.logAdminAction({
      id: `broadcast_${Date.now()}`,
      type: 'broadcast',
      adminId,
      data: { message },
      timestamp: Date.now()
    });

    return { success: true, message: "Broadcast sent successfully" };
  }

  private spawnItem(adminId: string, args: string[]): { success: boolean; message: string } {
    if (!this.hasPermission(adminId, AdminRole.Admin)) {
      return { success: false, message: "Insufficient permissions" };
    }

    const itemId = args[0];
    const quantity = parseInt(args[1]) || 1;
    const targetName = args[2]; // Optional target player

    if (!itemId) {
      return { success: false, message: "Usage: /spawn <item> [quantity] [target_player]" };
    }

    let targetPlayer: Player | undefined;
    
    if (targetName) {
      targetPlayer = Array.from(this.room.state.players.values())
        .find(p => p.name.toLowerCase() === targetName.toLowerCase());
      
      if (!targetPlayer) {
        return { success: false, message: `Player '${targetName}' not found` };
      }
    } else {
      targetPlayer = this.room.state.players.get(adminId);
    }

    if (!targetPlayer) {
      return { success: false, message: "Target player not found" };
    }

    // Handle different item types
    switch (itemId.toLowerCase()) {
      case 'gold':
        targetPlayer.gold = Math.min(999999, targetPlayer.gold + quantity);
        break;
      case 'pot':
      case 'potion':
        targetPlayer.pots = Math.min(999, targetPlayer.pots + quantity);
        break;
      case 'hp':
      case 'health':
        targetPlayer.hp = Math.min(targetPlayer.maxHp, targetPlayer.hp + quantity);
        break;
      default:
        return { success: false, message: `Unknown item: ${itemId}. Available: gold, potion, hp` };
    }

    this.logAdminAction({
      id: `spawn_${Date.now()}`,
      type: 'spawn',
      adminId,
      targetPlayerId: targetPlayer.id,
      data: { itemId, quantity, targetName: targetPlayer.name },
      timestamp: Date.now()
    });

    const target = targetName ? `for ${targetPlayer.name}` : 'for yourself';
    return { success: true, message: `Spawned ${quantity} ${itemId} ${target}` };
  }

  private teleportPlayer(adminId: string, args: string[]): { success: boolean; message: string } {
    if (!this.hasPermission(adminId, AdminRole.Moderator)) {
      return { success: false, message: "Insufficient permissions" };
    }

    if (args.length < 3) {
      return { success: false, message: "Usage: /teleport <player> <x> <y>" };
    }

    const targetName = args[0];
    const x = parseFloat(args[1]);
    const y = parseFloat(args[2]);

    if (isNaN(x) || isNaN(y)) {
      return { success: false, message: "Invalid coordinates" };
    }

    const targetPlayer = Array.from(this.room.state.players.values())
      .find(p => p.name.toLowerCase() === targetName.toLowerCase());

    if (!targetPlayer) {
      return { success: false, message: `Player '${targetName}' not found` };
    }

    // Validate coordinates are within map bounds
    if (x < 0 || y < 0 || x >= 96 || y >= 96) { // Using MAP constants
      return { success: false, message: "Coordinates out of bounds" };
    }

    targetPlayer.x = x;
    targetPlayer.y = y;

    this.logAdminAction({
      id: `teleport_${Date.now()}`,
      type: 'teleport',
      adminId,
      targetPlayerId: targetPlayer.id,
      data: { x, y, targetName: targetPlayer.name },
      timestamp: Date.now()
    });

    return { success: true, message: `Teleported ${targetPlayer.name} to (${x}, ${y})` };
  }

  private scheduleShutdown(adminId: string, args: string[]): { success: boolean; message: string } {
    if (!this.hasPermission(adminId, AdminRole.SuperAdmin)) {
      return { success: false, message: "Insufficient permissions" };
    }

    const delayStr = args[0] || '60s';
    const reason = args.slice(1).join(' ') || 'Scheduled maintenance';

    const delayMs = this.parseDuration(delayStr);
    if (!delayMs) {
      return { success: false, message: "Invalid delay format. Use: 30s, 5m, etc." };
    }

    // Broadcast shutdown warning
    const broadcastMsg: ChatMessage = {
      from: '[SERVER]',
      text: `Server will shutdown in ${delayStr} for ${reason}`,
      ts: Date.now()
    };

    this.room.broadcast("chat", broadcastMsg);

    // Schedule the shutdown
    setTimeout(() => {
      console.log(`[ADMIN] Server shutdown initiated by admin ${adminId}: ${reason}`);
      process.exit(0);
    }, delayMs);

    this.logAdminAction({
      id: `shutdown_${Date.now()}`,
      type: 'shutdown',
      adminId,
      data: { delay: delayStr, reason },
      timestamp: Date.now(),
      reason
    });

    return { success: true, message: `Server shutdown scheduled in ${delayStr}` };
  }

  private unbanPlayer(adminId: string, args: string[]): { success: boolean; message: string } {
    if (!this.hasPermission(adminId, AdminRole.Admin)) {
      return { success: false, message: "Insufficient permissions" };
    }

    const targetName = args[0];
    if (!targetName) {
      return { success: false, message: "Usage: /unban <player>" };
    }

    // This is simplified - in a real system you'd need persistent storage
    const bannedPlayer = Array.from(this.room.state.players.values())
      .find(p => p.name.toLowerCase() === targetName.toLowerCase() && p.isBanned);

    if (bannedPlayer) {
      bannedPlayer.isBanned = false;
      bannedPlayer.banExpiresAt = 0;
      bannedPlayer.banReason = "";
      this.bannedPlayers.delete(bannedPlayer.id);
    }

    this.logAdminAction({
      id: `unban_${Date.now()}`,
      type: 'ban', // Using 'ban' type with unban in data
      adminId,
      data: { action: 'unban', targetName },
      timestamp: Date.now()
    });

    return { success: true, message: `Player '${targetName}' has been unbanned` };
  }

  private promotePlayer(adminId: string, args: string[]): { success: boolean; message: string } {
    if (!this.hasPermission(adminId, AdminRole.SuperAdmin)) {
      return { success: false, message: "Only super admins can promote players" };
    }

    const targetName = args[0];
    const role = args[1] as AdminRole;

    if (!targetName || !role) {
      return { success: false, message: "Usage: /promote <player> <role>" };
    }

    const targetPlayer = Array.from(this.room.state.players.values())
      .find(p => p.name.toLowerCase() === targetName.toLowerCase());

    if (!targetPlayer) {
      return { success: false, message: `Player '${targetName}' not found` };
    }

    if (!Object.values(AdminRole).includes(role)) {
      return { success: false, message: `Invalid role. Available: ${Object.values(AdminRole).join(', ')}` };
    }

    targetPlayer.adminRole = role;

    this.logAdminAction({
      id: `promote_${Date.now()}`,
      type: 'spawn', // Using existing type, could add new type
      adminId,
      targetPlayerId: targetPlayer.id,
      data: { action: 'promote', role, targetName: targetPlayer.name },
      timestamp: Date.now()
    });

    return { success: true, message: `Player '${targetPlayer.name}' promoted to ${role}` };
  }

  private demotePlayer(adminId: string, args: string[]): { success: boolean; message: string } {
    if (!this.hasPermission(adminId, AdminRole.SuperAdmin)) {
      return { success: false, message: "Only super admins can demote players" };
    }

    const targetName = args[0];

    if (!targetName) {
      return { success: false, message: "Usage: /demote <player>" };
    }

    const targetPlayer = Array.from(this.room.state.players.values())
      .find(p => p.name.toLowerCase() === targetName.toLowerCase());

    if (!targetPlayer) {
      return { success: false, message: `Player '${targetName}' not found` };
    }

    targetPlayer.adminRole = AdminRole.None;

    this.logAdminAction({
      id: `demote_${Date.now()}`,
      type: 'spawn', // Using existing type
      adminId,
      targetPlayerId: targetPlayer.id,
      data: { action: 'demote', targetName: targetPlayer.name },
      timestamp: Date.now()
    });

    return { success: true, message: `Player '${targetPlayer.name}' demoted to regular user` };
  }

  private parseDuration(duration: string): number | null {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return null;
    }
  }

  private logAdminAction(action: AdminAction): void {
    this.adminActions.push(action);
    
    // Keep only last 1000 actions to prevent memory bloat
    if (this.adminActions.length > 1000) {
      this.adminActions = this.adminActions.slice(-1000);
    }

    // Log to console for monitoring
    console.log(`[ADMIN] ${action.type.toUpperCase()} by ${action.adminId}:`, action.data);
  }

  getAdminActions(limit = 50): AdminAction[] {
    return this.adminActions.slice(-limit).reverse();
  }

  isBanned(playerId: string): boolean {
    const ban = this.bannedPlayers.get(playerId);
    if (!ban) return false;

    // Check if ban has expired
    if (ban.expiresAt > 0 && Date.now() > ban.expiresAt) {
      this.bannedPlayers.delete(playerId);
      return false;
    }

    return true;
  }

  getBanInfo(playerId: string): { reason: string; expiresAt: number; bannedBy: string } | null {
    return this.bannedPlayers.get(playerId) || null;
  }
}