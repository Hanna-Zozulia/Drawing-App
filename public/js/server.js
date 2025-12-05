"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
const port = 3000;
const imgDir = path_1.default.join(__dirname, '..', 'img');
if (!fs_1.default.existsSync(imgDir)) {
    fs_1.default.mkdirSync(imgDir, { recursive: true });
}
app.use(express_1.default.static(path_1.default.join(__dirname, '..')));
app.use(express_1.default.json({ limit: '10mb' }));
// === SAVE / UPDATE IMAGE ===
app.post('/save', (req, res) => {
    const { image, name, filename, price } = req.body;
    if (!name)
        return res.status(400).json({ message: 'Name is required' });
    const saveName = name.replace(/[^\p{L}\p{N}_\-]/gu, '_');
    const base64Data = image.replace(/^data:image\/png;base64,/, '');
    const metaFile = path_1.default.join(imgDir, 'meta.json');
    const meta = fs_1.default.existsSync(metaFile)
        ? JSON.parse(fs_1.default.readFileSync(metaFile, 'utf8'))
        : {};
    // --- UPDATE EXISTING FILE ---
    if (filename) {
        const imagePath = path_1.default.join(imgDir, filename);
        fs_1.default.writeFile(imagePath, base64Data, 'base64', (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Failed to update image' });
            }
            const cleanPrice = price.replace(/\s?€/, '');
            meta[filename] = { name, price: cleanPrice };
            fs_1.default.writeFileSync(metaFile, JSON.stringify(meta, null, 2), 'utf8');
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
    const newPath = path_1.default.join(imgDir, newName);
    fs_1.default.writeFile(newPath, base64Data, 'base64', (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Failed to save image' });
        }
        meta[newName] = { name, price };
        fs_1.default.writeFileSync(metaFile, JSON.stringify(meta, null, 2), 'utf8');
        return res.json({
            message: 'Image saved successfully',
            filename: newName,
            title: name,
            price: price + " €"
        });
    });
});
// === GET IMAGES (with metadata) ===
app.get('/images', (req, res) => {
    const metaFile = path_1.default.join(imgDir, 'meta.json');
    const meta = fs_1.default.existsSync(metaFile)
        ? JSON.parse(fs_1.default.readFileSync(metaFile, 'utf8'))
        : {};
    const files = fs_1.default.readdirSync(imgDir).filter(f => f.endsWith('.png'));
    const images = files.map(f => {
        var _a, _b, _c;
        return ({
            filename: f,
            title: (_b = (_a = meta[f]) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : f.replace(/-\d+\.png$/, '').replace(/_/g, ' '),
            price: ((_c = meta[f]) === null || _c === void 0 ? void 0 : _c.price) ? meta[f].price + " €" : null
        });
    });
    res.json(images);
});
// === DELETE ONE IMAGE ===
app.delete('/images/:filename', (req, res) => {
    const { filename } = req.params;
    const imagePath = path_1.default.join(imgDir, filename);
    const metaFile = path_1.default.join(imgDir, 'meta.json');
    try {
        fs_1.default.unlinkSync(imagePath);
        if (fs_1.default.existsSync(metaFile)) {
            const meta = JSON.parse(fs_1.default.readFileSync(metaFile, 'utf8'));
            delete meta[filename];
            fs_1.default.writeFileSync(metaFile, JSON.stringify(meta, null, 2), 'utf8');
        }
        res.json({ message: 'Image deleted successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to delete image' });
    }
});
// === DELETE ALL IMAGES ===
app.delete('/images', (req, res) => {
    const metaFile = path_1.default.join(imgDir, 'meta.json');
    try {
        const files = fs_1.default.readdirSync(imgDir);
        for (const f of files) {
            fs_1.default.unlinkSync(path_1.default.join(imgDir, f));
        }
        if (fs_1.default.existsSync(metaFile))
            fs_1.default.unlinkSync(metaFile);
        res.json({ message: 'All images deleted successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to delete images' });
    }
});
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
