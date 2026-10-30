import { Router } from 'express';
import mongoose from 'mongoose';
import Score from '../models/Score.js';
import Team from '../models/Team.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
    const { category, published, year } = req.query;
    const filter = {};
    if (year) filter.year = Number(year);
    if (category && category !== 'All') {
        if (category === 'Group') {
            filter.$or = [{ isGroupEvent: true }, { category: 'Group' }];
        } else {
            filter.category = category;
            filter.isGroupEvent = { $ne: true };
        }
    }
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
        if (v.includes('group')) return 'Group';
        return raw;
    };

    const rawPositions = Array.isArray(req.body.positions) ? req.body.positions : [];
    const positions = rawPositions
        .filter(p => p && p.teamId && mongoose.Types.ObjectId.isValid(p.teamId))
        .map(p => {
            const pNames = Array.isArray(p.participantNames) && p.participantNames.length > 0
                ? p.participantNames.filter(Boolean)
                : (p.participantName ? p.participantName.split(',').map(s => s.trim()).filter(Boolean) : []);
            const pNameStr = pNames.length > 0 ? pNames.join(', ') : (p.participantName || '');
            return {
                teamId: p.teamId,
                participantName: pNameStr,
                participantNames: pNames,
                position: Number(p.position) || 0,
                points: Number(p.points) || 0
            };
        });

    const totalPoints = positions.reduce((sum, pos) => sum + (Number(pos.points) || 0), 0);

    const payload = {
        ...req.body,
        year: req.body.year ? Number(req.body.year) : new Date().getFullYear(),
        positions,
        totalPoints
    };
    if (payload.isGroupEvent || payload.category === 'Group') {
        payload.isGroupEvent = true;
        payload.category = 'Group';
    } else {
        payload.isGroupEvent = false;
        payload.category = normalizeCategory(payload.category);
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
        if (v.includes('group')) return 'Group';
        return raw;
    };

    const rawPositions = Array.isArray(req.body.positions) ? req.body.positions : [];
    const positions = rawPositions
        .filter(p => p && p.teamId && mongoose.Types.ObjectId.isValid(p.teamId))
        .map(p => {
            const pNames = Array.isArray(p.participantNames) && p.participantNames.length > 0
                ? p.participantNames.filter(Boolean)
                : (p.participantName ? p.participantName.split(',').map(s => s.trim()).filter(Boolean) : []);
            const pNameStr = pNames.length > 0 ? pNames.join(', ') : (p.participantName || '');
            return {
                teamId: p.teamId,
                participantName: pNameStr,
                participantNames: pNames,
                position: Number(p.position) || 0,
                points: Number(p.points) || 0
            };
        });
    const totalPoints = positions.reduce((sum, pos) => sum + (Number(pos.points) || 0), 0);

    const update = {
        ...req.body,
        positions,
        totalPoints
    };
    if (update.isGroupEvent || update.category === 'Group') {
        update.isGroupEvent = true;
        update.category = 'Group';
    } else {
        update.isGroupEvent = false;
        update.category = normalizeCategory(update.category);
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
    const { category, year } = req.query;
    const match = {};
    if (year) match.year = Number(year);
    if (category && category !== 'All') {
        if (category === 'Group') {
            match.$or = [{ isGroupEvent: true }, { category: 'Group' }];
        } else {
            match.category = category;
            match.isGroupEvent = { $ne: true };
        }
    }
    
    // Initialize totals with all teams belonging to that year (so even 0-point teams show up)
    const teamFilter = year ? { year: Number(year) } : {};
    const teams = await Team.find(teamFilter);
    const teamTotals = {};

    teams.forEach(t => {
        const idStr = t._id.toString();
        teamTotals[idStr] = { teamId: idStr, teamName: t.name, totalPoints: 0, entries: 0 };
    });
    
    // Calculate team totals from positions
    const scores = await Score.find(match);
    
    scores.forEach(score => {
        if (score.positions && score.positions.length > 0) {
            score.positions.forEach(position => {
                if (position.teamId) {
                    const teamId = position.teamId.toString();
                    if (!teamTotals[teamId]) {
                        teamTotals[teamId] = { teamId, teamName: 'Unknown Team', totalPoints: 0, entries: 0 };
                    }
                    teamTotals[teamId].totalPoints += position.points || 0;
                    teamTotals[teamId].entries += 1;
                }
            });
        }
    });
    
    const totalsArray = Object.values(teamTotals).sort((a, b) => b.totalPoints - a.totalPoints);
    res.json(totalsArray);
});

// Separate totals for group events only
router.get('/totals/teams-group', async (req, res) => {
    const { year } = req.query;
    const match = { isGroupEvent: true };
    if (year) match.year = Number(year);

    const agg = await Score.aggregate([
        { $match: match },
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
