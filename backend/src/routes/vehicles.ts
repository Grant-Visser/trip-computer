import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { getDb } from '../db/database';
import type { Vehicle, CreateVehicleDto, Fillup, FillupStats, ImportFillupRow } from '@trip-computer/shared';

const router = Router();

function computeTankMethodEfficiency(fillups: Fillup[]): Map<number, number | null> {
  const effMap = new Map<number, number | null>();
  for (let i = 0; i < fillups.length; i++) {
    const current = fillups[i];
    const prev = i > 0 ? fillups[i - 1] : null;

    if (!prev) {
      effMap.set(current.id, null);
      continue;
    }

    // Consistent policy: any interval involving a partial fill does not get an efficiency value.
    if (current.is_partial || prev.is_partial) {
      effMap.set(current.id, null);
      continue;
    }

    const fuelUsedLitres = prev.litres_added;
    let distanceKm: number | null = null;
    if (
      current.odometer != null &&
      prev.odometer != null &&
      current.odometer > prev.odometer
    ) {
      distanceKm = current.odometer - prev.odometer;
    } else if (current.trip_km != null && current.trip_km > 0) {
      distanceKm = current.trip_km;
    }

    if (fuelUsedLitres > 0 && distanceKm != null && distanceKm > 0) {
      effMap.set(current.id, (fuelUsedLitres / distanceKm) * 100);
    } else {
      effMap.set(current.id, null);
    }
  }

  return effMap;
}

// GET /api/vehicles
router.get('/', (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const vehicles = db.prepare('SELECT * FROM vehicles ORDER BY created_at DESC').all() as Vehicle[];
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

// POST /api/vehicles
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('name is required'),
    body('year').optional().isInt({ min: 1900, max: 2100 }),
    body('tank_capacity_litres').optional().isFloat({ min: 0 }),
  ],
  (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const db = getDb();
      const dto = req.body as CreateVehicleDto;
      const now = new Date().toISOString().replace('Z', '+00:00');
      const stmt = db.prepare(`
        INSERT INTO vehicles (name, make, model, year, registration, tank_capacity_litres, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(dto.name, dto.make ?? null, dto.model ?? null, dto.year ?? null, dto.registration ?? null, dto.tank_capacity_litres ?? null, now);
      const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(result.lastInsertRowid) as Vehicle;
      res.status(201).json(vehicle);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create vehicle' });
    }
  }
);

// GET /api/vehicles/:id
router.get('/:id', param('id').isInt(), (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const db = getDb();
    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params['id']) as Vehicle | undefined;
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vehicle' });
  }
});

// PUT /api/vehicles/:id
router.put(
  '/:id',
  [
    param('id').isInt(),
    body('name').optional().notEmpty(),
    body('year').optional().isInt({ min: 1900, max: 2100 }),
    body('tank_capacity_litres').optional().isFloat({ min: 0 }),
  ],
  (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const db = getDb();
      const existing = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params['id']) as Vehicle | undefined;
      if (!existing) return res.status(404).json({ error: 'Vehicle not found' });

      const dto = req.body as Partial<CreateVehicleDto>;
      const updated = { ...existing, ...dto };
      db.prepare(`
        UPDATE vehicles SET name=?, make=?, model=?, year=?, registration=?, tank_capacity_litres=? WHERE id=?
      `).run(updated.name, updated.make ?? null, updated.model ?? null, updated.year ?? null, updated.registration ?? null, updated.tank_capacity_litres ?? null, req.params['id']);

      const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params['id']) as Vehicle;
      res.json(vehicle);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update vehicle' });
    }
  }
);

// DELETE /api/vehicles/:id
router.delete('/:id', param('id').isInt(), (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM vehicles WHERE id = ?').run(req.params['id']);
    if (result.changes === 0) return res.status(404).json({ error: 'Vehicle not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
});

// GET /api/vehicles/:id/fillups
router.get('/:id/fillups', param('id').isInt(), (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const db = getDb();
    const vehicle = db.prepare('SELECT id FROM vehicles WHERE id = ?').get(req.params['id']);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const fillups = db.prepare('SELECT * FROM fillups WHERE vehicle_id = ? ORDER BY filled_at DESC').all(req.params['id']) as Fillup[];
    res.json(fillups);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch fill-ups' });
  }
});

// POST /api/vehicles/:id/fillups
router.post(
  '/:id/fillups',
  [
    param('id').isInt(),
    body('filled_at').notEmpty().withMessage('filled_at is required'),
    body('litres_added').isFloat({ min: 0.1 }).withMessage('litres_added must be positive'),
    body('price_per_litre').isFloat({ min: 0 }),
    body('total_price').isFloat({ min: 0 }),
    body('trip_km').optional().isFloat({ min: 0 }),
    body('odometer').optional().isFloat({ min: 0 }),
    body('is_partial').optional().isBoolean(),
  ],
  (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const db = getDb();
      const vehicle = db.prepare('SELECT id FROM vehicles WHERE id = ?').get(req.params['id']);
      if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

      const dto = req.body;
      const now = new Date().toISOString().replace('Z', '+00:00');
      const stmt = db.prepare(`
        INSERT INTO fillups (vehicle_id, filled_at, litres_added, price_per_litre, total_price, trip_km, odometer, location_name, latitude, longitude, notes, is_partial, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        req.params['id'], dto.filled_at, dto.litres_added, dto.price_per_litre, dto.total_price,
        dto.trip_km ?? null, dto.odometer ?? null, dto.location_name ?? null,
        dto.latitude ?? null, dto.longitude ?? null, dto.notes ?? null, dto.is_partial ? 1 : 0, now
      );
      const fillup = db.prepare('SELECT * FROM fillups WHERE id = ?').get(result.lastInsertRowid) as Fillup;
      res.status(201).json(fillup);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create fill-up' });
    }
  }
);

