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
  const canvasWidth = 1200;
  const spacing = 15;
  const layout = [];
  let currentY = 0;

  // Helper to check orientation
  const isLandscape = (img) => img.img.width > img.img.height;

  // Try to find the best row pattern starting at index i
  function findBestRowPattern(startIdx) {
    if (startIdx >= allImages.length) return null;

    const remainingImages = allImages.length - startIdx;

    // If only 1 image remaining (REMAINDER), make it full width
    if (remainingImages === 1) {
      const img = allImages[startIdx];
      const type = isLandscape(img) ? 'L' : 'P';
      return {
        count: 1,
        types: [type],
      };
    }

    const patterns = [];

    // Define possible patterns (preserving order)
    // Pattern: { count: number of images, types: array of 'L' or 'P' }

    // Two image patterns
    if (startIdx + 1 < allImages.length) {
      const img0 = allImages[startIdx];
      const img1 = allImages[startIdx + 1];
      const type0 = isLandscape(img0) ? 'L' : 'P';
      const type1 = isLandscape(img1) ? 'L' : 'P';

      patterns.push({
        count: 2,
        types: [type0, type1],
      });
    }

    // Three image patterns (only portraits)
    if (startIdx + 2 < allImages.length) {
      const img0 = allImages[startIdx];
      const img1 = allImages[startIdx + 1];
      const img2 = allImages[startIdx + 2];

      if (!isLandscape(img0) && !isLandscape(img1) && !isLandscape(img2)) {
        patterns.push({
          count: 3,
          types: ['P', 'P', 'P'],
        });
      }
    }

    // If no patterns found, return null
    if (patterns.length === 0) return null;

    // Score each pattern based on space efficiency
    let bestPattern = patterns[0];
    let bestScore = -Infinity;

    for (const pattern of patterns) {
      const score = scorePattern(startIdx, pattern);
      if (score > bestScore) {
        bestScore = score;
        bestPattern = pattern;
      }
    }

    return bestPattern;
  }

  // Score a pattern based on how well it uses the canvas width
  function scorePattern(startIdx, pattern) {
    const images = allImages.slice(startIdx, startIdx + pattern.count);

    // Calculate total aspect ratio weight
    let totalAspectRatio = 0;
    for (const img of images) {
      totalAspectRatio += img.img.width / img.img.height;
    }

    // Available width after spacing
    const availableWidth = canvasWidth - (pattern.count - 1) * spacing;

    // Target height based on even width distribution
    const itemWidth = availableWidth / pattern.count;

    // Calculate actual heights needed
    let maxHeight = 0;
    let totalHeightVariance = 0;

    for (const img of images) {
      const aspectRatio = img.img.width / img.img.height;
      const height = itemWidth / aspectRatio;
      maxHeight = Math.max(maxHeight, height);
      totalHeightVariance += Math.abs(height - maxHeight);
    }

    // Prefer patterns with:
    // 1. More images per row (better space usage)
    // 2. Similar heights (less wasted space)
    // 3. Mixed orientations when it makes sense

    const countBonus = pattern.count * 100;
    const heightUniformityBonus = 1000 / (1 + totalHeightVariance);
    const mixedOrientationBonus = (new Set(pattern.types).size > 1) ? 50 : 0;

    return countBonus + heightUniformityBonus + mixedOrientationBonus;
  }

  // Build layout row by row
  let i = 0;
  while (i < allImages.length) {
    const pattern = findBestRowPattern(i);
    if (!pattern) break;

    const images = allImages.slice(i, i + pattern.count);
    const numImages = images.length;

    // Calculate widths proportional to aspect ratios for better space usage
    const totalAspectRatio = images.reduce(
      (sum, img) => sum + img.img.width / img.img.height,
      0
    );

    const availableWidth = canvasWidth - (numImages - 1) * spacing;

    // Assign widths proportionally to aspect ratios
    const widths = images.map((img) => {
      const aspectRatio = img.img.width / img.img.height;
      return Math.floor((aspectRatio / totalAspectRatio) * availableWidth);
    });

    // Adjust last width to account for rounding
    const totalCalculatedWidth = widths.reduce((a, b) => a + b, 0);
    widths[widths.length - 1] += availableWidth - totalCalculatedWidth;

    // Calculate row height to fit all images
    let rowHeight = 0;
    for (let idx = 0; idx < images.length; idx++) {
      const img = images[idx];
      const aspectRatio = img.img.width / img.img.height;
      const height = Math.floor(widths[idx] / aspectRatio);
      rowHeight = Math.max(rowHeight, height);
    }

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
    i += pattern.count;
  }

  const canvasHeight = currentY > 0 ? currentY - spacing : 0;
  return { layout, canvasWidth, canvasHeight };
}
