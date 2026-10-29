import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Team from '../models/Team.js';
import Score from '../models/Score.js';
import Item from '../models/Item.js';
import News from '../models/News.js';
import GalleryItem from '../models/GalleryItem.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import xlsx from 'xlsx';

const router = Router();
const uploadRoot = path.join(process.cwd(), 'uploads');
fs.mkdirSync(uploadRoot, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => cb(null, Date.now() + '_' + Math.round(Math.random() * 1e9) + path.extname(file.originalname)),
});
const upload = multer({ storage });

let cachedYears = null;
let lastYearsFetch = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

router.get('/years', async (req, res) => {
	try {
		const now = Date.now();
		if (!req.query.refresh && cachedYears && (now - lastYearsFetch) < CACHE_TTL_MS) {
			return res.json(cachedYears);
		}
		const [teamYears, scoreYears, itemYears, newsYears, galleryYears] = await Promise.all([
			Team.distinct('year').catch(() => []),
			Score.distinct('year').catch(() => []),
			Item.distinct('year').catch(() => []),
			News.distinct('year').catch(() => []),
			GalleryItem.distinct('year').catch(() => [])
		]);
		const currentYear = new Date().getFullYear();
		const allYears = Array.from(new Set([
			...teamYears, ...scoreYears, ...itemYears, ...newsYears, ...galleryYears, 2026, 2025, currentYear
		]))
			.filter(Boolean)
			.map(Number)
			.sort((a, b) => b - a);
		cachedYears = allYears;
		lastYearsFetch = now;
		res.json(allYears);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

router.get('/', async (req, res) => {
	const filter = {};
	if (req.query.year) {
		filter.year = Number(req.query.year);
	}
	const teams = await Team.find(filter).sort({ createdAt: -1 });
	res.json(teams);
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
	const payload = { ...req.body };
	if (payload.year) {
		payload.year = Number(payload.year);
	}
	const team = await Team.create(payload);
	res.status(201).json(team);
});

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
	const team = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true });
	res.json(team);
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
	await Team.findByIdAndDelete(req.params.id);
	res.json({ ok: true });
});

// Upload members Excel for a team
router.post('/:id/members-upload', requireAuth, requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File is required' });
  const filePath = path.join(uploadRoot, req.file.filename);
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    
    console.log('Excel rows:', rows);
    console.log('First row keys:', Object.keys(rows[0] || {}));
    
    // Try to find the correct column names by checking all possible variations
    const firstRow = rows[0] || {};
    const allKeys = Object.keys(firstRow);
    console.log('All available keys:', allKeys);
    
    // Find the correct column names
    const nameKey = allKeys.find(key => 
      key.toLowerCase().includes('name') && !key.toLowerCase().includes('category')
    ) || 'Name';
    const categoryKey = allKeys.find(key => 
      key.toLowerCase().includes('category')
    ) || 'Category';
    const chestKey = allKeys.find(key => 
      key.toLowerCase().includes('chest') || key.toLowerCase().includes('number')
    ) || 'Chest Number';
    
    console.log('Detected column names:', { nameKey, categoryKey, chestKey });
    
    // Normalize category and build participants
    const normalizeCategory = (raw) => {
      const v = (raw || '').toString().trim().toLowerCase().replace(/[\s_]+/g, '-');
      if (v === 'super-senior' || v === 'supersenior') return 'Super-Senior';
      if (v === 'senior') return 'Senior';
      if (v === 'junior') return 'Junior';
      return (raw || '').toString().trim();
    };

    // Expect columns: Name, Category, Chest Number
    const participants = rows
      .map((r) => {
        // Use the detected column names
        const participant = {
          name: (r[nameKey] || '').toString().trim(),
          category: normalizeCategory(r[categoryKey]),
          chestNumber: (r[chestKey] || '').toString().trim(),
        };
        console.log('Mapped participant:', participant);
        return participant;
      })
      .filter((p) => {
        const isValid = p.name && ['Super-Senior','Senior','Junior'].includes(p.category);
        console.log('Participant valid:', p, isValid);
        return isValid;
      });

    console.log('Final participants:', participants);

    const team = await Team.findByIdAndUpdate(
      req.params.id,
      { membersFileUrl: `/uploads/${req.file.filename}`, participants },
      { new: true }
    );
    
    console.log('Updated team:', team);
    res.json(team);
  } catch (e) {
    console.error('Excel parse error', e);
    res.status(400).json({ error: 'Invalid Excel format. Expected columns: Name, Category, Chest Number' });
  }
});

// Get participants by team and optional category
router.get('/:id/participants', async (req, res) => {
  const { category } = req.query;
  console.log('Getting participants for team:', req.params.id, 'category:', category);
  const team = await Team.findById(req.params.id);
  if (!team) {
    console.log('Team not found');
    return res.status(404).json({ error: 'Team not found' });
  }
  console.log('Team found:', team.name, 'participants:', team.participants);
  let list = team.participants || [];
  if (category && category !== 'All') {
    list = list.filter((p) => p.category === category);
    console.log('Filtered participants for category', category, ':', list);
  }
  res.json(list);
});

export default router;
