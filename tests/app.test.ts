// Since the app.ts file is a script that modifies the DOM directly and doesn't export functions,
// we need to simulate a browser environment and load the script within it for testing.
// This setup is more complex than testing modules with clear inputs and outputs.

// Define a simple HTML structure for our tests, mimicking the real index.html
const setupDOM = () => {
    document.body.innerHTML = `
        <div class="main-container">
            <div class="controls">
                <input type="text" id="nameInput" placeholder="Enter name">
                <input type="text" id="priceInput" placeholder="Enter price">
                <input type="color" id="colorPicker" value="#000000">
                <div class="color-palette">
                    <div class="color-swatch" data-color="#ff0000" style="background-color: #ff0000;"></div>
                    <div class="color-swatch active" data-color="#000000" style="background-color: #000000;"></div>
                </div>
                <input type="range" id="brushSize" min="1" max="50" value="5">
                <span id="brushSizeValue">5</span>
                <button id="newBtn">New</button>
                <button id="saveBtn">Save</button>
                <button id="deleteAllBtn">Delete All</button>
            </div>
            <canvas id="canvas" width="800" height="600"></canvas>
            <div id="gallery"></div>
        </div>
    `;
};

// Mock the 2D rendering context of the canvas.
// The real Canvas API is not available in Jest's Node.js environment, so we create a fake version.
const mockContext = {
    clearRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    drawImage: jest.fn(),
    // We also need to provide properties that the script might access.
    lineWidth: 0,
    lineCap: 'butt',
    strokeStyle: '#000000',
};

// Mock other browser-specific APIs that are used in the script.
global.fetch = jest.fn((url) => {
    // When the app tries to load the gallery, return an empty array.
    if (url && url.toString().startsWith('/images')) {
        return Promise.resolve({
            json: () => Promise.resolve([]),
        });
    }
    // For other calls, like saving, return a generic success-like object.
    return Promise.resolve({
        json: () => Promise.resolve({ message: 'Success' }),
    });
}) as jest.Mock;

global.confirm = jest.fn(() => true); // Assume user always confirms dialogs
HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockContext);
HTMLCanvasElement.prototype.toDataURL = jest.fn().mockReturnValue('data:image/png;base64,mock-image-data');

// This block runs before each test.
beforeEach(() => {
    // 1. Set up the clean, mocked DOM.
    setupDOM();
    
    // 2. Manually clear mocks to ensure test isolation without resetting implementations.
    // This is the key to fixing both the initial TypeError and the subsequent test failures.
    (global.fetch as jest.Mock).mockClear();
    (global.confirm as jest.Mock).mockClear();
    // Clear all functions within the mocked canvas context
    Object.values(mockContext).forEach(value => {
        // Check if the value is a Jest mock function before trying to clear it.
        if (jest.isMockFunction(value)) {
            value.mockClear();
        }
    });

    // 3. Isolate module loading to ensure app.ts runs fresh for each test.
    jest.isolateModules(() => {
        // 4. Load the app script. This will attach event listeners to our mock DOM.
        require('../src/app');
    });
});

