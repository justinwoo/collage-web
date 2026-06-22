function classifyImages(images) {
  const landscape = [];
  const portrait = [];

  for (const imgData of images) {
    if (imgData.img.width > imgData.img.height) {
      landscape.push(imgData);
    } else {
      portrait.push(imgData);
    }
  }

  return { landscape, portrait };
}

function calculateHybridLayout(allImages) {
  const canvasWidth = 2000;
  const spacing = 15;
  // Every cell is a square laid out two-per-row. The draw step center-crops
  // each image to its cell, so a portrait gives up its top/bottom and a
  // landscape gives up its sides automatically. Square cells two-wide mean any
  // four images form a perfect square, and an even count is always a clean
  // rectangle of squares.
  const cols = 2;
  const cellSize = Math.floor((canvasWidth - (cols - 1) * spacing) / cols);
  const layout = [];
  let currentY = 0;

  for (let i = 0; i < allImages.length; i += cols) {
    const rowImages = allImages.slice(i, i + cols);

    // A lone trailing image is centered so the row stays balanced.
    const rowWidth = rowImages.length * cellSize + (rowImages.length - 1) * spacing;
    let currentX = Math.floor((canvasWidth - rowWidth) / 2);

    for (const image of rowImages) {
      layout.push({
        image,
        x: currentX,
        y: currentY,
        width: cellSize,
        height: cellSize,
      });
      currentX += cellSize + spacing;
    }

    currentY += cellSize + spacing;
  }

  const canvasHeight = currentY > 0 ? currentY - spacing : 0;
  return { layout, canvasWidth, canvasHeight };
}
