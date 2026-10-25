import { createUser, findUserByEmail, validateUserCredentials, getUserById, updateUserProfile } from '../services/user.service.js';
import { signToken } from '../utils/jwt.js';

export async function register(req, res) {
  const { fullName, email, password, phone, avatarUrl } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'fullName, email, and password are required'
      }
    });
  }

  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    return res.status(409).json({
      success: false,
      error: {
        code: 'USER_EXISTS',
        message: 'An account with this email already exists'
      }
    });
  }

  const user = await createUser({
    email,
    password,
    fullName,
    phone,
    avatarUrl
  });

  const token = signToken({
    sub: user.id,
    role: user.role
  });

  return res.status(201).json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role,
      token
    }
  });
}

export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'email and password are required'
      }
    });
  }

  const user = await validateUserCredentials(email, password);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      }
    });
  }

  const token = signToken({
    sub: user.id,
    role: user.role
  });

  return res.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role,
      token
    }
  });
}

export async function getMe(req, res) {
  const user = await getUserById(req.user.sub);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'USER_NOT_FOUND',
        message: 'User not found'
      }
    });
  }

  return res.json({
    success: true,
    data: user
  });
}

export async function updateMe(req, res) {
  const { fullName, phone, avatarUrl } = req.body;

  const user = await updateUserProfile(req.user.sub, {
    ...(fullName ? { fullName } : {}),
    ...(phone !== undefined ? { phone } : {}),
    ...(avatarUrl !== undefined ? { avatarUrl } : {})
  });

  return res.json({
    success: true,
    data: user
  });
}