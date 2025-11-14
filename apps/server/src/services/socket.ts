import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export function setupSocketIO(io: Server, prisma: PrismaClient) {
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        throw new Error('No token provided');
      }

      const decoded = jwt.verify(token, config.JWT_SECRET) as any;
      socket.data.user = decoded;
      next();
    } catch (error) {
      logger.error('Socket authentication failed:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    logger.info(`User ${user.id} connected via Socket.IO`);

    // Join user's personal room
    socket.join(`user:${user.id}`);

    // Handle room joining
    socket.on('join-room', (room: string) => {
      socket.join(room);
      logger.debug(`User ${user.id} joined room: ${room}`);
    });

    socket.on('leave-room', (room: string) => {
      socket.leave(room);
      logger.debug(`User ${user.id} left room: ${room}`);
    });

    // Handle reading submission
    socket.on('reading:submit', async (data: { sessionId: string; reading: any }) => {
      try {
        const { sessionId, reading } = data;

        // Verify session access
        const session = await prisma.session.findUnique({
          where: { id: sessionId },
          include: {
            appointment: true
          }
        });

        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        // Only technician can submit readings
        if (user.id !== session.appointment.technicianId) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        // Create reading record
        const newReading = await prisma.reading.create({
          data: {
            sessionId,
            deviceId: reading.deviceId,
            type: reading.type,
            payload: reading.payload,
            capturedAt: new Date()
          },
          include: {
            device: true
          }
        });

        // Broadcast to session room
        io.to(`sessions:${sessionId}`).emit('reading:new', {
          sessionId,
          reading: newReading
        });

        logger.info(`Reading submitted for session ${sessionId} by user ${user.id}`);
      } catch (error) {
        logger.error('Error handling reading submission:', error);
        socket.emit('error', { message: 'Failed to submit reading' });
      }
    });

    // Handle appointment status updates
    socket.on('appointment:update-status', async (data: { appointmentId: string; status: string }) => {
      try {
        const { appointmentId, status } = data;

        // Verify appointment access
        const appointment = await prisma.appointment.findUnique({
          where: { id: appointmentId }
        });

        if (!appointment) {
          socket.emit('error', { message: 'Appointment not found' });
          return;
        }

        const hasAccess = 
          user.id === appointment.patientId ||
          user.id === appointment.doctorId ||
          user.id === appointment.technicianId;

        if (!hasAccess) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        // Update appointment status
        const updatedAppointment = await prisma.appointment.update({
          where: { id: appointmentId },
          data: { status: status as any }
        });

        // Broadcast status change
        io.to(`appointments:${appointmentId}`).emit('appointment:status-changed', {
          appointmentId,
          status
        });

        // Log status change
        await auditLog(prisma, {
          userId: user.id,
          entityType: 'Appointment',
          entityId: appointmentId,
          action: 'STATUS_UPDATE',
          diff: { status }
        });

        logger.info(`Appointment ${appointmentId} status updated to ${status} by user ${user.id}`);
      } catch (error) {
        logger.error('Error handling appointment status update:', error);
        socket.emit('error', { message: 'Failed to update appointment status' });
      }
    });

    // Handle technician location updates
    socket.on('technician:update-location', async (data: { lat: number; lng: number }) => {
      try {
        const { lat, lng } = data;

        // Update technician location
        await prisma.technician.update({
          where: { id: user.id },
          data: {
            currentGeo: { lat, lng },
            lastSeenAt: new Date()
          }
        });

        // Broadcast location update
        io.emit('technician:location-updated', {
          technicianId: user.id,
          location: { lat, lng }
        });

        logger.debug(`Technician ${user.id} location updated: ${lat}, ${lng}`);
      } catch (error) {
        logger.error('Error updating technician location:', error);
        socket.emit('error', { message: 'Failed to update location' });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`User ${user.id} disconnected from Socket.IO`);
    });
  });

  // Store io instance for use in other parts of the app
  (io as any).prisma = prisma;
  return io;
}