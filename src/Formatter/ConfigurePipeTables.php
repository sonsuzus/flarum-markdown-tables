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

namespace Sonsuzus\MarkdownTables\Formatter;

use s9e\TextFormatter\Configurator;

class ConfigurePipeTables
{
    public function __invoke(Configurator $config): void
    {
        // Enable s9e/TextFormatter PipeTables plugin for Markdown table rendering.
        /** @phpstan-ignore-next-line */
        $config->PipeTables;
    }
}
