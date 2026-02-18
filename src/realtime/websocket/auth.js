const jwt = require('jsonwebtoken');
const config = require('../../config/env');

const ROLES = {
  ADMIN: 'ADMIN',
  OPERATOR: 'OPERATOR',
  COURIER: 'COURIER'
};

function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret, {
    issuer: config.jwtIssuer,
    audience: config.jwtAudience
  });
}

function socketAuthMiddleware(socket, next) {
  try {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Unauthorized'));
    }

    const payload = verifyToken(token);
    if (!payload || !payload.role) {
      return next(new Error('Unauthorized'));
    }

    socket.user = {
      id: payload.sub,
      role: payload.role,
      courierId: payload.courierId || null
    };

    return next();
  } catch (error) {
    return next(new Error('Unauthorized'));
  }
}

function issueToken({ userId, role, courierId }) {
  const payload = {
    sub: userId,
    role: role,
    courierId: courierId || null
  };

  return jwt.sign(payload, config.jwtSecret, {
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
    expiresIn: '12h'
  });
}

module.exports = {
  ROLES,
  socketAuthMiddleware,
  issueToken
};

