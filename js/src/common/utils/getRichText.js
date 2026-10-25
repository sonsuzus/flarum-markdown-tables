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
 * Safely retrieves the Rich Text extension exports from Flarum's runtime
 * extension registry without requiring the legacy `useExtensions` Webpack option.
 *
 * @returns {Record<string, any> | null}
 */
export default function getRichText() {
  if (typeof flarum === 'undefined' || !flarum.extensions) {
    return null;
  }

  return flarum.extensions['askvortsov-rich-text'] || null;
}
