/**
 * World rectangles have their origin at the bottom left (+y up). Test the
 * complete visual bounds, not the base of the building. A low base can be
 * far below the screen while the roof and most of the facade remain visible.
 * Padding covers roof tiles, cornices, outlines and antialiasing.
 */
export function isBuildingVisible(rect, camera, viewport) {
  const padding = 0.2 + 2 / camera.scale;
  const halfWidth = viewport.width / (2 * camera.scale);
  const halfHeight = viewport.height / (2 * camera.scale);
  return (rect.x + rect.w + padding >= camera.x - halfWidth &&
    rect.x - padding <= camera.x + halfWidth &&
    rect.y + rect.h + padding >= camera.y - halfHeight &&
    rect.y - padding <= camera.y + halfHeight);
}
