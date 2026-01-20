/**
 * Vite Plugin for Local File Storage
 *
 * Provides API endpoints for reading/writing diagram data to the project folder.
 * Data is stored in: ./data/systems/{systemKks}/diagram.json
 */

import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

const DATA_DIR = './data';
const SYSTEMS_DIR = './data/systems';
const REFERENCES_DIR = './data/references';
const KKS_REFERENCES_DIR = './data/references/kks';
const PLANT_FILE = './data/plant.json';
const CUSTOM_SYMBOLS_FILE = './data/custom-symbols.json';
const SETTINGS_FILE = './data/settings.json';
const KKS_ID_FILE = './data/references/kks/KKSID.xlsx';

// Ensure directories exist
function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SYSTEMS_DIR)) {
    fs.mkdirSync(SYSTEMS_DIR, { recursive: true });
  }
  if (!fs.existsSync(REFERENCES_DIR)) {
    fs.mkdirSync(REFERENCES_DIR, { recursive: true });
  }
  if (!fs.existsSync(KKS_REFERENCES_DIR)) {
    fs.mkdirSync(KKS_REFERENCES_DIR, { recursive: true });
  }
}

// Get system directory path
function getSystemDir(systemKks: string): string {
  // Sanitize systemKks to be safe for file system
  const safeKks = systemKks.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(SYSTEMS_DIR, safeKks);
}

// Get diagram file path
function getDiagramPath(systemKks: string): string {
  return path.join(getSystemDir(systemKks), 'diagram.json');
}

