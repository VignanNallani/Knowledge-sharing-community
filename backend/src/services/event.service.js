import { ApiError } from '../utils/ApiError.js';
import { logActivity } from './activityService.js';
import { ActivityType } from '@prisma/client';
import eventRepository from '../repositories/event.repo.js';

class EventService {
  async getEvents(query) {
    const { skip, limit, page } = query;
    const { search, location } = query;

    const where = {
      AND: [
        search ? { name: { contains: search, mode: 'insensitive' } } : {},
        location ? { location: { contains: location, mode: 'insensitive' } } : {},
      ],
    };

    const [events, total] = await Promise.all([
      eventRepository.findEvents({
        where,
        skip,
        take: parseInt(limit),
        include: { 
          attendees: true, 
          createdBy: { select: { id: true, name: true, email: true } } 
        },
        orderBy: { startsAt: 'asc' }
      }),
      eventRepository.countEvents({ where })
    ]);

    return {
      events,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  async createEvent(eventData, userId) {
    const { name, description, location, startsAt, endsAt } = eventData;
    
    if (!name || !startsAt) {
      throw new ApiError(400, 'Name and start date are required');
    }

    const event = await eventRepository.createEvent({
      name,
      description,
      location,
      startsAt: new Date(startsAt),
      endsAt: endsAt ? new Date(endsAt) : null,
      createdById: userId
    });

    await logActivity({
      type: ActivityType.EVENT_CREATED,
      message: `created event "${event.name}"`,
      userId,
      entity: 'EVENT',
      entityId: event.id
    });

    return event;
  }

  async updateEvent(eventId, eventData, userId, userRole) {
    const { name, description, location, startsAt, endsAt } = eventData;

    const event = await eventRepository.findEventById(eventId);
    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    if (userRole !== 'ADMIN' && userId !== event.createdById) {
      throw new ApiError(403, 'Not authorized');
    }

    const updatedEvent = await eventRepository.updateEvent(eventId, {
      name: name ?? event.name,
      description: description ?? event.description,
      location: location ?? event.location,
      startsAt: startsAt ? new Date(startsAt) : event.startsAt,
      endsAt: endsAt ? new Date(endsAt) : event.endsAt
    });

    return updatedEvent;
  }

  async deleteEvent(eventId, userId, userRole) {
    const event = await eventRepository.findEventById(eventId);
    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    if (userRole !== 'ADMIN' && userId !== event.createdById) {
      throw new ApiError(403, 'Not authorized');
    }

    await eventRepository.deleteEvent(eventId);
    return { message: 'Event deleted successfully' };
  }

  async joinEvent(eventId, userId) {
    const event = await eventRepository.findEventById(eventId);
    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    if (event.createdById === userId) {
      throw new ApiError(400, 'Creator cannot join their own event');
    }

    const existing = await eventRepository.findEventAttendee(eventId, userId);
    if (existing) {
      throw new ApiError(400, 'Already registered');
    }

    const attendee = await eventRepository.createEventAttendee({
      userId,
      eventId: parseInt(eventId)
    });

    await logActivity({
      type: ActivityType.EVENT_JOINED,
      message: `joined event "${event.name}"`,
      userId,
      entity: 'EVENT',
      entityId: event.id
    });

    return attendee;
  }
}

export default new EventService();
