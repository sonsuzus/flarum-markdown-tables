/*
 * This file is part of sonsuzus/flarum-markdown-tables.
 *
 * Copyright (c) 2026 Ufuk Aksoy (sonsuzus).
 * Copyright (c) 2021 Alexander Skvortsov.
 *
 * For detailed copyright and license information, please view the
 * LICENSE.md file that was distributed with this source code.
 */

import app from 'flarum/common/app';
import { extend, override } from 'flarum/common/extend';
import createTableDropdown from './components/TableDropdown';
import { tableKeymap } from './proseMirror/tableKeymap';
import {
  tableBodyNodeSpec,
  tableCellNodeSpec,
  tableHeaderNodeSpec,
  tableHeadNodeSpec,
  tableNodeSpec,
  tableRowNodeSpec,
} from './proseMirror/tableSchema';
import getRichText from './utils/getRichText';

export default function configureRichText() {
  const richText = getRichText();
  if (!richText) return;

  const { ProseMirrorMenu } = richText.components || {};
  const TableDropdownComponent = createTableDropdown();

  if (ProseMirrorMenu && TableDropdownComponent) {
    extend(ProseMirrorMenu.prototype, 'items', function (items) {
      items.add(
        'table',
        <TableDropdownComponent
          type="table"
          icon="fas fa-table"
          tooltip={app.translator.trans('sonsuzus-markdown-tables.lib.composer.table_tooltip')}
          state={this.attrs.state}
        />,
        10
      );
    });
  }

  const markdown = richText.proseMirror?.markdown;
  if (!markdown) return;

  const { MarkdownSerializerBuilder, MarkdownParserBuilder, SchemaBuilder } = markdown;

  if (MarkdownSerializerBuilder) {
    extend(MarkdownSerializerBuilder.prototype, 'buildNodes', function (nodes) {
      const richTextSchema = this.schema;

      nodes.table = function table(state, node) {
        function serializeTableHead(head) {
          let columnAlignments = [];
          head.forEach((headRow) => {
            if (headRow.type === richTextSchema.nodes.table_row) {
              columnAlignments = serializeTableRow(headRow);
            }
          });

          for (const alignment of columnAlignments) {
            state.write('|');
            state.write(alignment === 'left' || alignment === 'center' ? ':' : ' ');
            state.write('---');
            state.write(alignment === 'right' || alignment === 'center' ? ':' : ' ');
          }
          state.write('|');
          state.ensureNewLine();
        }

        function serializeTableBody(body) {
          body.forEach((bodyRow) => {
            if (bodyRow.type === richTextSchema.nodes.table_row) {
              serializeTableRow(bodyRow);
            }
          });
          state.ensureNewLine();
        }

        function serializeTableRow(row) {
          const columnAlignment = [];
          row.forEach((cell) => {
            if (cell.type === richTextSchema.nodes.table_header || cell.type === richTextSchema.nodes.table_cell) {
              const alignment = serializeTableCell(cell);
              columnAlignment.push(alignment);
            }
          });
          state.write('|');
          state.ensureNewLine();
          return columnAlignment;
        }

        function serializeTableCell(cell) {
          state.write('| ');
          state.renderInline(cell);
          state.write(' ');

          return findAlignment(cell);
        }

        function findAlignment(cell) {
          const alignment = cell.attrs.style;
          if (!alignment) {
            return null;
          }

          const match = alignment.match(/text-align:[ ]?(left|right|center)/);
          if (match && match[1]) {
            return match[1];
          }

          return null;
        }

        node.forEach((tableChild) => {
          if (tableChild.type.name === 'table_head') serializeTableHead(tableChild);
          if (tableChild.type.name === 'table_body') serializeTableBody(tableChild);
        });

        state.ensureNewLine();
        state.write('\n');
      };
    });
  }

  if (MarkdownParserBuilder) {
    extend(MarkdownParserBuilder.prototype, 'buildTokens', function (tokens) {
      Object.assign(tokens, {
        table: {
          block: 'table',
        },
        thead: {
          block: 'table_head',
        },
        tbody: {
          block: 'table_body',
        },
        th: {
          block: 'table_header',
          getAttrs: (tok) => ({
            style: tok.attrGet('style'),
          }),
        },
        tr: {
          block: 'table_row',
        },
        td: {
          block: 'table_cell',
          getAttrs: (tok) => ({
            style: tok.attrGet('style'),
          }),
        },
      });
    });

    extend(MarkdownParserBuilder.prototype, 'buildTokenizer', function (tokenizer) {
      tokenizer.enable('table');
    });
  }

  if (SchemaBuilder) {
    override(SchemaBuilder.prototype, 'buildNodes', function (original) {
      const nodes = original();

      return nodes
        .addBefore('image', 'table', tableNodeSpec)
        .addBefore('image', 'table_head', tableHeadNodeSpec)
        .addBefore('image', 'table_body', tableBodyNodeSpec)
        .addBefore('image', 'table_row', tableRowNodeSpec)
        .addBefore('image', 'table_cell', tableCellNodeSpec)
        .addBefore('image', 'table_header', tableHeaderNodeSpec);
    });
  }

  const ProseMirrorEditorDriver = richText.proseMirror?.ProseMirrorEditorDriver;
  if (ProseMirrorEditorDriver && typeof richText.keymap === 'function') {
    extend(ProseMirrorEditorDriver.prototype, 'buildPluginItems', function (items) {
      items.add('tableKeymap', richText.keymap(tableKeymap), 10);
    });
  }
}
