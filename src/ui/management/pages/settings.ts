import { IndexedDbManager } from "../../../core/database/indexedDbManager";

export function renderSettings(
  db: IndexedDbManager,
  loadData: () => Promise<void>,
  render: () => void,
): HTMLElement {
  const wrap = document.createElement('div');

  const header = document.createElement('div');
  header.className = 'page-header';
  header.innerHTML = `<h1>Settings</h1><p>Manage extension data and preferences</p>`;
  wrap.appendChild(header);

  const danger = document.createElement('div');
  danger.className = 'danger-zone';
  danger.innerHTML = `<div class="section-title">Danger Zone</div>`;

  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn-danger-action';
  resetBtn.textContent = 'Reset Database';
  resetBtn.addEventListener('click', async () => {
    if (!confirm('This will permanently delete all tracked artists and posts. Continue?')) return;
    await db.reset();
    await loadData();
    render();
  });

  danger.appendChild(resetBtn);
  wrap.appendChild(danger);

  return wrap;
}
