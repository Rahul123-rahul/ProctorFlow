import { getDb } from '@/db/database';
import type { Client } from '@/db/types';

export interface ClientInput {
  name: string;
  rate_per_proctor: number;
  notes?: string | null;
  logo_url?: string | null;
}

export async function listClients(): Promise<Client[]> {
  const db = await getDb();
  return db.getAllAsync<Client>(`SELECT * FROM clients ORDER BY name COLLATE NOCASE`);
}

export async function getClient(id: number): Promise<Client | null> {
  const db = await getDb();
  return db.getFirstAsync<Client>(`SELECT * FROM clients WHERE id = ?`, id);
}

export async function createClient(input: ClientInput): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO clients (name, rate_per_proctor, notes, logo_url) VALUES (?, ?, ?, ?)`,
    input.name.trim(),
    input.rate_per_proctor,
    input.notes?.trim() || null,
    input.logo_url?.trim() || null
  );
  return result.lastInsertRowId;
}

export async function updateClient(id: number, input: ClientInput): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE clients SET name = ?, rate_per_proctor = ?, notes = ?, logo_url = ? WHERE id = ?`,
    input.name.trim(),
    input.rate_per_proctor,
    input.notes?.trim() || null,
    input.logo_url?.trim() || null,
    id
  );
}