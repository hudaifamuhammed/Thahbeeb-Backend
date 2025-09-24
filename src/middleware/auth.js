import jwt from 'jsonwebtoken';

export function requireAuth(_req, _res, next) {
	next();
}

export function requireAdmin(_req, _res, next) {
	next();
}
