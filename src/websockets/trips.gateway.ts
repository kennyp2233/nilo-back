// src/websockets/trips.gateway.ts
import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    WsResponse,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TripsService } from '../trips/trips.service';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { TripStatus } from '@prisma/client';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
    namespace: 'trips',
})
export class TripsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private readonly logger = new Logger(TripsGateway.name);
    private userSocketMap = new Map<string, string[]>(); // userId -> socketIds[]

    constructor(
        private readonly jwtService: JwtService,
        private readonly tripsService: TripsService,
    ) { }

    afterInit(server: Server) {
        this.logger.log('WebSocket Gateway initialized');
    }

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);

        // Remove socket from user mapping
        this.removeSocketFromUser(client.id);
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage('authenticate')
    handleAuthenticate(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { token: string },
    ) {
        try {
            // Token already verified by guard
            const decoded = this.jwtService.decode(data.token);
            const userId = decoded.sub;

            this.logger.log(`User authenticated: ${userId}`);

            // Add socket to user mapping
            this.addSocketToUser(userId, client.id);

            // Join user's private room
            client.join(`user_${userId}`);

            return { event: 'authenticated', data: { success: true } };
        } catch (error) {
            this.logger.error(`Authentication failed: ${error.message}`);
            return { event: 'authenticated', data: { success: false, message: 'Authentication failed' } };
        }
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage('subscribe_trip')
    async handleSubscribeTrip(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { tripId: string, token: string },
    ) {
        try {
            const decoded = this.jwtService.decode(data.token);
            const userId = decoded.sub;

            // Verify if user has access to this trip
            const hasAccess = await this.tripsService.userHasAccessToTrip(data.tripId, userId);

            if (!hasAccess) {
                this.logger.warn(`User ${userId} tried to subscribe to trip ${data.tripId} without permission`);
                return { event: 'subscribe_trip', data: { success: false, message: 'Access denied' } };
            }

            // Join trip room
            client.join(`trip_${data.tripId}`);
            this.logger.log(`User ${userId} subscribed to trip ${data.tripId}`);

            return { event: 'subscribe_trip', data: { success: true, tripId: data.tripId } };
        } catch (error) {
            this.logger.error(`Trip subscription failed: ${error.message}`);
            return { event: 'subscribe_trip', data: { success: false, message: 'Subscription failed' } };
        }
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage('unsubscribe_trip')
    handleUnsubscribeTrip(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { tripId: string },
    ) {
        client.leave(`trip_${data.tripId}`);
        this.logger.log(`Client ${client.id} unsubscribed from trip ${data.tripId}`);
        return { event: 'unsubscribe_trip', data: { success: true } };
    }

    // Methods to emit trip updates
    emitTripUpdate(tripId: string, status: TripStatus, data: any = {}) {
        this.server.to(`trip_${tripId}`).emit('trip_updated', {
            tripId,
            status,
            ...data,
        });
        this.logger.log(`Emitted trip_updated event for trip ${tripId} with status ${status}`);
    }

    emitDriverLocation(tripId: string, location: { latitude: number, longitude: number }) {
        this.server.to(`trip_${tripId}`).emit('driver_location', {
            tripId,
            location,
        });
    }

    // Helper methods to manage user-socket mapping
    private addSocketToUser(userId: string, socketId: string) {
        const existingSockets = this.userSocketMap.get(userId) || [];
        if (!existingSockets.includes(socketId)) {
            existingSockets.push(socketId);
            this.userSocketMap.set(userId, existingSockets);
        }
    }

    private removeSocketFromUser(socketId: string) {
        this.userSocketMap.forEach((sockets, userId) => {
            const index = sockets.indexOf(socketId);
            if (index !== -1) {
                sockets.splice(index, 1);
                if (sockets.length === 0) {
                    this.userSocketMap.delete(userId);
                } else {
                    this.userSocketMap.set(userId, sockets);
                }
            }
        });
    }

    // Send notification to a specific user
    sendToUser(userId: string, event: string, data: any) {
        this.server.to(`user_${userId}`).emit(event, data);
        this.logger.log(`Sent ${event} to user ${userId}`);
    }
}