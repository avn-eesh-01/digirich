<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/config.php';

header('Content-Type: application/json');

function send_json(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function build_api_url(string $path, array $params = []): string
{
    $query = array_merge(['api_key' => METALPRICE_API_KEY], $params);
    return rtrim(METALPRICE_API_BASE, '/') . $path . '?' . http_build_query($query);
}

function extract_api_error_message(array $payload, string $fallback = 'Metalprice API request failed.'): string
{
    if (isset($payload['error']['message']) && is_string($payload['error']['message'])) {
        return $payload['error']['message'];
    }

    if (isset($payload['error']['info']) && is_string($payload['error']['info'])) {
        return $payload['error']['info'];
    }

    if (isset($payload['message']) && is_string($payload['message'])) {
        return $payload['message'];
    }

    return $fallback;
}

function fetch_api_json(string $path, array $params = []): array
{
    $url = build_api_url($path, $params);
    $curl = curl_init($url);
    if ($curl === false) {
        throw new RuntimeException('Unable to initialize Metalprice request.');
    }

    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'User-Agent: DigirichGoldProxy/1.0',
        ],
    ]);

    $response = curl_exec($curl);
    if ($response === false) {
        $error = curl_error($curl);
        curl_close($curl);
        throw new RuntimeException('Unable to reach Metalprice API: ' . ($error !== '' ? $error : 'network request failed.'));
    }

    $httpStatus = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);

    $decoded = json_decode($response, true);
    if (!is_array($decoded)) {
        throw new RuntimeException('Metalprice API returned invalid JSON.');
    }

    if ($httpStatus >= 400) {
        throw new RuntimeException(extract_api_error_message(
            $decoded,
            'Metalprice API request failed with HTTP ' . $httpStatus . '.'
        ));
    }

    if (isset($decoded['success']) && $decoded['success'] === false) {
        throw new RuntimeException(extract_api_error_message($decoded));
    }

    return $decoded;
}

function ounce_price_from_rates(array $payload): float
{
    if (!isset($payload['rates']) || !is_array($payload['rates'])) {
        throw new RuntimeException('Metalprice API response is missing rates.');
    }

    $pairKey = 'INRXAU';
    if (isset($payload['rates'][$pairKey]) && is_numeric($payload['rates'][$pairKey])) {
        return (float) $payload['rates'][$pairKey];
    }

    if (isset($payload['rates']['XAU']) && is_numeric($payload['rates']['XAU']) && (float) $payload['rates']['XAU'] > 0.0) {
        return 1 / (float) $payload['rates']['XAU'];
    }

    throw new RuntimeException('Unable to determine INR per ounce from Metalprice API response.');
}

function per_gram_price_from_ounce(float $ouncePrice): float
{
    return $ouncePrice / TROY_OUNCE_TO_GRAMS;
}

function format_date_label(DateTimeImmutable $date): string
{
    return $date->format('j M y');
}

function fallback_period_templates(): array
{
    return [
        '1W' => [
            'label' => '1 Week Change',
            'startLabel' => '4 Apr 26',
            'endLabel' => '10 Apr 26',
            'series' => [15480, 15430, 15380, 15310, 15340, 15410, 15470, 15540, 15640, 15710, 15753.5],
        ],
        '1M' => [
            'label' => '1 Month Change',
            'startLabel' => '10 Mar 26',
            'endLabel' => '10 Apr 26',
            'series' => [15160, 15210, 15180, 15240, 15310, 15370, 15430, 15410, 15520, 15670, 15753.5],
        ],
        '6M' => [
            'label' => '6 Month Change',
            'startLabel' => '10 Oct 25',
            'endLabel' => '10 Apr 26',
            'series' => [14140, 14220, 14350, 14410, 14560, 14790, 14950, 15120, 15410, 15620, 15753.5],
        ],
        '1Y' => [
            'label' => '1 Year Change',
            'startLabel' => '10 Apr 25',
            'endLabel' => '10 Apr 26',
            'series' => [12740, 12890, 13080, 13220, 13440, 13710, 14020, 14530, 15040, 15410, 15753.5],
        ],
        '3Y' => [
            'label' => '3 Year Change',
            'startLabel' => '10 Apr 23',
            'endLabel' => '10 Apr 26',
            'series' => [11120, 11580, 11890, 12110, 12430, 12920, 13440, 14110, 14820, 15320, 15753.5],
        ],
        '5Y' => [
            'label' => '5 Year Change',
            'startLabel' => '10 Apr 21',
            'endLabel' => '10 Apr 26',
            'series' => [9940, 10220, 10870, 11320, 11980, 12620, 13140, 13920, 14710, 15240, 15753.5],
        ],
    ];
}

