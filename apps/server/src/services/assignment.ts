import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

interface AssignmentRequest {
  areaCode?: string;
  addressId?: string;
  startAt: Date;
  lat?: number;
  lng?: number;
}

export async function assignTechnician(prisma: PrismaClient, request: AssignmentRequest) {
  logger.info('Starting technician assignment', { request });

  try {
    // Get address coordinates if addressId provided
    let targetLat: number | undefined;
    let targetLng: number | undefined;

    if (request.addressId) {
      const address = await prisma.address.findUnique({
        where: { id: request.addressId }
      });

      if (address?.geo) {
        const geo = address.geo as { lat: number; lng: number };
        targetLat = geo.lat;
        targetLng = geo.lng;
      }
    } else if (request.lat && request.lng) {
      targetLat = request.lat;
      targetLng = request.lng;
    }

    // Find available technicians
    const availableTechnicians = await prisma.technician.findMany({
      where: {
        availability: 'ONLINE',
        kit: {
          status: 'ASSIGNED'
        }
      },
      include: {
        user: {
          include: {
            profile: true
          }
        },
        kit: {
          include: {
            devices: {
              where: {
                status: 'ACTIVE'
              }
            }
          }
        }
      }
    });

    if (availableTechnicians.length === 0) {
      logger.warn('No available technicians found');
      return null;
    }

    // Filter by area code if provided
    let filteredTechnicians = availableTechnicians;
    if (request.areaCode) {
      filteredTechnicians = availableTechnicians.filter(tech => {
        const coverageAreas = tech.coverageAreas as string[];
        return coverageAreas.includes(request.areaCode!);
      });
    }

    // If no technicians in area, fall back to all available
    if (filteredTechnicians.length === 0) {
      filteredTechnicians = availableTechnicians;
    }

    // Sort by distance if coordinates available
    if (targetLat && targetLng) {
      filteredTechnicians = filteredTechnicians
        .map(tech => {
          const techGeo = tech.currentGeo as { lat: number; lng: number } | null;
          const distance = techGeo 
            ? calculateDistance(targetLat!, targetLng!, techGeo.lat, techGeo.lng)
            : Infinity;
          
          return { ...tech, distance };
        })
        .sort((a, b) => a.distance - b.distance);
    }

    // Check for conflicts with existing appointments
    const selectedTechnician = filteredTechnicians[0];
    if (!selectedTechnician) {
      logger.warn('No suitable technician found after filtering');
      return null;
    }

    // Check for scheduling conflicts
    const conflictingAppointments = await prisma.appointment.findMany({
      where: {
        technicianId: selectedTechnician.id,
        status: {
          in: ['BOOKED', 'CONFIRMED', 'IN_PROGRESS']
        },
        OR: [
          {
            startAt: {
              lte: request.startAt
            },
            endAt: {
              gt: request.startAt
            }
          },
          {
            startAt: {
              lt: new Date(request.startAt.getTime() + 60 * 60 * 1000) // 1 hour buffer
            },
            endAt: {
              gte: new Date(request.startAt.getTime() + 60 * 60 * 1000)
            }
          }
        ]
      }
    });

    if (conflictingAppointments.length > 0) {
      logger.warn(`Technician ${selectedTechnician.id} has scheduling conflicts`);
      // Try next available technician
      const nextTechnician = filteredTechnicians[1];
      if (nextTechnician) {
        return nextTechnician;
      }
      return null;
    }

    logger.info(`Assigned technician ${selectedTechnician.id} to appointment`);
    return selectedTechnician;

  } catch (error) {
    logger.error('Error in technician assignment:', error);
    return null;
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in kilometers
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}