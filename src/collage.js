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
  // Two images per row. A featured image breaks out into its own full-width
  // row unless that would make it taller than this, in which case it's capped
  // and centered.
  const MAX_FEATURED_HEIGHT = canvasWidth * 0.75;
  // How much of an image we're allowed to crop to balance a row. Landscapes
  // give up their sides, portraits give up their top/bottom (the draw step
  // center-crops, so the direction is automatic). 0.2 = up to 20%.
  const MAX_CROP = 0.2;
  const layout = [];
  let currentY = 0;

  const aspectOf = (img) => img.img.width / img.img.height;

  // How many images go in the row starting at startIdx: two, unless the next
  // image is featured (its own row) or it's the last odd image left.
  function rowCountAt(startIdx) {
    if (startIdx >= allImages.length) return 0;
    if (allImages[startIdx].featured) return 1;
    // Pair with the next image only if it's also non-featured.
    if (
      startIdx + 1 < allImages.length &&
      !allImages[startIdx + 1].featured
    ) {
      return 2;
    }
    return 1;
  }

  // Build layout row by row
  let i = 0;
  while (i < allImages.length) {
    // Featured image: full-width row of its own, height-capped + centered.
    if (allImages[i].featured) {
      const image = allImages[i];
      const aspect = aspectOf(image);
      let width = canvasWidth;
      let height = canvasWidth / aspect;
      let x = 0;

      if (height > MAX_FEATURED_HEIGHT) {
        height = MAX_FEATURED_HEIGHT;
        width = Math.round(height * aspect);
        x = Math.floor((canvasWidth - width) / 2);
      }

      layout.push({
        image,
        x,
        y: currentY,
        width,
        height: Math.round(height),
      });

      currentY += Math.round(height) + spacing;
      i += 1;
      continue;
    }

    const rowCount = rowCountAt(i);
    if (rowCount === 0) break;

    const images = allImages.slice(i, i + rowCount);
    const numImages = images.length;
    const availableWidth = canvasWidth - (numImages - 1) * spacing;

    // Natural aspect of each image, and a shared row target (their geometric
    // mean). Each cell is allowed to drift from its natural aspect toward the
    // target, but no further than MAX_CROP. Pulling toward a common aspect
    // makes the row's widths balanced instead of letting one wide photo
    // dominate; the leftover is cropped (sides for landscape, top/bottom for
    // portrait) by the draw step.
    const naturalAspects = images.map(aspectOf);
    const logMean =
      naturalAspects.reduce((sum, a) => sum + Math.log(a), 0) / numImages;
    const target = Math.exp(logMean);

    const cellAspects = naturalAspects.map((a) => {
      const low = a * (1 - MAX_CROP);
      const high = a / (1 - MAX_CROP);
      return Math.min(Math.max(target, low), high);
    });

    // At a shared row height, width is proportional to cell aspect. Solve the
    // height that makes the cells exactly fill the available width.
    const totalCellAspect = cellAspects.reduce((sum, c) => sum + c, 0);
    const rowHeight = Math.round(availableWidth / totalCellAspect);

    const widths = cellAspects.map((c) => Math.floor(c * rowHeight));
    const totalCalculatedWidth = widths.reduce((a, b) => a + b, 0);
    widths[widths.length - 1] += availableWidth - totalCalculatedWidth;

    // Place images in the row
    let currentX = 0;
    for (let idx = 0; idx < images.length; idx++) {
      layout.push({
        image: images[idx],
        x: currentX,
        y: currentY,
        width: widths[idx],
        height: rowHeight,
      });
      currentX += widths[idx] + spacing;
    }

    currentY += rowHeight + spacing;
    i += rowCount;
  }

  const canvasHeight = currentY > 0 ? currentY - spacing : 0;
  return { layout, canvasWidth, canvasHeight };
}
