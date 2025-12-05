"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// Получаем элементы DOM
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const colorSwatches = document.querySelectorAll('.color-swatch');
const brushSize = document.getElementById('brushSize');
const brushSizeValue = document.getElementById('brushSizeValue');
const newBtn = document.getElementById('newBtn');
const saveBtn = document.getElementById('saveBtn');
const gallery = document.getElementById('gallery');
//Устанавливаем начальные значения
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let currentColor = '#000000';
let editingFile = null;
//Функция для очистки холста
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}
//Функция для рисования
function draw(e) {
    if (!isDrawing)
        return; //если не в режиме рисования, выходим
    ctx.lineWidth = parseInt(brushSize.value, 10);
    ctx.lineCap = 'round';
    ctx.strokeStyle = currentColor; //устанавливаем цвет линии
    ctx.beginPath();
    ctx.moveTo(lastX, lastY); //Начинае с последней позиции
    ctx.lineTo(e.offsetX, e.offsetY); //рисуем линию до текущей позиции
    ctx.stroke();
    [lastX, lastY] = [e.offsetX, e.offsetY]; //обновляем последнюю позицию
}
//Обработчик событий мыши
canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    [lastX, lastY] = [e.offsetX, e.offsetY];
});
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', () => isDrawing = false);
canvas.addEventListener('mouseout', () => isDrawing = false);
//Обработчик для кнопки "New"
newBtn.addEventListener('click', clearCanvas);
//Обработчик для палитры цветов
colorSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
        var _a;
        currentColor = swatch.dataset.color;
        (_a = document.querySelector('.color-swatch.active')) === null || _a === void 0 ? void 0 : _a.classList.remove('active');
        swatch.classList.add('active');
    });
});
colorPicker.addEventListener('input', (e) => {
    currentColor = e.target.value;
});
//Обработчик для размера кисти
brushSize.addEventListener('input', (e) => {
    brushSizeValue.textContent = e.target.value;
});
//Функция для сохранения рисунка
function saveDrawing() {
    return __awaiter(this, void 0, void 0, function* () {
        const nameInput = document.getElementById('nameInput');
        const priceInput = document.getElementById('priceInput');
        const name = nameInput.value.trim();
        const price = priceInput.value.trim();
        const image = canvas.toDataURL('image/png');
        try {
            const payload = { name, image, price };
            if (editingFile) {
                payload.filename = editingFile;
            }
            // console.log("Отправляем payload:", payload); //Проверка, что выдает консоль
            const response = yield fetch('/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const data = yield response.json();
            console.log(data.message);
            loadGallery(); //перезагружаем галерею
            clearCanvas();
            nameInput.value = '';
            priceInput.value = '';
            editingFile = null;
        }
        catch (err) {
            console.error(err);
            console.trace();
            alert('Ошибка при сохранении рисунка');
        }
    });
}
saveBtn.addEventListener('click', saveDrawing);
//Функция для удаления рисунка
function deleteDrawing(filename) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!confirm('Вы уверены, что хотите удалить картинку?'))
            return;
        try {
            const response = yield fetch(`/images/${filename}`, {
                method: "DELETE"
            });
            const data = yield response.json();
            console.log(data.message);
            loadGallery(); //перезагружаем галерею
        }
        catch (err) {
            console.error(err);
            alert('Ошибка при удалении всех картинок');
        }
    });
}
//Функция для редактирования рисунка
function editDrawing(filename) {
    editingFile = filename;
    const img = new Image();
    img.src = `img/${filename}`;
    img.onload = () => {
        clearCanvas();
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    fetch('/images')
        .then(res => res.json())
        .then((images) => {
        const image = images.find(img => img.filename === filename);
        if (image) {
            const nameInput = document.getElementById('nameInput');
            nameInput.value = image.title || '';
            const priceInput = document.getElementById('priceInput');
            priceInput.value = image.price || '';
        }
    });
}
//Функция для загрузки галереи
function loadGallery() {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield fetch(`/images?nocache=${Date.now()}`);
        const images = yield response.json();
        gallery.innerHTML = ''; //очищаем галерею
        images.forEach((image) => {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'gallery-item';
            const imgElement = document.createElement('img');
            imgElement.src = `img/${image.filename}`;
            const title = document.createElement('div');
            title.className = 'gallery-title';
            title.textContent = image.title;
            const price = document.createElement('div');
            price.className = 'gallery-price';
            price.textContent = image.price;
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.addEventListener('click', () => deleteDrawing(image.filename));
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            editBtn.addEventListener('click', () => editDrawing(image.filename));
            imgContainer.appendChild(imgElement);
            imgContainer.appendChild(title);
            imgContainer.appendChild(price);
            imgContainer.appendChild(deleteBtn);
            imgContainer.appendChild(editBtn);
            gallery.appendChild(imgContainer);
        });
    });
}
const deleteAllBtn = document.getElementById('deleteAllBtn');
deleteAllBtn === null || deleteAllBtn === void 0 ? void 0 : deleteAllBtn.addEventListener('click', () => __awaiter(void 0, void 0, void 0, function* () {
    if (!confirm('Вы уверены, что хотите удалить все картинки?'))
        return;
    try {
        const response = yield fetch('/images', { method: 'DELETE' });
        const data = yield response.json();
        console.log(data.message);
        loadGallery(); // обновляем галерею
    }
    catch (err) {
        console.error(err);
        alert('Ошибка при удалении всех картинок');
    }
}));
//Загружаем галерею при загрузке страницы
loadGallery();
