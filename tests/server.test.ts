// Polyfill for setImmediate in Jest/node (Express/serve-static/router use it)
if (typeof global.setImmediate === 'undefined') {
    const shim = (fn: (...args: any[]) => void, ...args: any[]) => setTimeout(fn, 0, ...args);
    // @ts-ignore
    shim.__promisify__ = function () {};
    // @ts-ignore
    global.setImmediate = shim;
}

import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

import request from 'supertest';
import app from '../src/server';
import fs from 'fs';
import path from 'path';


// A sample PNG image data in base64 format for testing uploads
const MOCK_IMAGE_DATA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const IMG_DIR = path.join(__dirname, '../img');

describe('Image Gallery API', () => {


    // Before each test, clean up the img directory
    beforeEach(() => {
        jest.clearAllMocks();
        if (fs.existsSync(IMG_DIR)) {
            fs.readdirSync(IMG_DIR).forEach(f => fs.unlinkSync(path.join(IMG_DIR, f)));
        } else {
            fs.mkdirSync(IMG_DIR, { recursive: true });
        }
    });

    // After all tests, clean up the img directory
    afterAll(() => {
        if (fs.existsSync(IMG_DIR)) {
            fs.readdirSync(IMG_DIR).forEach(f => fs.unlinkSync(path.join(IMG_DIR, f)));
        }
    });

    describe('POST /save - Create New Image', () => {
        it('should save a new image and its metadata', async () => {
            const response = await request(app)
                .post('/save')
                .send({
                    name: 'My Test Image',
                    price: '100',
                    image: MOCK_IMAGE_DATA,
                });

            // Expect a successful response
            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Image saved successfully');
            expect(response.body.title).toBe('My Test Image');
            expect(response.body.price).toBe('100 €');

            // Verify that the image file was created in the img directory
            const files = fs.readdirSync(IMG_DIR);
            expect(files).toHaveLength(2); // image file + meta.json
            const imageFile = files.find(f => f.endsWith('.png'));
            expect(imageFile).toBeDefined();

            // Verify the content of meta.json
            const metaContent = JSON.parse(fs.readFileSync(path.join(IMG_DIR, 'meta.json'), 'utf8'));
            expect(metaContent[imageFile!]).toEqual({
                name: 'My Test Image',
                price: '100',
            });
        });

        it('should return 400 if name is missing', async () => {
            const response = await request(app)
                .post('/save')
                .send({
                    price: '100',
                    image: MOCK_IMAGE_DATA,
                });
            
            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Name is required');
        });
    });

    describe('POST /save - Update Existing Image', () => {
        it('should update an existing image and its metadata', async () => {
            // First, create an image to update
            const initialFilename = 'my_test_image-12345.png';
            const initialMeta = {
                [initialFilename]: { name: 'Old Name', price: '50' }
            };
            const imagePath = path.join(IMG_DIR, initialFilename);
            const metaPath = path.join(IMG_DIR, 'meta.json');
            // Pre-populate the img directory
            fs.writeFileSync(imagePath, 'old-image-data');
            fs.writeFileSync(metaPath, JSON.stringify(initialMeta));

            // Now, send the update request
            const response = await request(app)
                .post('/save')
                .send({
                    name: 'New Updated Name',
                    price: '200',
                    image: MOCK_IMAGE_DATA,
                    filename: initialFilename, // Specify the file to update
                });

            // Expect a successful update response
            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Image updated successfully');
            expect(response.body.title).toBe('New Updated Name');
            expect(response.body.price).toBe('200 €');

            // Verify meta.json was updated correctly
            const metaContent = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
            expect(metaContent[initialFilename]).toEqual({
                name: 'New Updated Name',
                price: '200',
            });

            // Verify the image content was updated
            const imageData = fs.readFileSync(imagePath);
            expect(imageData.toString()).not.toBe('old-image-data');
        });
    });

    describe('GET /images', () => {
        it('should return an array of images with metadata', async () => {
            // Pre-populate the file system with two images and a meta file
            const meta = {
                'img1-123.png': { name: 'Image One', price: '10' },
                'img2-456.png': { name: 'Image Two', price: '20' },
            };
            fs.writeFileSync(path.join(IMG_DIR, 'meta.json'), JSON.stringify(meta));
            fs.writeFileSync(path.join(IMG_DIR, 'img1-123.png'), 'data1');
            fs.writeFileSync(path.join(IMG_DIR, 'img2-456.png'), 'data2');
            fs.writeFileSync(path.join(IMG_DIR, 'not-a-png.txt'), 'data3'); // Should be ignored

            const response = await request(app).get('/images');

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body).toEqual(expect.arrayContaining([{
                filename: 'img1-123.png',
                title: 'Image One',
                price: '10 €'
            }, {
                filename: 'img2-456.png',
                title: 'Image Two',
                price: '20 €'
            }]));
        });

        it('should return an empty array if no images exist', async () => {
            if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });
            const response = await request(app).get('/images');
            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });
    });

    describe('DELETE /images/:filename', () => {
        it('should delete a specific image and its metadata', async () => {
            // Pre-populate
            const filename = 'image-to-delete-123.png';
            const meta = { [filename]: { name: 'To Delete', price: '1' } };
            fs.writeFileSync(path.join(IMG_DIR, filename), 'data');
            fs.writeFileSync(path.join(IMG_DIR, 'meta.json'), JSON.stringify(meta));

            const response = await request(app).delete(`/images/${filename}`);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Image deleted successfully');

            // Verify file and metadata are gone
            const files = fs.readdirSync(IMG_DIR);
            expect(files).not.toContain(filename);
            const newMeta = JSON.parse(fs.readFileSync(path.join(IMG_DIR, 'meta.json'), 'utf8'));
            expect(newMeta[filename]).toBeUndefined();
        });
    });

    describe('DELETE /images', () => {
        it('should delete all images and the metadata file', async () => {
            // Pre-populate
            fs.writeFileSync(path.join(IMG_DIR, 'img1.png'), 'data');
            fs.writeFileSync(path.join(IMG_DIR, 'img2.png'), 'data');
            fs.writeFileSync(path.join(IMG_DIR, 'meta.json'), '{}');

            const response = await request(app).delete('/images');
            expect(response.status).toBe(200);
            expect(response.body.message).toBe('All images deleted successfully');

            // Verify the directory is empty
            const files = fs.readdirSync(IMG_DIR);
            expect(files).toHaveLength(0);
        });
    });
});