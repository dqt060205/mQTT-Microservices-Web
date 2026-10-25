import prisma from '../config/prisma.js';
import { hashPassword, comparePassword } from '../utils/password.js';

export async function findUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email }
  });
}

export async function createUser({ email, password, fullName, phone, avatarUrl }) {
  const passwordHash = await hashPassword(password);

  return prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName,
      phone,
      avatarUrl
    }
  });
}

export async function validateUserCredentials(email, password) {
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    return null;
  }

  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  return user;
}

export async function getUserById(id) {
  return prisma.user.findUnique({
    where: { id }
  });
}

export async function updateUserProfile(id, data) {
  return prisma.user.update({
    where: { id },
    data
  });
}