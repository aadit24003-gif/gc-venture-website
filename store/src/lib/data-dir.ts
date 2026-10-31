import os from 'node:os';
import path from 'node:path';

/**
 * Where local development data lives (PGlite database, uploaded files) when no
 * cloud services are configured. Kept outside the project folder so the dev
 * server's file watcher doesn't reload on every database write. Override with DATA_DIR.
 */
export const dataDir = () => process.env.DATA_DIR ?? path.join(os.homedir(), '.refurb-store');
