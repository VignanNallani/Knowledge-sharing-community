import prisma from '../config/prisma.js';

export const findEventById = (eventId, options = {}) =>
  prisma.event.findUnique({
    where: { id: parseInt(eventId) },
    ...options,
  });

export const findEvents = (options = {}) => {
  const { where = {}, ...otherOptions } = options;
  return prisma.event.findMany({
    where,
    ...otherOptions,
  });
};

export const createEvent = (data, options = {}) =>
  prisma.event.create({
    data,
    ...options,
  });

export const updateEvent = (eventId, data, options = {}) =>
  prisma.event.update({
    where: { id: parseInt(eventId) },
    data,
    ...options,
  });

export const deleteEvent = (eventId) =>
  prisma.event.delete({
    where: { id: parseInt(eventId) },
  });

export const countEvents = (where = {}) =>
  prisma.event.count({ where });

export const findEventAttendee = (eventId, userId) =>
  prisma.eventAttendee.findFirst({
    where: { eventId: parseInt(eventId), userId },
  });

export const createEventAttendee = (data) =>
  prisma.eventAttendee.create({
    data,
  });

export const deleteEventAttendee = (eventId, userId) =>
  prisma.eventAttendee.deleteMany({
    where: { eventId: parseInt(eventId), userId },
  });

export const findEventAttendees = (eventId, options = {}) =>
  prisma.eventAttendee.findMany({
    where: { eventId: parseInt(eventId) },
    ...options,
  });

export default {
  findEventById,
  findEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  countEvents,
  findEventAttendee,
  createEventAttendee,
  deleteEventAttendee,
  findEventAttendees,
};
