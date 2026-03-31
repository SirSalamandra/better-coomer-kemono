const COLUMN_MIN_WIDTH = 260;
const COLUMN_GAP = 16;

/**
 * Creates a Pinterest-style masonry container.
 * Cards are placed left-to-right into the shortest column at the time of insertion,
 * so the layout order matches insertion order across the top of the grid.
 * Re-layouts automatically on container resize.
 */
export function createMasonry(cards: HTMLElement[]): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'masonry-wrapper';

  let colCount = 0;

  function layout() {
    const width = wrapper.offsetWidth;
    if (!width) return;

    const count = Math.max(1, Math.floor((width + COLUMN_GAP) / (COLUMN_MIN_WIDTH + COLUMN_GAP)));

    if (count !== colCount) {
      colCount = count;
      wrapper.innerHTML = '';
      for (let i = 0; i < count; i++) {
        const col = document.createElement('div');
        col.className = 'masonry-col';
        wrapper.appendChild(col);
      }
    } else {
      for (const col of wrapper.children as HTMLCollectionOf<HTMLElement>) {
        col.innerHTML = '';
      }
    }

    const columns = Array.from(wrapper.children) as HTMLElement[];

    for (let i = 0; i < cards.length; i++) {
      columns[i % count].appendChild(cards[i]);
    }
  }

  requestAnimationFrame(() => {
    layout();
    const ro = new ResizeObserver(() => layout());
    ro.observe(wrapper);
  });

  return wrapper;
}
