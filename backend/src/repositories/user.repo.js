import getPrisma from '../config/prisma.js';

const prisma = getPrisma();

export const findUserByEmail = (email) =>
  prisma.user.findUnique({
    where: { email },
  });

export const createUser = (data) =>
  prisma.user.create({
    data,
  });

export const findUserById = (id, select) =>
  prisma.user.findUnique({
    where: { id },
    ...(select ? { select } : {}),
  });

export const updateUserById = (id, data, select) =>
  prisma.user.update({
    where: { id },
    data,
    ...(select ? { select } : {}),
  });

export const searchUsers = ({ where, skip, take, select }) =>
  prisma.user.findMany({
    where,
    skip,
    take,
    ...(select ? { select } : {}),
  });

export const countUsers = (where) => prisma.user.count({ where });

export const createFollower = ({ followerId, followingId }) =>
  prisma.follower.create({
    data: { followerId, followingId },
  });

export const deleteFollower = ({ followerId, followingId }) =>
  prisma.follower.deleteMany({
    where: { followerId, followingId },
  });

export const listFollowers = ({ userId, skip, take, select }) =>
  prisma.follower.findMany({
    where: { followingId: userId },
    skip,
    take,
    ...(select ? { select } : {}),
  });

export const countFollowers = (userId) =>
  prisma.follower.count({ where: { followingId: userId } });

export const listFollowing = ({ userId, skip, take, select }) =>
  prisma.follower.findMany({
    where: { followerId: userId },
    skip,
    take,
    ...(select ? { select } : {}),
  });

export const countFollowing = (userId) =>
  prisma.follower.count({ where: { followerId: userId } });

export const findFollower = ({ followerId, followingId }) =>
  prisma.follower.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });

export default {
  findUserByEmail,
  createUser,
  findUserById,
  updateUserById,
  searchUsers,
  countUsers,
  createFollower,
  deleteFollower,
  listFollowers,
  countFollowers,
  listFollowing,
  countFollowing,
  findFollower,
};

