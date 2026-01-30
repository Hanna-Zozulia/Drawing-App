import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const app = express();
const port = 3000;

const imgDir = path.join(__dirname, '..', 'img');
if (!fs.existsSync(imgDir)) {
    fs.mkdirSync(imgDir, { recursive: true });
}

app.use(express.static(path.join(__dirname, '..')));
app.use(express.json({ limit: '10mb' }));


// === SAVE / UPDATE IMAGE ===
app.post('/save', (req: Request, res: Response) => {
    const { image, name, filename, price } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const saveName = name.replace(/[^\p{L}\p{N}_\-]/gu, '_');
    const base64Data = image.replace(/^data:image\/png;base64,/, '');
    const metaFile = path.join(imgDir, 'meta.json');
    const meta = fs.existsSync(metaFile)
        ? JSON.parse(fs.readFileSync(metaFile, 'utf8'))
        : {};

    // --- UPDATE EXISTING FILE ---
    if (filename) {
        const imagePath = path.join(imgDir, filename);

        fs.writeFile(imagePath, base64Data, 'base64', (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Failed to update image' });
            }

            const cleanPrice = price.replace(/\s?€/, '');

            meta[filename] = { name, price: cleanPrice };
            fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2), 'utf8');

            return res.json({
                message: 'Image updated successfully',
                filename,
                title: name,
                price: cleanPrice + " €"
            });
        });
        return;
    }

    // --- CREATE NEW FILE ---
    const newName = `${saveName}-${Date.now()}.png`;
    const newPath = path.join(imgDir, newName);

    fs.writeFile(newPath, base64Data, 'base64', (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Failed to save image' });
        }

        meta[newName] = { name, price };
        fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2), 'utf8');

        return res.json({
            message: 'Image saved successfully',
            filename: newName,
            title: name,
            price: price + " €"
        });
    });
});


// === GET IMAGES (with metadata) ===
app.get('/images', (req: Request, res: Response) => {
    const metaFile = path.join(imgDir, 'meta.json');
    const meta = fs.existsSync(metaFile)
        ? JSON.parse(fs.readFileSync(metaFile, 'utf8'))
        : {};

    const files = fs.readdirSync(imgDir).filter(f => f.endsWith('.png'));

    const images = files.map(f => ({
        filename: f,
        title: meta[f]?.name ?? f.replace(/-\d+\.png$/, '').replace(/_/g, ' '),
        price: meta[f]?.price ? meta[f].price + " €" : null
    }));

    res.json(images);
});


// === DELETE ONE IMAGE ===
app.delete('/images/:filename', (req: Request, res: Response) => {
    const { filename } = req.params;
    const imagePath = path.join(imgDir, filename);
    const metaFile = path.join(imgDir, 'meta.json');

    try {
        fs.unlinkSync(imagePath);

        if (fs.existsSync(metaFile)) {
            const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
            delete meta[filename];
            fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2), 'utf8');
        }

        res.json({ message: 'Image deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to delete image' });
    }
});


// === DELETE ALL IMAGES ===
app.delete('/images', (req: Request, res: Response) => {
    const metaFile = path.join(imgDir, 'meta.json');

    try {
        const files = fs.readdirSync(imgDir);
        for (const f of files) {
            fs.unlinkSync(path.join(imgDir, f));
        }

        if (fs.existsSync(metaFile)) fs.unlinkSync(metaFile);

        res.json({ message: 'All images deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to delete images' });
    }
});


<<<<<<< HEAD
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
=======

if (process.env.NODE_ENV !== 'test') {
    app.listen(port, () => {
        console.log(`Server is running at http://localhost:${port}`);
    });
}

export default app;
>>>>>>> fb2a244 (Added tests)
