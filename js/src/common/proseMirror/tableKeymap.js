/*
 * This file is part of sonsuzus/flarum-markdown-tables.
 *
 * Copyright (c) 2026 Ufuk Aksoy (sonsuzus).
 * Copyright (c) 2021 Alexander Skvortsov.
 *
 * For detailed copyright and license information, please view the
 * LICENSE.md file that was distributed with this source code.
 */

import {
  moveSelectionAfterTableCommand,
  moveToNextCellCommand,
  moveToPreviousCellCommand,
  removeTableContentCommand,
} from './commands';

export const tableKeymap = {
  'Mod-Enter': moveSelectionAfterTableCommand,
  'Shift-Enter': moveSelectionAfterTableCommand,
  Enter: moveToNextCellCommand,
  Backspace: removeTableContentCommand,
  Delete: removeTableContentCommand,
  'Mod-Backspace': removeTableContentCommand,
  'Mod-Delete': removeTableContentCommand,
  Tab: moveToNextCellCommand,
  'Shift-Tab': moveToPreviousCellCommand,
};
