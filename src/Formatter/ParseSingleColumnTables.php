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

use s9e\TextFormatter\Parser;

/**
 * Adds support for single-column Markdown pipe tables (`| Header |`) which
 * s9e/TextFormatter's built-in PipeTables plugin ignores by default, and
 * normalizes non-breaking spaces (U+00A0) inside pipe-table rows.
 */
class ParseSingleColumnTables
{
    public function __invoke(Parser $parser, mixed $context, string $text): string
    {
    // Normalize non-breaking spaces (U+00A0) on pipe-table lines.
    if (str_contains($text, '|') && str_contains($text, "\u{00A0}")) {
        $normalized = preg_replace_callback(
            '/^[ \t\x{00A0}]*\|.*\|[ \t\x{00A0}]*$/mu',
            static fn (array $m): string => str_replace("\u{00A0}", ' ', $m[0]),
            $text
        );

        if ($normalized !== null) {
            $text = $normalized;
        }
    }

    // Metinde tek sütunlu tablo ayırıcı satırı (| --- |) yoksa hiçbir şey yapma.
    if (!preg_match('/^[ \t\x{00A0}]*\|[ \t\x{00A0}]*:?-+:?[ \t\x{00A0}]*\|[ \t\x{00A0}]*$/mu', $text)) {
        return $text;
    }

    $parser->registerParser(
        'SingleColumnPipeTables',
        function (string $rawText) use ($parser): void {
            $this->parseSingleColumnTables($parser, $rawText);
        }
    );

    return $text;
    }

    private function parseSingleColumnTables(Parser $parser, string $text): void
    {
        if (!str_contains($text, '|') || !str_contains($text, '-')) {
            return;
        }

        // Mask fenced code blocks (``` or ~~~) with equal-length spaces so byte
        // offsets remain identical while preventing false matches in code blocks.
        $maskedText = (string) preg_replace_callback(
            '/(?:^|\n)[ \t]*(?:`{3,}|~{3,})[\s\S]*?(?:\n[ \t]*(?:`{3,}|~{3,})[ \t]*(?=\r?\n|$)|$)/',
            static fn (array $m): string => str_repeat(' ', strlen($m[0])),
            $text
        );

        $pattern = '/(?:^|(?<=\n))([ \t\x{00A0}]*\|[^|\r\n]+\|[ \t\x{00A0}]*\r?\n[ \t\x{00A0}]*\|[ \t\x{00A0}]*:?-+:?[ \t\x{00A0}]*\|[ \t\x{00A0}]*(?:\r?\n[ \t\x{00A0}]*\|[^|\r\n]*\|[ \t\x{00A0}]*)+)(?=\r?\n|$)/u';

        if (!preg_match_all($pattern, $maskedText, $matches, PREG_SET_ORDER | PREG_OFFSET_CAPTURE)) {
            return;
        }

        foreach ($matches as $match) {
            $blockText = $match[1][0];
            $blockOffset = (int) $match[1][1];

            if (!preg_match_all('/[^\r\n]+/', $blockText, $lineMatches, PREG_OFFSET_CAPTURE)) {
                continue;
            }

            $lines = $lineMatches[0];
            if (count($lines) < 3) {
                continue;
            }

            $headerLine = $lines[0][0];
            $hStart = $blockOffset + (int) $lines[0][1];
            $hLen = strlen($headerLine);
            $hEnd = $hStart + $hLen;

            $sepLine = $lines[1][0];
            $align = $this->parseAlignment($sepLine);

            $firstBodyStart = $blockOffset + (int) $lines[2][1];
            $lastIdx = count($lines) - 1;
            $tableEnd = $blockOffset + (int) $lines[$lastIdx][1] + strlen($lines[$lastIdx][0]);

            // Create outer TABLE and THEAD tags
            $parser->addTagPair('TABLE', $hStart, 0, $tableEnd, 0, -100);
            $parser->addTagPair('THEAD', $hStart, 0, $hEnd, 0, -90);
            $parser->addTagPair('TR', $hStart, 0, $hEnd, 0, -80);

            [$leftLen, $rightLen] = $this->getCellPipeLengths($headerLine);
            $th = $parser->addTagPair('TH', $hStart, $leftLen, $hEnd - $rightLen, $rightLen, -70);
            if ($align !== null) {
                $th->setAttribute('align', $align);
            }

            // Ignore separator line and surrounding line breaks
            $parser->addIgnoreTag($hEnd, $firstBodyStart - $hEnd);

            // Create TBODY and body rows
            $parser->addTagPair('TBODY', $firstBodyStart, 0, $tableEnd, 0, -90);

            for ($i = 2; $i <= $lastIdx; $i++) {
                $rowLine = $lines[$i][0];
                $rStart = $blockOffset + (int) $lines[$i][1];
                $rLen = strlen($rowLine);
                $rEnd = $rStart + $rLen;

                $parser->addTagPair('TR', $rStart, 0, $rEnd, 0, -80);

                [$leftLen, $rightLen] = $this->getCellPipeLengths($rowLine);
                $td = $parser->addTagPair('TD', $rStart, $leftLen, $rEnd - $rightLen, $rightLen, -70);
                if ($align !== null) {
                    $td->setAttribute('align', $align);
                }

                if ($i < $lastIdx) {
                    $nextStart = $blockOffset + (int) $lines[$i + 1][1];
                    $parser->addIgnoreTag($rEnd, $nextStart - $rEnd);
                }
            }
        }
    }

    private function parseAlignment(string $sepLine): ?string
    {
        if (preg_match('/(:?)-+(:?)/', $sepLine, $m)) {
            $left = $m[1] === ':';
            $right = $m[2] === ':';
            if ($left && $right) {
                return 'center';
            }
            if ($left) {
                return 'left';
            }
            if ($right) {
                return 'right';
            }
        }

        return null;
    }

    /**
     * @return array{0: int, 1: int}
     */
    private function getCellPipeLengths(string $line): array
    {
        $lineLen = strlen($line);

        $leftLen = preg_match('/^[ \t\x{00A0}]*\|[ \t\x{00A0}]*/u', $line, $mLeft)
            ? strlen($mLeft[0])
            : 1;
        $rightLen = preg_match('/[ \t\x{00A0}]*\|[ \t\x{00A0}]*$/u', $line, $mRight)
            ? strlen($mRight[0])
            : 1;

        if ($leftLen + $rightLen > $lineLen) {
            $leftLen = preg_match('/^[ \t\x{00A0}]*\|/u', $line, $mLeft)
                ? strlen($mLeft[0])
                : 1;
            $rightLen = preg_match('/\|[ \t\x{00A0}]*$/u', $line, $mRight)
                ? strlen($mRight[0])
                : 1;
        }

        return [$leftLen, $rightLen];
    }
}
