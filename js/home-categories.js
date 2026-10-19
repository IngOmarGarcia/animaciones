// Counts come from the public catalog; no popularity data is inferred.
export function orderHomeCategories(categories, animations) {
  const counts = new Map();
  for (const animation of animations) {
    if (!animation.hidden) counts.set(animation.category, (counts.get(animation.category) || 0) + 1);
  }
  return categories.map(category => ({ ...category, count: category.id === 'todas' ? animations.filter(a => !a.hidden).length : counts.get(category.id) || 0 }))
    .sort((a, b) => a.id === 'todas' ? -1 : b.id === 'todas' ? 1 : b.count - a.count);
}
