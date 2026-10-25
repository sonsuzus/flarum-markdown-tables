/*
 * This file is part of sonsuzus/flarum-markdown-tables.
 *
 * Copyright (c) 2026 Ufuk Aksoy (sonsuzus).
 * Copyright (c) 2021 Alexander Skvortsov.
 *
 * For detailed copyright and license information, please view the
 * LICENSE.md file that was distributed with this source code.
 */

import app from 'flarum/admin/app';
import configureRichText from '../common/configureRichText';

app.initializers.add('sonsuzus-markdown-tables', () => {
  configureRichText();
});
