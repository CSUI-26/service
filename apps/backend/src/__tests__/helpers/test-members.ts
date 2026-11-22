import { db } from '../../db/client.js';
import { members, programs } from '../../db/schema.js';

const DEFAULT_FOTO = {
  url: '',
  config: { x: 50, y: 50, zoom: 1, aspect: '1:1' },
};

export async function ensureTestMembers(): Promise<void> {
  const existingPrograms = await db.select({ id: programs.id }).from(programs).limit(1);
  const programId = existingPrograms[0]?.id ?? 'ilmu-komputer';

  await db
    .insert(members)
    .values([
      {
        npm: '2606888572',
        email: 'admin.test@example.com',
        name: 'Admin Test',
        namaPanggilan: 'Admin',
        programId,
        foto: DEFAULT_FOTO,
        role: 'admin',
      },
      {
        npm: '2606990001',
        email: 'member.one@example.com',
        name: 'Member One',
        namaPanggilan: 'One',
        programId,
        foto: DEFAULT_FOTO,
        role: 'user',
      },
      {
        npm: '2606990002',
        email: 'member.two@example.com',
        name: 'Member Two',
        namaPanggilan: 'Two',
        programId,
        foto: DEFAULT_FOTO,
        role: 'user',
      },
    ])
    .onConflictDoNothing();
}
