/*
 * This file is part of sonsuzus/flarum-markdown-tables.
 *
 * Copyright (c) 2026 Ufuk Aksoy (sonsuzus).
 * Copyright (c) 2021 Alexander Skvortsov.
 *
 * For detailed copyright and license information, please view the
 * LICENSE.md file that was distributed with this source code.
 */

import getRichText from '../utils/getRichText';

function tableNodes(schema) {
  return [
    schema.nodes.table,
    schema.nodes.table_head,
    schema.nodes.table_body,
    schema.nodes.table_row,
    schema.nodes.table_cell,
    schema.nodes.table_header,
  ];
}

export function inTable(state) {
  return tableNodes(state.schema).includes(state.selection.$head.parent.type);
}

function inTableHead(state) {
  return state.selection.$head.parent.type === state.schema.nodes.table_header;
}

export function moveSelectionAfterTableCommand(state, dispatch) {
  return exitTableCommand(state, dispatch, false);
}

export function moveSelectionBeforeTableCommand(state, dispatch) {
  return exitTableCommand(state, dispatch, true);
}

function exitTableCommand(state, dispatch, before = false) {
  const schema = state.schema;

  if (!inTable(state)) {
    return false;
  }

  if (dispatch) {
    const richText = getRichText();
    if (!richText || !richText.Selection) return false;

    // Hierarchy: table > table_head | table_body > table_row > table_cell
    const type = schema.nodes.paragraph;
    const newPosition = before ? state.selection.$head.before(-3) - 1 : state.selection.$head.after(-3) + 1;
    const tr = state.tr;

    try {
      tr.doc.resolve(newPosition);
    } catch (e) {
      const insertionPosition = before ? newPosition + 1 : newPosition - 1;
      tr.insert(insertionPosition, type.create());
    }

    tr.setSelection(richText.Selection.near(tr.doc.resolve(Math.max(0, newPosition)), 1));
    dispatch(tr.scrollIntoView());
  }

  return true;
}

export function insertTableRowBeforeCommand(state, dispatch) {
  return insertTableRowCommand(true, state, dispatch);
}

export function insertTableRowAfterCommand(state, dispatch) {
  return insertTableRowCommand(false, state, dispatch);
}

function insertTableRowCommand(before, state, dispatch) {
  const schema = state.schema;

  if (!inTable(state) || inTableHead(state)) {
    return false;
  }

  if (dispatch) {
    const { $head } = state.selection;
    const tableRowNode = $head.node(-1);

    const newTableCells = [];
    tableRowNode.forEach((cell) => {
      newTableCells.push(schema.nodes.table_cell.create(cell.attrs));
    });

    const newTableRow = schema.nodes.table_row.create(null, newTableCells);
    const positionToInsert = before ? $head.before(-1) : $head.after(-1);
    const tr = state.tr.insert(positionToInsert, newTableRow);

    dispatch(tr.scrollIntoView());
  }

  return true;
}

export function insertTableColumnAfterCommand(state, dispatch) {
  return insertTableColumnCommand(false, state, dispatch);
}

export function insertTableColumnBeforeCommand(state, dispatch) {
  return insertTableColumnCommand(true, state, dispatch);
}

function insertTableColumnCommand(before, state, dispatch) {
  const schema = state.schema;

  if (!inTable(state)) {
    return false;
  }

  if (dispatch) {
    const $head = state.selection.$head;
    const selectedTable = $head.node(-3);
    const selectedCellIndex = $head.index(-1);

    const newCells = [];
    const tableOffset = $head.start(-3);
    let targetCell;

    selectedTable.descendants((node, pos) => {
      if (!tableNodes(schema).includes(node.type)) {
        return false;
      }

      if (node.type === schema.nodes.table_row) {
        targetCell = node.child(selectedCellIndex);
      }

      if (targetCell && node === targetCell) {
        const position = before ? selectedTable.resolve(pos + 1).before() : selectedTable.resolve(pos + 1).after();
        newCells.push([node.type, tableOffset + position]);
      }
    });

    let tr = state.tr;
    for (const newCell of newCells.reverse()) {
      tr = tr.insert(newCell[1], newCell[0].create());
    }

    dispatch(tr.scrollIntoView());
  }

  return true;
}

export function removeRowCommand(state, dispatch) {
  if (!inTable(state) || inTableHead(state)) {
    return false;
  }

  if (dispatch) {
    const tr = state.tr;
    const $head = state.selection.$head;

    if ($head.node(-2).childCount === 1) {
      return removeTableCommand(state, dispatch);
    }

    tr.delete($head.start(-1) - 1, $head.end(-1) + 1);
    dispatch(tr.scrollIntoView());
  }

  return true;
}

