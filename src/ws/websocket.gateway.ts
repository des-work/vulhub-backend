import { Injectable, Logger, UseGuards, OnModuleDestroy } from '@nestjs/common';
import { WebSocketGateway as WSGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  tenantId?: string;
}

@Injectable()
@WSGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/',
})
export class WebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketGateway.name);
  private connectionCount = 0;
  private maxConnections = 1000; // Maximum concurrent connections
  private connectionTimeouts = new Map<string, NodeJS.Timeout>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Check connection limit
      if (this.connectionCount >= this.maxConnections) {
        this.logger.warn(`Connection limit reached (${this.maxConnections}). Rejecting connection from ${client.id}`);
        client.emit('error', { message: 'Server at capacity. Please try again later.' });
        client.disconnect();
        return;
      }

      this.connectionCount++;
      this.logger.log(`Client connected: ${client.id} (${this.connectionCount}/${this.maxConnections})`);

      // Set up connection timeout (30 minutes of inactivity)
      const timeout = setTimeout(() => {
        this.logger.log(`Connection timeout for client ${client.id}`);
        client.disconnect();
      }, 30 * 60 * 1000);
      
      this.connectionTimeouts.set(client.id, timeout);

      // Authenticate the client
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      
      if (token) {
        try {
          const payload = this.jwtService.verify(token, {
            secret: this.configService.get<string>('app.jwt.secret'),
          });
          
          client.userId = payload.sub;
          
          // Join user-specific room for real-time updates
          client.join(`user:${client.userId}`);
          
          this.logger.log(`Client ${client.id} authenticated as user ${client.userId}`);
        } catch (error) {
          this.logger.warn(`Authentication failed for client ${client.id}:`, error.message);
          client.disconnect();
          return;
        }
      } else {
        this.logger.warn(`No token provided for client ${client.id}`);
        client.disconnect();
        return;
      }
    } catch (error) {
      this.logger.error(`Error handling connection for client ${client.id}:`, error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.connectionCount = Math.max(0, this.connectionCount - 1);
    
    // Clear connection timeout
    const timeout = this.connectionTimeouts.get(client.id);
    if (timeout) {
      clearTimeout(timeout);
      this.connectionTimeouts.delete(client.id);
    }
    
    this.logger.log(`Client disconnected: ${client.id} (${this.connectionCount}/${this.maxConnections})`);
  }

  onModuleDestroy() {
    this.logger.log('WebSocket Gateway shutting down...');
    
    // Clear all timeouts
    this.connectionTimeouts.forEach((timeout) => {
      clearTimeout(timeout);
    });
    this.connectionTimeouts.clear();
    
    // Disconnect all clients
    this.server.disconnectSockets();
    
    this.logger.log('WebSocket Gateway shutdown complete');
  }

  @SubscribeMessage('join:tenant')
  handleJoinTenant(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() data: { tenantId: string }) {
    if (client.tenantId === data.tenantId) {
      client.join(`tenant:${data.tenantId}`);
      this.logger.log(`Client ${client.id} joined tenant ${data.tenantId}`);
    }
  }

  @SubscribeMessage('leave:tenant')
  handleLeaveTenant(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() data: { tenantId: string }) {
    client.leave(`tenant:${data.tenantId}`);
    this.logger.log(`Client ${client.id} left tenant ${data.tenantId}`);
  }

  @SubscribeMessage('join:project')
  handleJoinProject(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() data: { projectId: string }) {
    client.join(`project:${data.projectId}`);
    this.logger.log(`Client ${client.id} joined project ${data.projectId}`);
  }

  @SubscribeMessage('leave:project')
  handleLeaveProject(@ConnectedSocket() client: AuthenticatedSocket, @MessageBody() data: { projectId: string }) {
    client.leave(`project:${data.projectId}`);
    this.logger.log(`Client ${client.id} left project ${data.projectId}`);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    // Reset connection timeout on activity
    this.resetConnectionTimeout(client.id);
    client.emit('pong', { timestamp: new Date().toISOString() });
  }

  /**
   * Reset connection timeout for a client
   */
  private resetConnectionTimeout(clientId: string) {
    const existingTimeout = this.connectionTimeouts.get(clientId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    const newTimeout = setTimeout(() => {
      this.logger.log(`Connection timeout for client ${clientId}`);
      const client = this.server.sockets.sockets.get(clientId);
      if (client) {
        client.disconnect();
      }
    }, 30 * 60 * 1000); // 30 minutes
    
    this.connectionTimeouts.set(clientId, newTimeout);
  }

  // Broadcast methods for real-time updates
  broadcastLeaderboardUpdate(tenantId: string, data: any) {
    this.server.to(`tenant:${tenantId}`).emit('leaderboard:update', {
      ...data,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Broadcasted leaderboard update to tenant ${tenantId}`);
  }

  broadcastSubmissionUpdate(tenantId: string, submissionId: string, data: any) {
    this.server.to(`tenant:${tenantId}`).emit('submission:update', {
      submissionId,
      ...data,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Broadcasted submission update to tenant ${tenantId}`);
  }

  broadcastBadgeEarned(userId: string, badgeData: any) {
    this.server.to(`user:${userId}`).emit('badge:earned', {
      ...badgeData,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Broadcasted badge earned to user ${userId}`);
  }

  broadcastProjectUpdate(projectId: string, data: any) {
    this.server.to(`project:${projectId}`).emit('project:update', {
      ...data,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Broadcasted project update to project ${projectId}`);
  }

  broadcastUserActivity(tenantId: string, userId: string, activity: any) {
    this.server.to(`tenant:${tenantId}`).emit('user:activity', {
      userId,
      activity,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Broadcasted user activity to tenant ${tenantId}`);
  }

  broadcastSystemMessage(tenantId: string, message: string, type: 'info' | 'warning' | 'success' | 'error' = 'info') {
    this.server.to(`tenant:${tenantId}`).emit('system:message', {
      message,
      type,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Broadcasted system message to tenant ${tenantId}`);
  }

  // Get connected clients count
  getConnectedClientsCount(tenantId?: string): number {
    if (tenantId) {
      return this.server.sockets.adapter.rooms.get(`tenant:${tenantId}`)?.size || 0;
    }
    return this.server.sockets.sockets.size;
  }

  // Get connected users in a tenant
  getConnectedUsers(tenantId: string): string[] {
    const room = this.server.sockets.adapter.rooms.get(`tenant:${tenantId}`);
    if (!room) return [];

    const users: string[] = [];
    for (const socketId of room) {
      const socket = this.server.sockets.sockets.get(socketId) as AuthenticatedSocket;
      if (socket?.userId) {
        users.push(socket.userId);
      }
    }
    return [...new Set(users)]; // Remove duplicates
  }
}
