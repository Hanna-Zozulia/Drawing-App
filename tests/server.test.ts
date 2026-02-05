/** @jest-environment node */

import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

import request from 'supertest';
import app from '../src/server';
import fs from 'fs';
import path from 'path';

const IMG_DIR = path.join(__dirname, '..', 'img');
const ROOT_DIR = path.join(__dirname, '..');

const MOCK_IMAGE_DATA =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const MOCK_IMAGE_BUFFER = Buffer.from(
  MOCK_IMAGE_DATA.replace(/^data:image\/png;base64,/, ''),
  'base64'
);

describe('Image Gallery API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    if (fs.existsSync(IMG_DIR)) {
      fs.rmSync(IMG_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(IMG_DIR, { recursive: true });
  });

  afterAll(() => {
    if (fs.existsSync(IMG_DIR)) {
      fs.rmSync(IMG_DIR, { recursive: true, force: true });
    }
  });

  // ======================
  // POST /save (create)
  // ======================
  describe('POST /save - Create', () => {
    it('creates a new image and metadata', async () => {
      const res = await request(app)
        .post('/save')
        .send({ name: 'My Test Image', price: '100', image: MOCK_IMAGE_DATA });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Image saved successfully');
      expect(res.body.title).toBe('My Test Image');
      expect(res.body.price).toBe('100 €');

      const filename = res.body.filename;
      expect(filename).toMatch(/^My_Test_Image-\d+\.png$/);

      const imagePath = path.join(IMG_DIR, filename);
      expect(fs.existsSync(imagePath)).toBe(true);
      expect(fs.readFileSync(imagePath)).toEqual(MOCK_IMAGE_BUFFER);

      const meta = JSON.parse(
        fs.readFileSync(path.join(IMG_DIR, 'meta.json'), 'utf8')
      );
      expect(meta[filename]).toEqual({ name: 'My Test Image', price: '100' });
    });

    it('returns 400 if name is missing', async () => {
      const res = await request(app)
        .post('/save')
        .send({ price: '100', image: MOCK_IMAGE_DATA });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Name is required');
    });
  });

  // ======================
  // POST /save (update)
  // ======================
  describe('POST /save - Update', () => {
    let filename: string;

    beforeEach(() => {
      filename = `image-${Date.now()}.png`;
      fs.writeFileSync(path.join(IMG_DIR, filename), 'old-data');
      fs.writeFileSync(
        path.join(IMG_DIR, 'meta.json'),
        JSON.stringify({ [filename]: { name: 'Old', price: '10' } })
      );
    });

    it('updates existing image and metadata', async () => {
      const res = await request(app)
        .post('/save')
        .send({
          name: 'Updated',
          price: '200 €',
          image: MOCK_IMAGE_DATA,
          filename,
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Image updated successfully');
      expect(res.body.price).toBe('200 €');

      const meta = JSON.parse(
        fs.readFileSync(path.join(IMG_DIR, 'meta.json'), 'utf8')
      );
      expect(meta[filename]).toEqual({ name: 'Updated', price: '200' });

      expect(fs.readFileSync(path.join(IMG_DIR, filename))).toEqual(
        MOCK_IMAGE_BUFFER
      );
    });
  });

  // ======================
  // GET /images
  // ======================
  describe('GET /images', () => {
    it('returns list of images with metadata', async () => {
      fs.writeFileSync(
        path.join(IMG_DIR, 'meta.json'),
        JSON.stringify({
          'a-1.png': { name: 'A', price: '10' },
          'b-2.png': { name: 'B', price: '20' },
        })
      );
      fs.writeFileSync(path.join(IMG_DIR, 'a-1.png'), 'x');
      fs.writeFileSync(path.join(IMG_DIR, 'b-2.png'), 'y');

      const res = await request(app).get('/images');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.arrayContaining([
          { filename: 'a-1.png', title: 'A', price: '10 €' },
          { filename: 'b-2.png', title: 'B', price: '20 €' },
        ])
      );
    });
  });

  // ======================
  // DELETE /images/:filename
  // ======================
  describe('DELETE /images/:filename', () => {
    it('deletes image and metadata', async () => {
      const filename = 'delete-me.png';
      fs.writeFileSync(path.join(IMG_DIR, filename), 'data');
      fs.writeFileSync(
        path.join(IMG_DIR, 'meta.json'),
        JSON.stringify({ [filename]: { name: 'X', price: '1' } })
      );

      const res = await request(app).delete(`/images/${filename}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Image deleted successfully');
      expect(fs.existsSync(path.join(IMG_DIR, filename))).toBe(false);
    });

    it('returns 500 if file does not exist', async () => {
      const res = await request(app).delete('/images/nope.png');
      expect(res.status).toBe(500);
    });
  });

  // ======================
  // DELETE /images
  // ======================
  describe('DELETE /images', () => {
    it('deletes all images and metadata', async () => {
      fs.writeFileSync(path.join(IMG_DIR, 'a.png'), '1');
      fs.writeFileSync(path.join(IMG_DIR, 'b.png'), '2');
      fs.writeFileSync(path.join(IMG_DIR, 'meta.json'), '{}');

      const res = await request(app).delete('/images');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('All images deleted successfully');
      expect(fs.readdirSync(IMG_DIR)).toHaveLength(0);
    });
  });

  // ======================
  // SECURITY
  // ======================
  describe('Security - Path Traversal', () => {
    it('blocks traversal via URL normalization (404)', async () => {
      const target = path.join(ROOT_DIR, 'package.json');
      expect(fs.existsSync(target)).toBe(true);

      const res = await request(app).delete('/images/../../package.json');

      expect(res.status).toBe(404);
      expect(fs.existsSync(target)).toBe(true);
    });

    it('blocks encoded traversal with 403', async () => {
      const target = path.join(ROOT_DIR, 'package.json');
      expect(fs.existsSync(target)).toBe(true);

      const res = await request(app).delete(
        '/images/..%2F..%2Fpackage.json'
      );

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden');
      expect(fs.existsSync(target)).toBe(true);
    });
  });
});