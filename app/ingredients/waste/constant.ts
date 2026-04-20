// waste-constants.ts

export const WASTE_ROLES = ['admin', 'warehouse'] as const;

export type WasteCategory =
  | 'expired'      // Kadaluarsa
  | 'spoiled'      // Busuk / rusak alami
  | 'contaminated' // Terkontaminasi (jatuh, kena bahan lain)
  | 'overcooked'   // Gosong / salah masak
  | 'spilled'      // Tumpah
  | 'other';       // Lainnya

export const WASTE_CATEGORY_LABELS: Record<WasteCategory, string> = {
  expired: 'Kadaluarsa',
  spoiled: 'Busuk / Rusak',
  contaminated: 'Terkontaminasi',
  overcooked: 'Gosong / Salah Masak',
  spilled: 'Tumpah',
  other: 'Lainnya',
};