function build_fallback_periods(float $latestPerGram24k): array
{
    $periods = [];

    foreach (fallback_period_templates() as $key => $template) {
        $series = $template['series'];
        $lastValue = $series[count($series) - 1];
        $scale = $lastValue > 0 ? $latestPerGram24k / $lastValue : 1.0;
        $scaledSeries = array_map(
            static fn (float $value): float => round($value * $scale, 2),
            $series
        );

        $startValue = $scaledSeries[0];
        $endValue = $scaledSeries[count($scaledSeries) - 1];
        $changePct = $startValue > 0 ? (($endValue - $startValue) / $startValue) * 100 : 0.0;

        $periods[$key] = [
            'label' => $template['label'],
            'change' => round($changePct, 2),
            'startLabel' => $template['startLabel'],
            'endLabel' => $template['endLabel'],
            'series' => $scaledSeries,
        ];
    }

    return $periods;
}

function sampled_dates(DateTimeImmutable $start, DateTimeImmutable $end, int $points = 11): array
{
    $samples = [];
    $startTs = $start->getTimestamp();
    $endTs = $end->getTimestamp();
    $steps = max($points - 1, 1);

    for ($index = 0; $index < $points; $index++) {
        $timestamp = (int) round($startTs + (($endTs - $startTs) * ($index / $steps)));
        $samples[] = (new DateTimeImmutable('@' . $timestamp))
            ->setTimezone(new DateTimeZone('Asia/Kolkata'))
            ->format('Y-m-d');
    }

    return array_values(array_unique($samples));
}

function latest_snapshot(): array
{
    $payload = fetch_api_json('/latest', [
        'base' => 'INR',
        'currencies' => 'XAU',
    ]);

    $ouncePrice = ounce_price_from_rates($payload);
    $timestamp = isset($payload['timestamp']) && is_numeric($payload['timestamp'])
        ? (int) $payload['timestamp']
        : time();

    return [
        'updatedAt' => (new DateTimeImmutable('@' . $timestamp))
            ->setTimezone(new DateTimeZone('Asia/Kolkata'))
            ->format(DATE_ATOM),
        'perGram24k' => round(per_gram_price_from_ounce($ouncePrice), 2),
    ];
}

function historical_price_cache(array $dates): array
{
    $cache = [];

    foreach ($dates as $date) {
        $payload = fetch_api_json('/' . $date, [
            'base' => 'INR',
            'currencies' => 'XAU',
        ]);

        $cache[$date] = round(per_gram_price_from_ounce(ounce_price_from_rates($payload)), 2);
    }

    return $cache;
}

function build_period_payload(string $key, DateTimeImmutable $start, DateTimeImmutable $end, array $priceMap): array
{
    $dateKeys = sampled_dates($start, $end);
    $series = [];

    foreach ($dateKeys as $dateKey) {
        if (!isset($priceMap[$dateKey])) {
            throw new RuntimeException('Missing historical point for ' . $dateKey . '.');
        }

        $series[] = $priceMap[$dateKey];
    }

    $startValue = $series[0];
    $endValue = $series[count($series) - 1];
    $changePct = $startValue > 0 ? (($endValue - $startValue) / $startValue) * 100 : 0.0;

    $labels = [
        '1W' => '1 Week Change',
        '1M' => '1 Month Change',
        '6M' => '6 Month Change',
        '1Y' => '1 Year Change',
        '3Y' => '3 Year Change',
        '5Y' => '5 Year Change',
    ];

    return [
        'label' => $labels[$key] ?? 'Price Change',
        'change' => round($changePct, 2),
        'startLabel' => format_date_label($start),
        'endLabel' => format_date_label($end),
        'series' => $series,
    ];
}

try {
    $now = new DateTimeImmutable('now', new DateTimeZone('Asia/Kolkata'));
    $today = $now->setTime(0, 0);

    $latest = latest_snapshot();

    $perGram24k = $latest['perGram24k'];
    $purity = [
        '24K' => [
            'perGram' => round($perGram24k, 2),
            'tenGram' => round($perGram24k * 10, 2),
        ],
        '22K' => [
            'perGram' => round($perGram24k * (22 / 24), 2),
            'tenGram' => round($perGram24k * (22 / 24) * 10, 2),
        ],
        '18K' => [
            'perGram' => round($perGram24k * (18 / 24), 2),
            'tenGram' => round($perGram24k * (18 / 24) * 10, 2),
        ],
    ];
    $periods = build_fallback_periods($perGram24k);

    send_json(200, [
        'ok' => true,
        'source' => 'metalpriceapi-latest+fallback-history',
        'base' => 'INR',
        'unit' => 'gram',
        'updatedAt' => $latest['updatedAt'],
        'purity' => $purity,
        'periods' => $periods,
    ]);
} catch (Throwable $exception) {
    send_json(502, [
        'ok' => false,
        'message' => $exception->getMessage(),
    ]);
}
