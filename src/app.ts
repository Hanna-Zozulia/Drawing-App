// Получаем элементы DOM
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const colorPicker = document.getElementById('colorPicker') as HTMLInputElement;
const colorSwatches = document.querySelectorAll('.color-swatch');
const brushSize = document.getElementById('brushSize') as HTMLInputElement;
const brushSizeValue = document.getElementById('brushSizeValue') as HTMLSpanElement;
const newBtn = document.getElementById('newBtn') as HTMLButtonElement;
const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
const gallery = document.getElementById('gallery') as HTMLDivElement;

//Устанавливаем начальные значения
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let currentColor = '#000000';
let editingFile: string | null = null;

//Функция для очистки холста
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

//Функция для рисования
function draw(e: MouseEvent) {
    if (!isDrawing) return; //если не в режиме рисования, выходим
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
        currentColor = (swatch as HTMLElement).dataset.color!;
        document.querySelector('.color-swatch.active')?.classList.remove('active');
        swatch.classList.add('active');
    });
});

colorPicker.addEventListener('input', (e) => {
    currentColor = (e.target as HTMLInputElement).value;
});

//Обработчик для размера кисти
brushSize.addEventListener('input', (e) => {
    brushSizeValue.textContent = (e.target as HTMLInputElement).value;
});

//Функция для сохранения рисунка
async function saveDrawing() {
    const nameInput = document.getElementById('nameInput') as HTMLInputElement;
    const priceInput = document.getElementById('priceInput') as HTMLInputElement;
    const name = nameInput.value.trim();
    const price = priceInput.value.trim();  

    const image = canvas.toDataURL('image/png');

    try { 
    const payload: any = { name, image, price };
        
        if (editingFile) {
            payload.filename = editingFile;
        }
    
        // console.log("Отправляем payload:", payload); //Проверка, что выдает консоль

    const response = await fetch('/save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    const data = await response.json();
    console.log(data.message);
    loadGallery(); //перезагружаем галерею
    clearCanvas();
    nameInput.value = '';
    priceInput.value = '';
    editingFile = null;

    } catch (err) {
        console.error(err);
        console.trace();
        alert('Ошибка при сохранении рисунка');
    }
}

saveBtn.addEventListener('click', saveDrawing);

//Функция для удаления рисунка
async function deleteDrawing(filename: string) {
    if (!confirm('Вы уверены, что хотите удалить картинку?')) return;

    try {
        const response = await fetch(`/images/${filename}`, {
            method: "DELETE"
        });
        const data = await response.json();
        console.log(data.message);
        loadGallery(); //перезагружаем галерею
    } catch (err) {
        console.error(err);
        alert('Ошибка при удалении всех картинок');
    }
}

//Функция для редактирования рисунка
function editDrawing(filename: string) {
    editingFile = filename;

    const img = new Image();
    img.src = `img/${filename}`; 
    img.onload = () => {
        clearCanvas(); 
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };

    fetch('/images')
        .then(res => res.json())
        .then((images: { filename: string; title: string, price?: string }[]) => {
            const image = images.find(img => img.filename === filename);
            if (image) {
                const nameInput = document.getElementById('nameInput') as HTMLInputElement;
                nameInput.value = image.title || '';

                const priceInput = document.getElementById('priceInput') as HTMLInputElement;
                priceInput.value = image.price || ''; 
            }
        });
}

//Функция для загрузки галереи
async function loadGallery() {
    const response = await fetch(`/images?nocache=${Date.now()}`);
    const images = await response.json();
    gallery.innerHTML = ''; //очищаем галерею
    images.forEach((image: { filename: string, title: string, price: string}) => {
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
}

const deleteAllBtn = document.getElementById('deleteAllBtn');

deleteAllBtn?.addEventListener('click', async () => {
    if (!confirm('Вы уверены, что хотите удалить все картинки?')) return;

    try {
        const response = await fetch('/images', { method: 'DELETE' });
        const data = await response.json();
        console.log(data.message);
        loadGallery(); // обновляем галерею
    } catch (err) {
        console.error(err);
        alert('Ошибка при удалении всех картинок');
    }
});

//Загружаем галерею при загрузке страницы
loadGallery();