import { env } from '../config/env';
import { randomUUID } from 'crypto';

const GATEWAY = (env as any).CHAINPOINT_GATEWAY_URL as string | undefined;

export async function submitHash(hash: string): Promise<{ handle: string }> {
  if (!GATEWAY) {
    const handle = `stub-${randomUUID()}`;
    console.log(`[ANCHOR STUB] Would submit hash ${hash} → handle ${handle}`);
    return { handle };
  }

  const res = await fetch(`${GATEWAY}/v1/proofs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hash }),
  });

  if (!res.ok) throw new Error(`Chainpoint submitHash failed: ${res.status}`);
  const data = await res.json() as { proof_handles?: { uuid: string }[] };
  const uuid = data.proof_handles?.[0]?.uuid;
  if (!uuid) throw new Error('Chainpoint response missing proof_handles[0].uuid');
  return { handle: uuid };
}

export async function fetchProof(handle: string): Promise<{ status: 'pending' | 'confirmed'; proof?: string }> {
  if (!GATEWAY) {
    console.log(`[ANCHOR STUB] Would fetch proof for handle ${handle}`);
    return { status: 'pending' };
  }

  const res = await fetch(`${GATEWAY}/v1/proofs/${handle}`);
  if (!res.ok) throw new Error(`Chainpoint fetchProof failed: ${res.status}`);
  const data = await res.json() as { status?: string; proof?: unknown };

  if (data.status === 'confirmed' && data.proof) {
    return { status: 'confirmed', proof: JSON.stringify(data.proof) };
  }
  return { status: 'pending' };
}