export function storagePlugin(): Plugin {
  return {
    name: 'vite-plugin-storage',
    configureServer(server) {
      ensureDirectories();

      // Save diagram for a system
      server.middlewares.use('/api/storage/diagram', async (req, res, next) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { systemKks, diagram } = JSON.parse(body);

              if (!systemKks || !diagram) {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: 'Missing systemKks or diagram' }));
                return;
              }

              const systemDir = getSystemDir(systemKks);
              if (!fs.existsSync(systemDir)) {
                fs.mkdirSync(systemDir, { recursive: true });
              }

              const diagramPath = getDiagramPath(systemKks);
              fs.writeFileSync(diagramPath, JSON.stringify(diagram, null, 2), 'utf-8');

              console.log(`[Storage] Saved diagram for system: ${systemKks}`);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, path: diagramPath }));
            } catch (error) {
              console.error('[Storage] Save error:', error);
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: String(error) }));
            }
          });
        } else if (req.method === 'GET') {
          try {
            const url = new URL(req.url || '', `http://${req.headers.host}`);
            const systemKks = url.searchParams.get('systemKks');

            if (!systemKks) {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: 'Missing systemKks' }));
              return;
            }

            const diagramPath = getDiagramPath(systemKks);

            if (fs.existsSync(diagramPath)) {
              const data = fs.readFileSync(diagramPath, 'utf-8');
              const diagram = JSON.parse(data);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, diagram }));
            } else {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'Diagram not found' }));
            }
          } catch (error) {
            console.error('[Storage] Load error:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: String(error) }));
          }
        } else {
          next();
        }
      });

      // Save plant data
      server.middlewares.use('/api/storage/plant', async (req, res, next) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { plant } = JSON.parse(body);

              if (!plant) {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: 'Missing plant data' }));
                return;
              }

              fs.writeFileSync(PLANT_FILE, JSON.stringify(plant, null, 2), 'utf-8');

              console.log('[Storage] Saved plant data');
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (error) {
              console.error('[Storage] Save plant error:', error);
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: String(error) }));
            }
          });
        } else if (req.method === 'GET') {
          try {
            if (fs.existsSync(PLANT_FILE)) {
              const data = fs.readFileSync(PLANT_FILE, 'utf-8');
              const plant = JSON.parse(data);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, plant }));
            } else {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'Plant not found' }));
            }
          } catch (error) {
            console.error('[Storage] Load plant error:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: String(error) }));
          }
        } else {
          next();
        }
      });

      // Custom symbols
      server.middlewares.use('/api/storage/custom-symbols', async (req, res, next) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { symbols } = JSON.parse(body);

              if (!symbols || !Array.isArray(symbols)) {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: 'Missing or invalid symbols array' }));
                return;
              }

              fs.writeFileSync(CUSTOM_SYMBOLS_FILE, JSON.stringify(symbols, null, 2), 'utf-8');

              console.log(`[Storage] Saved ${symbols.length} custom symbols`);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (error) {
              console.error('[Storage] Save custom symbols error:', error);
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: String(error) }));
            }
          });
        } else if (req.method === 'GET') {
          try {
            if (fs.existsSync(CUSTOM_SYMBOLS_FILE)) {
              const data = fs.readFileSync(CUSTOM_SYMBOLS_FILE, 'utf-8');
              const symbols = JSON.parse(data);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, symbols }));
            } else {
              // Graceful fallback - return empty array for fresh installs
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, symbols: [] }));
            }
          } catch (error) {
            console.error('[Storage] Load custom symbols error:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: String(error) }));
          }
        } else {
          next();
        }
      });

      // App Settings
      server.middlewares.use('/api/storage/settings', async (req, res, next) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { settings } = JSON.parse(body);

              if (!settings) {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: 'Missing settings data' }));
                return;
              }

              fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');

              console.log('[Storage] Saved app settings');
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (error) {
              console.error('[Storage] Save settings error:', error);
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: String(error) }));
            }
          });
        } else if (req.method === 'GET') {
          try {
            if (fs.existsSync(SETTINGS_FILE)) {
              const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
              const settings = JSON.parse(data);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, settings }));
            } else {
              // Graceful fallback - return null for fresh installs
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, settings: null }));
            }
          } catch (error) {
            console.error('[Storage] Load settings error:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: String(error) }));
          }
        } else {
          next();
        }
      });

      // List all systems
      server.middlewares.use('/api/storage/systems', async (req, res, next) => {
        if (req.method === 'GET') {
          try {
            if (!fs.existsSync(SYSTEMS_DIR)) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, systems: [] }));
              return;
            }

            const systems = fs.readdirSync(SYSTEMS_DIR)
              .filter(name => {
                const systemPath = path.join(SYSTEMS_DIR, name);
                return fs.statSync(systemPath).isDirectory() &&
                       fs.existsSync(path.join(systemPath, 'diagram.json'));
              });

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, systems }));
          } catch (error) {
            console.error('[Storage] List systems error:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: String(error) }));
          }
        } else {
          next();
        }
      });

      // Delete a system
      server.middlewares.use('/api/storage/delete', async (req, res, next) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { systemKks } = JSON.parse(body);

              if (!systemKks) {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: 'Missing systemKks' }));
                return;
              }

              const systemDir = getSystemDir(systemKks);
              if (fs.existsSync(systemDir)) {
                fs.rmSync(systemDir, { recursive: true });
                console.log(`[Storage] Deleted system: ${systemKks}`);
              }

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (error) {
              console.error('[Storage] Delete error:', error);
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: String(error) }));
            }
          });
        } else {
          next();
        }
      });

      // Rename system (move folder and update diagram)
      server.middlewares.use('/api/storage/rename-system', async (req, res, next) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { oldKks, newKks } = JSON.parse(body);
              console.log(`[Storage] Rename request: ${oldKks} -> ${newKks}`);

              if (!oldKks || !newKks) {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: 'Missing oldKks or newKks' }));
                return;
              }

              const oldDir = getSystemDir(oldKks);
              const newDir = getSystemDir(newKks);
              console.log(`[Storage] Old dir: ${oldDir} (exists: ${fs.existsSync(oldDir)})`);
              console.log(`[Storage] New dir: ${newDir} (exists: ${fs.existsSync(newDir)})`);

              // Check if old directory exists
              if (!fs.existsSync(oldDir)) {
                console.log(`[Storage] Old folder does not exist, returning success with message`);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, message: 'Old system folder does not exist' }));
                return;
              }

              // Check if new directory already exists
              if (fs.existsSync(newDir)) {
                console.log(`[Storage] New folder already exists, returning error`);
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: `System ${newKks} already exists` }));
                return;
              }

              // Rename the folder
              console.log(`[Storage] Renaming folder: ${oldDir} -> ${newDir}`);
              fs.renameSync(oldDir, newDir);

              // Update the diagram.json with new systemKks
              const diagramPath = path.join(newDir, 'diagram.json');
              if (fs.existsSync(diagramPath)) {
                console.log(`[Storage] Updating diagram.json with new systemKks`);
                const diagramData = JSON.parse(fs.readFileSync(diagramPath, 'utf-8'));
                diagramData.systemKks = newKks;
                // Also update any component systemKks references
                if (diagramData.components) {
                  Object.values(diagramData.components).forEach((comp: Record<string, unknown>) => {
                    if (comp.systemKks === oldKks) {
                      comp.systemKks = newKks;
                    }
                  });
                }
                fs.writeFileSync(diagramPath, JSON.stringify(diagramData, null, 2), 'utf-8');
              }

              console.log(`[Storage] Rename complete: ${oldKks} -> ${newKks}`);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (error) {
              console.error('[Storage] Rename system error:', error);
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: String(error) }));
            }
          });
        } else {
          next();
        }
      });

      // KKS References (Excel file)
      server.middlewares.use('/api/storage/references/kks', async (req, res, next) => {
        if (req.method === 'GET') {
          try {
            // Check if file exists
            if (!fs.existsSync(KKS_ID_FILE)) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: false,
                error: 'KKS reference file not found',
                fileExists: false,
                expectedPath: KKS_ID_FILE
              }));
              return;
            }

            // Read and parse Excel file
            const workbook = XLSX.readFile(KKS_ID_FILE);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Convert to JSON - assume first row is header
            const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { header: 1 });

            if (rawData.length < 2) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: false,
                error: 'Excel file is empty or has no data rows',
                fileExists: true
              }));
              return;
            }

            // Parse rows - first column is KKS, second is System Name, third is Segments
            const entries: Array<{ kks: string; systemName: string; segments?: string[] }> = [];
            for (let i = 1; i < rawData.length; i++) {
              const row = rawData[i] as unknown[];
              if (row && row.length >= 2) {
                const kks = String(row[0] || '').trim();
                const systemName = String(row[1] || '').trim();
                // Read column C for segments (comma-separated list)
                const segmentsStr = row.length >= 3 ? String(row[2] || '').trim() : '';

                if (kks) {
                  // Parse segments from comma-separated string
                  const segments = segmentsStr
                    ? segmentsStr.split(',').map(s => s.trim()).filter(Boolean)
                    : undefined;

                  entries.push({ kks, systemName, segments });
                }
              }
            }

            console.log(`[Storage] Loaded ${entries.length} KKS reference entries`);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              fileExists: true,
              entries,
              totalCount: entries.length
            }));
          } catch (error) {
            console.error('[Storage] Load KKS references error:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: String(error), fileExists: false }));
          }
        } else {
          next();
        }
      });

      console.log('[Storage Plugin] Initialized - Data will be saved to ./data/');
    }
  };
}

export default storagePlugin;
