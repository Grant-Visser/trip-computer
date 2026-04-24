import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { getDb } from '../db/database';

const router = Router();

// GET /api/state
router.get('/', (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const row = db.prepare("SELECT value FROM app_state WHERE key = 'selected_vehicle_id'").get() as { value: string | null } | undefined;
    const selected_vehicle_id = row?.value ? parseInt(row.value) : null;
    res.json({ selected_vehicle_id: Number.isNaN(selected_vehicle_id) ? null : selected_vehicle_id });
  } catch {
    res.status(500).json({ error: 'Failed to fetch app state' });
  }
});

// PUT /api/state
router.put(
  '/',
  body('selected_vehicle_id').custom((value) => value === null || (Number.isInteger(value) && value > 0)),
  (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const db = getDb();
      const selectedVehicleId = req.body.selected_vehicle_id as number | null;

      if (selectedVehicleId !== null) {
        const vehicle = db.prepare('SELECT id FROM vehicles WHERE id = ?').get(selectedVehicleId);
        if (!vehicle) {
          return res.status(400).json({ error: 'selected_vehicle_id does not exist' });
        }
      }

      db.prepare(`
        INSERT INTO app_state (key, value, updated_at)
        VALUES ('selected_vehicle_id', ?, strftime('%Y-%m-%dT%H:%M:%S+00:00', 'now'))
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
      `).run(selectedVehicleId === null ? null : String(selectedVehicleId));

      res.json({ selected_vehicle_id: selectedVehicleId });
    } catch {
      res.status(500).json({ error: 'Failed to update app state' });
    }
  }
);

export default router;
