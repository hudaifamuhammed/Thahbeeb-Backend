import { Router } from 'express';
import mongoose from 'mongoose';
import Score from '../models/Score.js';
import Team from '../models/Team.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
    const { category, published } = req.query;
    const filter = {};
    if (category && category !== 'All') filter.category = category;
    if (typeof published !== 'undefined') {
        // Accept 'true'/'false' or boolean
        const publishedBool = published === true || published === 'true';
        filter.published = publishedBool;
    }
    const list = await Score.find(filter).sort({ createdAt: -1 });
    res.json(list);
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
    // Normalize category and ensure numeric points
    const normalizeCategory = (raw) => {
        const v = (raw || '').toString().trim().toLowerCase();
        if (!v) return '';
        if (v.includes('super') && v.includes('senior')) return 'Super-Senior';
        if (v.includes('general')) return 'General';
        if (v.includes('senior')) return 'Senior';
        if (v.includes('junior')) return 'Junior';
        return raw;
    };

    const rawPositions = Array.isArray(req.body.positions) ? req.body.positions : [];
    const positions = rawPositions
        .filter(p => p && p.teamId && mongoose.Types.ObjectId.isValid(p.teamId))
        .map(p => ({
            teamId: p.teamId,
            participantName: p.participantName,
            position: Number(p.position) || 0,
            points: Number(p.points) || 0
        }));

    const totalPoints = positions.reduce((sum, pos) => sum + (Number(pos.points) || 0), 0);

    const payload = {
        ...req.body,
        positions,
        totalPoints
    };
    if (!payload.isGroupEvent) {
        payload.category = normalizeCategory(payload.category);
    } else {
        payload.category = undefined;
    }

    const doc = await Score.create(payload);
    res.status(201).json(doc);
});

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
    const normalizeCategory = (raw) => {
        const v = (raw || '').toString().trim().toLowerCase();
        if (!v) return '';
        if (v.includes('super') && v.includes('senior')) return 'Super-Senior';
        if (v.includes('general')) return 'General';
        if (v.includes('senior')) return 'Senior';
        if (v.includes('junior')) return 'Junior';
        return raw;
    };

    const rawPositions = Array.isArray(req.body.positions) ? req.body.positions : [];
    const positions = rawPositions
        .filter(p => p && p.teamId && mongoose.Types.ObjectId.isValid(p.teamId))
        .map(p => ({
            teamId: p.teamId,
            participantName: p.participantName,
            position: Number(p.position) || 0,
            points: Number(p.points) || 0
        }));
    const totalPoints = positions.reduce((sum, pos) => sum + (Number(pos.points) || 0), 0);

    const update = {
        ...req.body,
        positions,
        totalPoints
    };
    if (!update.isGroupEvent) {
        update.category = normalizeCategory(update.category);
    } else {
        update.category = undefined;
    }

    const doc = await Score.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json(doc);
});

// Bulk publish/unpublish scores (e.g., publish all current draft scores)
router.post('/publish', requireAuth, requireAdmin, async (req, res) => {
    const { scoreIds, published } = req.body || {};
    const setPublished = typeof published === 'boolean' ? published : true;

    let result;
    if (Array.isArray(scoreIds) && scoreIds.length > 0) {
        result = await Score.updateMany({ _id: { $in: scoreIds } }, { $set: { published: setPublished } });
    } else {
        // If no IDs supplied, publish all scores that are currently not in desired state
        result = await Score.updateMany({ published: { $ne: setPublished } }, { $set: { published: setPublished } });
    }
    res.json({ ok: true, matched: result.matchedCount ?? result.nMatched, modified: result.modifiedCount ?? result.nModified, published: setPublished });
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
	await Score.findByIdAndDelete(req.params.id);
	res.json({ ok: true });
});

router.get('/totals/teams', async (req, res) => {
    const { category } = req.query;
    const match = {};
    if (category && category !== 'All') match.category = category;
    
    // Calculate team totals from positions
    const scores = await Score.find(match);
    const teamTotals = {};
    
    scores.forEach(score => {
        if (score.positions && score.positions.length > 0) {
            score.positions.forEach(position => {
                if (position.teamId) {
                    const teamId = position.teamId.toString();
                    if (!teamTotals[teamId]) {
                        teamTotals[teamId] = { teamId, totalPoints: 0, entries: 0 };
                    }
                    teamTotals[teamId].totalPoints += position.points || 0;
                    teamTotals[teamId].entries += 1;
                }
            });
        }
    });
    
    const totalsArray = Object.values(teamTotals).sort((a, b) => b.totalPoints - a.totalPoints);
    const withNames = await Promise.all(totalsArray.map(async (t) => {
        const team = await Team.findById(t.teamId);
        return { teamId: t.teamId, teamName: team?.name || 'Team Not Found', totalPoints: t.totalPoints, entries: t.entries };
    }));
    res.json(withNames);
});

// Separate totals for group events only
router.get('/totals/teams-group', async (_req, res) => {
    const agg = await Score.aggregate([
        { $match: { isGroupEvent: true } },
        { $group: { _id: '$teamId', totalPoints: { $sum: '$totalPoints' }, entries: { $sum: 1 } } },
        { $sort: { totalPoints: -1 } }
    ]);
    const withNames = await Promise.all(agg.map(async (t) => {
        const team = await Team.findById(t._id);
        return { teamId: t._id, teamName: team?.name || 'Team Not Found', totalPoints: t.totalPoints, entries: t.entries };
    }));
    res.json(withNames);
});

export default router;
