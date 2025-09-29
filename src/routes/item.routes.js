import { Router } from 'express';
import Item from '../models/Item.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import multer from 'multer';
import XLSX from 'xlsx';
import path from 'path';

const router = Router();

// Configure multer for file uploads
const upload = multer({ 
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.get('/', async (_req, res) => {
	const list = await Item.find().sort({ createdAt: -1 });
	res.json(list);
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
	const doc = await Item.create(req.body);
	res.status(201).json(doc);
});

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
	const doc = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true });
	res.json(doc);
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
	await Item.findByIdAndDelete(req.params.id);
	res.json({ ok: true });
});

// Download sample Excel template
router.get('/template', (req, res) => {
	const sampleData = [
		{
			'Competition Name': 'Reading (Eng)',
			'Category': 'Sub-Junior',
			'Type': 'Single',
			'Stage Type': 'Off-stage',
			'Date': '25-09-2025'
		},
		{
			'Competition Name': 'Story Writing (Mal)',
			'Category': 'Sub-Junior',
			'Type': 'Single',
			'Stage Type': 'Off-stage',
			'Date': '25-09-2025'
		},
		{
			'Competition Name': 'Math Talent',
			'Category': 'Junior',
			'Type': 'Single',
			'Stage Type': 'Off-stage',
			'Date': '25-09-2025'
		}
	];

	const ws = XLSX.utils.json_to_sheet(sampleData);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'Competitions');

	const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
	
	res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
	res.setHeader('Content-Disposition', 'attachment; filename="competition_template.xlsx"');
	res.send(buffer);
});

// Test upload endpoint
router.post('/upload-test', (req, res) => {
	res.json({ message: 'Upload endpoint is working' });
});

// Upload Excel file and create competitions
router.post('/upload', requireAuth, requireAdmin, upload.single('file'), async (req, res) => {
	try {
		console.log('Upload request received:', req.file ? 'File present' : 'No file');
		console.log('Request body:', req.body);
		
		if (!req.file) {
			console.log('No file in request');
			return res.status(400).json({ error: 'No file uploaded' });
		}

		// Parse Excel file
		console.log('Parsing Excel file...');
		const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
		const sheetName = workbook.SheetNames[0];
		const worksheet = workbook.Sheets[sheetName];
		const data = XLSX.utils.sheet_to_json(worksheet);
		console.log('Excel data parsed:', data.length, 'rows');

		// Validate required fields
		const requiredFields = ['Competition Name', 'Category', 'Type', 'Stage Type', 'Date'];
		const errors = [];

		data.forEach((row, index) => {
			requiredFields.forEach(field => {
				if (!row[field]) {
					errors.push(`Row ${index + 2}: Missing required field "${field}"`);
				}
			});

		// Validate Category (allow any non-empty string from Excel)
		if (!row['Category'] || String(row['Category']).trim() === '') {
			errors.push(`Row ${index + 2}: Missing category`);
		}

			// Validate Type
			if (row['Type'] && !['solo', 'group', 'Single', 'Group'].includes(row['Type'])) {
				errors.push(`Row ${index + 2}: Invalid type. Must be solo, group, Single, or Group`);
			}

			// Validate Stage Type
			if (row['Stage Type'] && !['Stage', 'Off-stage'].includes(row['Stage Type'])) {
				errors.push(`Row ${index + 2}: Invalid stage type. Must be Stage or Off-stage`);
			}

			// Validate Date format (accept both DD-MM-YYYY and YYYY-MM-DD)
			if (row['Date']) {
				const dateStr = row['Date'].toString();
				const ddmmyyyyPattern = /^\d{2}-\d{2}-\d{4}$/;
				const yyyymmddPattern = /^\d{4}-\d{2}-\d{2}$/;
				
				if (!ddmmyyyyPattern.test(dateStr) && !yyyymmddPattern.test(dateStr) && isNaN(Date.parse(row['Date']))) {
					errors.push(`Row ${index + 2}: Invalid date format. Use DD-MM-YYYY or YYYY-MM-DD`);
				}
			}
		});

		if (errors.length > 0) {
			return res.status(400).json({ 
				error: 'Validation errors', 
				details: errors 
			});
		}

		// Create competition entries
		const competitions = data.map(row => {
			// Convert date format from DD-MM-YYYY to YYYY-MM-DD if needed
			let dateValue = row['Date'];
			if (typeof dateValue === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(dateValue)) {
				const [day, month, year] = dateValue.split('-');
				dateValue = `${year}-${month}-${day}`;
			}

			// Map type values
			let typeValue = row['Type'];
			if (typeValue === 'Single') typeValue = 'solo';
			if (typeValue === 'Group') typeValue = 'group';

			return {
				name: row['Competition Name'],
				category: String(row['Category']).trim(),
				type: typeValue,
				stage: row['Stage Type'], // Using Stage Type as stage field
				stageType: row['Stage Type'],
				date: new Date(dateValue),
				time: row['Time'] || '', // Make time optional
				description: row['Description'] || '',
				rules: row['Rules'] || '',
				prizes: row['Prizes'] || ''
			};
		});

		// Insert competitions into database
		const createdCompetitions = await Item.insertMany(competitions);

		res.json({
			message: `Successfully created ${createdCompetitions.length} competitions`,
			competitions: createdCompetitions
		});

	} catch (error) {
		console.error('Error processing Excel file:', error);
		res.status(500).json({ error: 'Error processing Excel file' });
	}
});

export default router;
