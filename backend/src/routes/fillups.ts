import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { getDb } from '../db/database';
import type { Fillup } from '@trip-computer/shared';

const router = Router();

// GET /api/fillups/:id
router.get('/:id', param('id').isInt(), (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const db = getDb();
    const fillup = db.prepare('SELECT * FROM fillups WHERE id = ?').get(req.params['id']) as Fillup | undefined;
    if (!fillup) return res.status(404).json({ error: 'Fill-up not found' });
    res.json(fillup);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch fill-up' });
  }
});

// PUT /api/fillups/:id
router.put(
  '/:id',
  [
    param('id').isInt(),
    body('litres_added').optional().isFloat({ min: 0.1 }),
    body('price_per_litre').optional().isFloat({ min: 0 }),
    body('total_price').optional().isFloat({ min: 0 }),
    body('trip_km').optional().isFloat({ min: 0 }),
    body('odometer').optional().isFloat({ min: 0 }),
    body('is_partial').optional().isBoolean(),
  ],
  (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const db = getDb();
      const existing = db.prepare('SELECT * FROM fillups WHERE id = ?').get(req.params['id']) as Fillup | undefined;
      if (!existing) return res.status(404).json({ error: 'Fill-up not found' });

      const dto = req.body;
      const updated = { ...existing, ...dto };
      db.prepare(`
        UPDATE fillups SET filled_at=?, litres_added=?, price_per_litre=?, total_price=?, trip_km=?, odometer=?, location_name=?, latitude=?, longitude=?, notes=?, is_partial=? WHERE id=?
      `).run(
        updated.filled_at,
        updated.litres_added,
        updated.price_per_litre,
        updated.total_price,
        updated.trip_km ?? null,
        updated.odometer ?? null,
        updated.location_name ?? null,
        updated.latitude ?? null,
        updated.longitude ?? null,
        updated.notes ?? null,
        updated.is_partial ? 1 : 0,
        req.params['id']
      );

      const fillup = db.prepare('SELECT * FROM fillups WHERE id = ?').get(req.params['id']) as Fillup;
      res.json(fillup);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update fill-up' });
    }
  }
);

// DELETE /api/fillups/:id
router.delete('/:id', param('id').isInt(), (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM fillups WHERE id = ?').run(req.params['id']);
    if (result.changes === 0) return res.status(404).json({ error: 'Fill-up not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete fill-up' });
  }
});

export default router;
