/*
 * This file is part of sonsuzus/flarum-markdown-tables.
 *
 * Copyright (c) 2026 Ufuk Aksoy (sonsuzus).
 * Copyright (c) 2021 Alexander Skvortsov.
 *
 * For detailed copyright and license information, please view the
 * LICENSE.md file that was distributed with this source code.
 */

/**
 * Populates `data-label` attributes on each `<td>` cell using the
 * corresponding `<th>` text content in the same table.
 *
 * @param {HTMLElement | Document} root
 */
export default function applyTableDataLabels(root = document) {
  if (!root || typeof root.getElementsByTagName !== 'function') return;

  const tables = root.getElementsByTagName('table');

  for (const table of tables) {
    const labels = [];

    for (const th of table.getElementsByTagName('th')) {
      labels.push(th.textContent || '');
    }

    for (const tr of table.getElementsByTagName('tr')) {
      let colIndex = 0;
      for (const td of tr.getElementsByTagName('td')) {
        td.setAttribute('data-label', labels[colIndex++] || '');
      }
    }
  }
}