export function removeColumnCommand(state, dispatch) {
  const schema = state.schema;

  if (!inTable(state)) {
    return false;
  }

  if (dispatch) {
    const $head = state.selection.$head;
    const table = $head.node(-3);

    if ($head.node(-1).childCount === 1) {
      return removeTableCommand(state, dispatch);
    }

    const cellIndex = $head.index(-1);
    let targetCell;
    const resolvedPositions = [];
    const tableOffset = $head.start(-3);

    table.descendants((node, pos) => {
      if (!tableNodes(schema).includes(node.type)) {
        return false;
      }

      if (node.type === schema.nodes.table_row) {
        targetCell = node.childCount >= cellIndex + 1 ? node.child(cellIndex) : null;
      }

      if (targetCell && node === targetCell) {
        resolvedPositions.push(table.resolve(pos + 1));
      }
    });

    let tr = state.tr;
    for (const cellPosition of resolvedPositions.reverse()) {
      tr = tr.delete(tableOffset + cellPosition.start() - 1, tableOffset + cellPosition.end() + 1);
    }

    dispatch(tr.scrollIntoView());
  }

  return true;
}

export function removeTableContentCommand(state, dispatch) {
  if (!inTable(state)) {
    return false;
  }

  const { $from, $to } = state.selection;

  if ($from.start(-3) >= $from.pos - 3 && $from.end(-3) <= $to.pos + 3) {
    return removeTableCommand(state, dispatch);
  }

  if ($from.start(-1) >= $from.pos - 1 && $from.end(-1) <= $to.pos + 1) {
    return removeRowCommand(state, dispatch);
  }

  if (!$from.sameParent($to)) {
    return true;
  }

  return false;
}

function moveToCellCommand(state, dispatch, direction) {
  if (direction !== -1 && direction !== 1) {
    return false;
  }

  if (!inTable(state)) return false;

  const richText = getRichText();
  if (!richText || !richText.Selection) return false;

  const $head = state.selection.$head;

  for (let level = -1; level > -4; level--) {
    const parentIndex = $head.index(level);
    const parent = $head.node(level);

    if (!parent) continue;

    const nodeOffset = 2;
    const target = parent.maybeChild(parentIndex + direction);

    if (!target) continue;

    const newPos = direction === -1 ? $head.start() - nodeOffset * (level * -1) : $head.end() + nodeOffset * (level * -1);

    if (dispatch) {
      dispatch(state.tr.setSelection(richText.Selection.near(state.tr.doc.resolve(newPos), 1)).scrollIntoView());
    }

    return true;
  }

  if (direction === 1) {
    return moveSelectionAfterTableCommand(state, dispatch);
  }

  return moveSelectionBeforeTableCommand(state, dispatch);
}

export function moveToPreviousCellCommand(state, dispatch) {
  return moveToCellCommand(state, dispatch, -1);
}

export function moveToNextCellCommand(state, dispatch) {
  return moveToCellCommand(state, dispatch, +1);
}

function removeTableCommand(state, dispatch) {
  const $head = state.selection.$head;
  if (dispatch) {
    dispatch(state.tr.deleteRange($head.start(-3) - 1, $head.end(-3) + 1));
  }

  return true;
}

export function insertTableCommand(numRows = 4, numCols = 3, labelCells = true) {
  const safeRows = Math.max(2, Number.isFinite(numRows) ? numRows : 4);
  const safeCols = Math.max(1, Number.isFinite(numCols) ? numCols : 3);

  return (state, dispatch) => {
    const schema = state.schema;

    if (!dispatch) return true;

    let headerIndex = 1;
    let cellIndex = 1;
    const cell = () => schema.nodes.table_cell.create(null, schema.text(labelCells ? `cell ${cellIndex++}` : ' '));
    const header = () => schema.nodes.table_header.create(null, schema.text(labelCells ? `header ${headerIndex++}` : ' '));
    const row = (...cells) => schema.nodes.table_row.create(null, cells);
    const head = (r) => schema.nodes.table_head.create(null, r);
    const body = (...rows) => schema.nodes.table_body.create(null, rows);
    const table = (h, b) => schema.nodes.table.createChecked(null, [h, b]);
    const paragraph = () => schema.nodes.paragraph.create(null);

    const t = table(
      head(row(...Array(safeCols).fill(0).map(header))),
      body(
        ...Array(safeRows - 1)
          .fill(0)
          .map(() => row(...Array(safeCols).fill(0).map(cell)))
      )
    );

    let tr = state.tr.replaceSelectionWith(t);
    dispatch(tr.scrollIntoView());

    const newState = state.apply(tr);
    const nodeAfterTable = newState.doc.nodeAt(newState.tr.selection.to - 1);
    if (nodeAfterTable && nodeAfterTable.type === schema.nodes.text) {
      tr = newState.tr.insert(newState.tr.selection.to, paragraph());
      dispatch(tr.scrollIntoView());
    }

    return true;
  };
}
