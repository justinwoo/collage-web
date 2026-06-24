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

  const aspectOf = (im) => im.img.width / im.img.height;
  const aspects = allImages.map(aspectOf);

  // Justified-gallery layout: every row is stretched to fill the full width,
  // images keep their real aspect ratios (no cropping into squares), and rows
  // come out "mostly equal" height. The target height is tuned so a row of two
  // average-shaped photos lands near it — wide landscapes then pack more per
  // row, tall portraits fewer, so heights vary a bit with orientation but stay
  // close. That's why 3 images become two rows (a row of two + a row of one).
  const avgAspect =
    aspects.reduce((s, a) => s + a, 0) / Math.max(aspects.length, 1);
  const targetRowHeight = (canvasWidth - spacing) / (2 * avgAspect);

  const layout = [];
  let currentY = 0;

  let i = 0;
  while (i < allImages.length) {
    // Grow the row until justifying it to full width would drop its height to
    // the target — or we run out of images (a partial final row).
    let end = i;
    let sumAspect = 0;
    let rowHeight = Infinity;
    while (end < allImages.length) {
      sumAspect += aspects[end];
      end += 1;
      const count = end - i;
      const available = canvasWidth - (count - 1) * spacing;
      rowHeight = available / sumAspect;
      if (rowHeight <= targetRowHeight) break;
    }

    const rowImages = allImages.slice(i, end);
    const count = rowImages.length;

    // If we never reached the target, this is an underfull final row. Don't
    // blow the images up to fill the width — hold them at the target height and
    // center the row instead.
    const underfull = rowHeight > targetRowHeight;
    if (underfull) rowHeight = targetRowHeight;
    rowHeight = Math.round(rowHeight);

    const widths = rowImages.map((im) => Math.round(aspectOf(im) * rowHeight));
    let rowWidth = widths.reduce((a, b) => a + b, 0) + (count - 1) * spacing;

    if (!underfull) {
      // Full row: absorb rounding error into the last cell so it fills exactly.
      widths[count - 1] += canvasWidth - rowWidth;
      rowWidth = canvasWidth;
    }

    let currentX = underfull ? Math.floor((canvasWidth - rowWidth) / 2) : 0;
    for (let k = 0; k < count; k++) {
      layout.push({
        image: rowImages[k],
        x: currentX,
        y: currentY,
        width: widths[k],
        height: rowHeight,
      });
      currentX += widths[k] + spacing;
    }

    currentY += rowHeight + spacing;
    i = end;
  }

  const canvasHeight = currentY > 0 ? currentY - spacing : 0;
  return { layout, canvasWidth, canvasHeight };
}
