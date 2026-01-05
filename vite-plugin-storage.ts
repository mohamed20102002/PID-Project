/**
 * Vite Plugin for Local File Storage
 *
 * Provides API endpoints for reading/writing diagram data to the project folder.
 * Data is stored in: ./data/systems/{systemKks}/diagram.json
 */

import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

const DATA_DIR = './data';
const SYSTEMS_DIR = './data/systems';
const PLANT_FILE = './data/plant.json';
const CUSTOM_SYMBOLS_FILE = './data/custom-symbols.json';

// Ensure directories exist
function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SYSTEMS_DIR)) {
    fs.mkdirSync(SYSTEMS_DIR, { recursive: true });
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

      console.log('[Storage Plugin] Initialized - Data will be saved to ./data/');
    }
  };
}

export default storagePlugin;
