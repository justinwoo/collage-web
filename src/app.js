const state = {
  images: [],
  isProcessing: false,
  canvasReady: false,
  selectedThumbnailIndex: null,
};

const elements = {
  selectBtn: document.getElementById('selectBtn'),
  fileInput: document.getElementById('fileInput'),
  generateBtn: document.getElementById('generateBtn'),
  clearBtn: document.getElementById('clearBtn'),
  downloadBtn: document.getElementById('downloadBtn'),
  progressContainer: document.getElementById('progressContainer'),
  progressMessage: document.getElementById('progressMessage'),
  progressCount: document.getElementById('progressCount'),
  progressFill: document.getElementById('progressFill'),
  stats: document.getElementById('stats'),
  statsMain: document.getElementById('statsMain'),
  statsDetail: document.getElementById('statsDetail'),
  canvas: document.getElementById('canvas'),
  emptyState: document.getElementById('emptyState'),
  thumbnailContainer: document.getElementById('thumbnailContainer'),
};

function updateProgress(current, total, message) {
  elements.progressMessage.textContent = message;
  elements.progressCount.textContent = `${current}/${total}`;
  elements.progressFill.style.width = `${(current / total) * 100}%`;
}

function renderThumbnails() {
  elements.thumbnailContainer.innerHTML = '';

  if (state.images.length === 0) {
    elements.thumbnailContainer.classList.add('hidden');
    return;
  }

  elements.thumbnailContainer.classList.remove('hidden');

  state.images.forEach((imgData, index) => {
    const thumbDiv = document.createElement('div');
    thumbDiv.className = 'thumbnail';
    thumbDiv.dataset.index = index;

    const img = document.createElement('img');
    img.src = imgData.thumbSrc;
    img.alt = `Image ${index + 1}`;

    thumbDiv.appendChild(img);
    thumbDiv.addEventListener('click', () => handleThumbnailClick(index));

    elements.thumbnailContainer.appendChild(thumbDiv);
  });
}

function handleThumbnailClick(index) {
  if (state.selectedThumbnailIndex === null) {
    // First click - select this thumbnail
    state.selectedThumbnailIndex = index;
    updateThumbnailSelection();
  } else if (state.selectedThumbnailIndex === index) {
    // Clicking the same thumbnail - deselect
    state.selectedThumbnailIndex = null;
    updateThumbnailSelection();
  } else {
    // Second click - swap images
    const temp = state.images[state.selectedThumbnailIndex];
    state.images[state.selectedThumbnailIndex] = state.images[index];
    state.images[index] = temp;

    state.selectedThumbnailIndex = null;
    state.canvasReady = false;

    renderThumbnails();

    const { landscape, portrait } = classifyImages(state.images);
    elements.statsDetail.textContent = `${landscape.length} landscape, ${portrait.length} portrait`;
  }
}

function updateThumbnailSelection() {
  const thumbs = elements.thumbnailContainer.querySelectorAll('.thumbnail');
  thumbs.forEach((thumb, index) => {
    if (index === state.selectedThumbnailIndex) {
      thumb.classList.add('selected');
    } else {
      thumb.classList.remove('selected');
    }
  });
}

async function handleFileSelect(e) {
  const files = Array.from(e.target.files).filter(file => {
    return !file.name.match(/^collage\./i);
  });
  if (files.length === 0) return;

  state.isProcessing = true;
  elements.selectBtn.disabled = true;
  elements.selectBtn.innerHTML =
    '<div class="spinner"></div><span>Processing...</span>';
  elements.progressContainer.classList.remove('hidden');

  const loadedImages = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    updateProgress(i + 1, files.length, `Loading ${file.name}...`);

    await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Generate small thumbnail
          const thumbCanvas = document.createElement('canvas');
          const thumbSize = 120;
          const thumbCtx = thumbCanvas.getContext('2d');

          const scale = Math.min(thumbSize / img.width, thumbSize / img.height);
          thumbCanvas.width = img.width * scale;
          thumbCanvas.height = img.height * scale;

          thumbCtx.drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);
          const thumbSrc = thumbCanvas.toDataURL('image/jpeg', 0.7);

          loadedImages.push({
            src: e.target.result,
            thumbSrc: thumbSrc,
            img: img,
            file: file,
            lastModified: file.lastModified,
          });
          resolve();
        };
        img.onerror = () => resolve();
        img.src = e.target.result;
      };
      reader.onerror = () => resolve();
      reader.readAsDataURL(file);
    });

    await new Promise((r) => setTimeout(r, 10));
  }

  loadedImages.sort((a, b) => a.lastModified - b.lastModified);

  state.images = loadedImages;
  state.isProcessing = false;
  state.canvasReady = false;

  elements.progressContainer.classList.add('hidden');
  elements.selectBtn.disabled = false;
  elements.selectBtn.innerHTML =
    '<span>📤</span><span>Select Photos</span>';
  elements.generateBtn.disabled = false;
  elements.clearBtn.disabled = false;
  elements.emptyState.classList.add('hidden');

  const { landscape, portrait } = classifyImages(state.images);
  elements.stats.classList.remove('hidden');
  elements.statsMain.textContent = `${state.images.length} photo${state.images.length !== 1 ? 's' : ''} selected`;
  elements.statsDetail.textContent = `${landscape.length} landscape, ${portrait.length} portrait`;

  renderThumbnails();
}

