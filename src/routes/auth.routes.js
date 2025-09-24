import { Router } from 'express';

const router = Router();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'thahbeeb@nsu.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Artsfest@2025';

router.post('/login', async (req, res) => {
	const { email, password } = req.body || {};
	if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
		return res.json({ success: true, user: { email: ADMIN_EMAIL, role: 'admin' } });
	}
	return res.status(401).json({ success: false, error: 'Invalid credentials' });
});

export default router;