// GET /api/vehicles/:id/stats
router.get('/:id/stats', param('id').isInt(), (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const db = getDb();
    const vehicle = db.prepare('SELECT id FROM vehicles WHERE id = ?').get(req.params['id']);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const fillups = db.prepare('SELECT * FROM fillups WHERE vehicle_id = ? ORDER BY filled_at ASC').all(req.params['id']) as Fillup[];
    const nonPartialFillups = fillups.filter(f => !f.is_partial);

    const total_fillups = fillups.length;
    const total_litres = fillups.reduce((sum, f) => sum + f.litres_added, 0);
    const total_spent_zar = fillups.reduce((sum, f) => sum + f.total_price, 0);
    const total_km = fillups.reduce((sum, f) => sum + (f.trip_km ?? 0), 0);
    const effMap = computeTankMethodEfficiency(fillups);

    const validEfficiencies = Array.from(effMap.values()).filter((v): v is number => v !== null);
    const avg_efficiency_l_per_100km = validEfficiencies.length > 0
      ? validEfficiencies.reduce((a, b) => a + b, 0) / validEfficiencies.length
      : 0;

    const total_spent_zar_non_partial = nonPartialFillups.reduce((sum, f) => sum + f.total_price, 0);
    const total_km_non_partial = nonPartialFillups.reduce((sum, f) => sum + (f.trip_km ?? 0), 0);
    const avg_cost_per_km = total_km_non_partial > 0 ? total_spent_zar_non_partial / total_km_non_partial : 0;

    const avg_price_per_litre = nonPartialFillups.length > 0
      ? nonPartialFillups.reduce((sum, f) => sum + f.price_per_litre, 0) / nonPartialFillups.length
      : 0;

    const odoFillups = fillups.filter(f => f.odometer != null);
    const last_odometer = odoFillups.length > 0 ? odoFillups[odoFillups.length - 1].odometer! : 0;

    const recent_fillups = [...fillups].reverse().slice(0, 10).map(f => ({
      ...f,
      computed_efficiency: effMap.get(f.id) ?? null,
    }));

    // Compute records
    const fullFillupsWithEff = fillups.filter(f => !f.is_partial && effMap.get(f.id) != null);
    let best_efficiency_l_per_100km: number | null = null;
    let worst_efficiency_l_per_100km: number | null = null;
    let best_efficiency_date: string | null = null;
    if (fullFillupsWithEff.length > 0) {
      const effWithVal = fullFillupsWithEff.map(f => ({ val: effMap.get(f.id)!, date: f.filled_at }));
      const bestEff = effWithVal.reduce((a, b) => b.val < a.val ? b : a);
      const worstEff = effWithVal.reduce((a, b) => b.val > a.val ? b : a);
      best_efficiency_l_per_100km = bestEff.val;
      best_efficiency_date = bestEff.date;
      worst_efficiency_l_per_100km = worstEff.val;
    }

    let best_trip_km: number | null = null;
    let best_trip_date: string | null = null;
    const tripFillups = fillups.filter(f => f.trip_km && f.trip_km > 0);
    if (tripFillups.length > 0) {
      const best = tripFillups.reduce((a, b) => (b.trip_km! > a.trip_km! ? b : a));
      best_trip_km = best.trip_km!;
      best_trip_date = best.filled_at;
    }

    let lowest_price_per_litre: number | null = null;
    let highest_price_per_litre: number | null = null;
    let lowest_price_date: string | null = null;
    let highest_price_date: string | null = null;
    if (fillups.length > 0) {
      const cheapest = fillups.reduce((a, b) => b.price_per_litre < a.price_per_litre ? b : a);
      const priciest = fillups.reduce((a, b) => b.price_per_litre > a.price_per_litre ? b : a);
      lowest_price_per_litre = cheapest.price_per_litre;
      lowest_price_date = cheapest.filled_at;
      highest_price_per_litre = priciest.price_per_litre;
      highest_price_date = priciest.filled_at;
    }

    let lowest_total_cost: number | null = null;
    let highest_total_cost: number | null = null;
    if (nonPartialFillups.length > 0) {
      lowest_total_cost = nonPartialFillups.reduce((a, b) => b.total_price < a.total_price ? b : a).total_price;
      highest_total_cost = nonPartialFillups.reduce((a, b) => b.total_price > a.total_price ? b : a).total_price;
    }

    const stats: FillupStats = {
      vehicle_id: parseInt(req.params['id']),
      total_fillups,
      total_litres,
      total_spent_zar,
      total_km,
      avg_efficiency_l_per_100km,
      avg_cost_per_km,
      avg_price_per_litre,
      last_odometer,
      recent_fillups,
      best_efficiency_l_per_100km,
      worst_efficiency_l_per_100km,
      best_trip_km,
      lowest_price_per_litre,
      highest_price_per_litre,
      lowest_total_cost,
      highest_total_cost,
      best_efficiency_date,
      best_trip_date,
      lowest_price_date,
      highest_price_date,
    };

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute stats' });
  }
});

// POST /api/vehicles/:id/import
router.post('/:id/import', param('id').isInt(), (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const db = getDb();
    const vehicle = db.prepare('SELECT id FROM vehicles WHERE id = ?').get(req.params['id']);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const { rows } = req.body as { rows: ImportFillupRow[] };
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'rows array is required' });
    }

    const stmt = db.prepare(`
      INSERT INTO fillups (vehicle_id, filled_at, litres_added, price_per_litre, total_price, trip_km, odometer, is_partial, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString().replace('Z', '+00:00');
    const insertMany = db.transaction((rows: ImportFillupRow[]) => {
      for (const row of rows) {
        // Normalise date: YYYY/MM/DD or YYYY-MM-DD → ISO8601 with +02:00
        const dateStr = row.date.replace(/\//g, '-');
        const filled_at = `${dateStr}T00:00:00+02:00`;
        stmt.run(req.params['id'], filled_at, row.litres, row.price_per_litre, row.total_price, row.trip_km ?? null, row.odometer ?? null, row.is_partial ? 1 : 0, now);
      }
    });

    insertMany(rows);
    res.status(201).json({ imported: rows.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to import fill-ups' });
  }
});

export default router;