async function generateCollage() {
  if (state.images.length === 0) return;

  state.isProcessing = true;
  elements.generateBtn.disabled = true;
  elements.generateBtn.innerHTML =
    '<div class="spinner"></div><span>Generating...</span>';
  elements.progressContainer.classList.remove('hidden');

  updateProgress(0, state.images.length + 1, 'Calculating layout...');
  await new Promise((r) => setTimeout(r, 100));

  const { layout, canvasWidth, canvasHeight } =
    calculateHybridLayout(state.images);

  const canvas = elements.canvas;
  const ctx = canvas.getContext('2d', { alpha: false });

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  // Enable high quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  updateProgress(1, state.images.length + 1, 'Rendering collage...');
  await new Promise((r) => setTimeout(r, 50));

  for (let i = 0; i < layout.length; i++) {
    const item = layout[i];

    updateProgress(
      i + 2,
      state.images.length + 1,
      `Processing image ${i + 1}/${layout.length}...`
    );

    const img = item.image.img;
    const aspectRatio = img.width / img.height;
    const targetAspect = item.width / item.height;

    let sx;
    let sy;
    let sWidth;
    let sHeight;

    if (aspectRatio > targetAspect) {
      sHeight = img.height;
      sWidth = sHeight * targetAspect;
      sx = (img.width - sWidth) / 2;
      sy = 0;
    } else {
      sWidth = img.width;
      sHeight = sWidth / targetAspect;
      sx = 0;
      sy = (img.height - sHeight) / 2;
    }

    ctx.drawImage(
      img,
      sx,
      sy,
      sWidth,
      sHeight,
      item.x,
      item.y,
      item.width,
      item.height
    );

    if (i % 3 === 0) {
      await new Promise((r) => setTimeout(r, 10));
    }
  }

  updateProgress(state.images.length + 1, state.images.length + 1, 'Complete!');
  await new Promise((r) => setTimeout(r, 300));

  state.isProcessing = false;
  state.canvasReady = true;

  elements.progressContainer.classList.add('hidden');
  elements.generateBtn.disabled = false;
  elements.generateBtn.innerHTML = 'Generate Collage';
  elements.downloadBtn.disabled = false;
}

async function downloadCollage() {
  const canvas = elements.canvas;

  canvas.toBlob(async (blob) => {
    // Try to use Web Share API (for mobile devices)
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], 'collage.jpg', { type: 'image/jpeg' });

      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'collage.jpg'
          });
          return;
        } catch (err) {
          // User cancelled or sharing failed, fall through to download
          if (err.name !== 'AbortError') {
            console.log('Share failed:', err);
          }
        }
      }
    }

    // Fallback to regular download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'collage.jpg';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, 'image/jpeg', 0.98);
}

function clearImages() {
  state.images = [];
  state.canvasReady = false;
  state.selectedThumbnailIndex = null;

  elements.fileInput.value = '';
  elements.generateBtn.disabled = true;
  elements.clearBtn.disabled = true;
  elements.downloadBtn.disabled = true;
  elements.stats.classList.add('hidden');
  elements.emptyState.classList.remove('hidden');
  elements.thumbnailContainer.classList.add('hidden');
  elements.thumbnailContainer.innerHTML = '';

  const canvas = elements.canvas;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

elements.selectBtn.addEventListener('click', () => elements.fileInput.click());
elements.fileInput.addEventListener('change', handleFileSelect);
elements.generateBtn.addEventListener('click', generateCollage);
elements.clearBtn.addEventListener('click', clearImages);
elements.downloadBtn.addEventListener('click', downloadCollage);