describe('Drawing Application', () => {

    describe('Canvas Functionality', () => {
        it('should clear the canvas when "New" button is clicked', () => {
            // Find the "New" button in our mock DOM and simulate a click.
            const newBtn = document.getElementById('newBtn') as HTMLButtonElement;
            newBtn.click();
            
            // Check if the clearRect function on our mock context was called correctly.
            const canvas = document.getElementById('canvas') as HTMLCanvasElement;
            expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height);
        });

        it('should not draw on mousemove if mousedown has not occurred', () => {
            // Simulate moving the mouse over the canvas without pressing the button.
            const canvas = document.getElementById('canvas') as HTMLCanvasElement;
            const moveEvent = new MouseEvent('mousemove', { bubbles: true });
            canvas.dispatchEvent(moveEvent);

            // The stroke function should not have been called.
            expect(mockContext.stroke).not.toHaveBeenCalled();
        });

        it('should draw on mousemove after a mousedown event', () => {
            const canvas = document.getElementById('canvas') as HTMLCanvasElement;
            
            // Simulate pressing the mouse button down on the canvas.
            const downEvent = new MouseEvent('mousedown', { bubbles: true, clientX: 10, clientY: 10 });
            canvas.dispatchEvent(downEvent);

            // Simulate moving the mouse.
            const moveEvent = new MouseEvent('mousemove', { bubbles: true, clientX: 15, clientY: 15 });
            canvas.dispatchEvent(moveEvent);
            
            // The stroke function should now be called.
            expect(mockContext.stroke).toHaveBeenCalled();
        });

        it('should stop drawing after mouseup event', () => {
            const canvas = document.getElementById('canvas') as HTMLCanvasElement;
            
            // Start drawing.
            canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            canvas.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
            expect(mockContext.stroke).toHaveBeenCalledTimes(1);
            
            // Release the mouse button.
            canvas.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            
            // Try to draw again by moving the mouse.
            canvas.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));

            // The stroke count should not have increased.
            expect(mockContext.stroke).toHaveBeenCalledTimes(1);
        });
    });

    describe('UI Controls', () => {
        it('should update brush size display and context when slider is moved', () => {
            const brushSize = document.getElementById('brushSize') as HTMLInputElement;
            const brushSizeValue = document.getElementById('brushSizeValue') as HTMLSpanElement;
            
            // Change the slider value and simulate the 'input' event.
            brushSize.value = '30';
            brushSize.dispatchEvent(new Event('input'));
            
            // The text display should update.
            expect(brushSizeValue.textContent).toBe('30');
            
            // Trigger a draw operation to check if the context's lineWidth is updated.
            const canvas = document.getElementById('canvas') as HTMLCanvasElement;
            canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            canvas.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
            
            expect(mockContext.lineWidth).toBe(30);
        });

        it('should change color when a color swatch is clicked', () => {
            const swatch = document.querySelector('[data-color="#ff0000"]') as HTMLElement;
            swatch.click();
            
            // Trigger a draw operation to see if the strokeStyle on the context is updated.
            const canvas = document.getElementById('canvas') as HTMLCanvasElement;
            canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            canvas.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
            
            expect(mockContext.strokeStyle).toBe('#ff0000');
        });
    });

    describe('API and Gallery', () => {
        it('should call the save endpoint when "Save" button is clicked', async () => {
            const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
            const nameInput = document.getElementById('nameInput') as HTMLInputElement;
            nameInput.value = 'Test Drawing';

            // The global fetch mock is already configured to handle the /save call.
            // No need to re-mock it here.


            // Click the save button.
            saveBtn.click();
            
            // We need to wait for the async saveDrawing function to complete.
            // A microtask delay allows the promises to resolve.
            await new Promise(process.nextTick);

            // Check if fetch was called with the correct URL and payload.
            expect(global.fetch).toHaveBeenCalledWith('/save', expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Test Drawing',
                    image: 'data:image/png;base64,mock-image-data',
                    price: '', // price input was empty
                }),
            }));
        });

        it('should call the delete endpoint for all images', async () => {
            (global.confirm as jest.Mock).mockReturnValue(true); // User confirms deletion.
            const deleteAllBtn = document.getElementById('deleteAllBtn') as HTMLButtonElement;

            deleteAllBtn.click();
            await new Promise(process.nextTick); // Wait for async operation

            expect(global.confirm).toHaveBeenCalled();
            expect(global.fetch).toHaveBeenCalledWith('/images', { method: 'DELETE' });
        });

        it('should NOT call the delete endpoint if user cancels confirmation', () => {
            (global.confirm as jest.Mock).mockReturnValue(false); // User cancels.
            const deleteAllBtn = document.getElementById('deleteAllBtn') as HTMLButtonElement;

            deleteAllBtn.click();

            // Fetch should not have been called for deletion.
            expect(global.fetch).not.toHaveBeenCalledWith('/images', { method: 'DELETE' });
        });
    });
});
