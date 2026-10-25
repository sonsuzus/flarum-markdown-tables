<?php

declare(strict_types=1);

/*
 * This file is part of sonsuzus/flarum-markdown-tables.
 *
 * Copyright (c) 2026 Ufuk Aksoy (sonsuzus).
 * Copyright (c) 2021 Alexander Skvortsov.
 *
 * For detailed copyright and license information, please view the
 * LICENSE.md file that was distributed with this source code.
 */

namespace Sonsuzus\MarkdownTables;

use Flarum\Extend;
use Sonsuzus\MarkdownTables\Formatter\ConfigurePipeTables;

return [
    (new Extend\Frontend('admin'))
        ->js(__DIR__.'/js/dist/admin.js')
        ->css(__DIR__.'/resources/less/admin.less'),

    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        ->css(__DIR__.'/resources/less/forum.less'),

    new Extend\Locales(__DIR__.'/resources/locale'),

    (new Extend\Formatter())
        ->configure(ConfigurePipeTables::class),
];
