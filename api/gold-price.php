<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

const GOLD_PRICE_CACHE_TTL = 900;
const GOLD_PRICE_CACHE_FILE = __DIR__ . '/cache/gold-price.json';

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

function fetch_api_json(string $path, array $params = []): array
{
    $url = build_api_url($path, $params);
    $responseHeaders = [];
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 20,
            'ignore_errors' => true,
            'header' => "Accept: application/json\r\nUser-Agent: DigirichGoldProxy/1.0\r\n",
        ],
    ]);

    $response = @file_get_contents($url, false, $context);
    if (isset($http_response_header) && is_array($http_response_header)) {
        $responseHeaders = $http_response_header;
    }

    if ($response === false) {
        throw new RuntimeException('Unable to reach Metalprice API.');
    }

    $decoded = json_decode($response, true);
    if (!is_array($decoded)) {
        throw new RuntimeException('Metalprice API returned invalid JSON.');
    }

    if (isset($decoded['success']) && $decoded['success'] === false) {
        $message = 'Metalprice API request failed.';
        if (isset($decoded['error']['info']) && is_string($decoded['error']['info'])) {
            $message = $decoded['error']['info'];
        } elseif (isset($decoded['error']['message']) && is_string($decoded['error']['message'])) {
            $message = $decoded['error']['message'];
        } elseif (isset($decoded['message']) && is_string($decoded['message'])) {
            $message = $decoded['message'];
        }

        $code = 0;
        if (isset($decoded['error']['code']) && is_numeric($decoded['error']['code'])) {
            $code = (int) $decoded['error']['code'];
        }

        if (!empty($responseHeaders[0]) && is_string($responseHeaders[0])) {
            $message .= ' [' . $responseHeaders[0] . ']';
        }

        throw new RuntimeException($message, $code);
    }

    return $decoded;
}

function ensure_cache_directory(): void
{
    $directory = dirname(GOLD_PRICE_CACHE_FILE);
    if (!is_dir($directory)) {
        mkdir($directory, 0777, true);
    }
}

function read_cache(): ?array
{
    if (!is_file(GOLD_PRICE_CACHE_FILE)) {
        return null;
    }

    $contents = @file_get_contents(GOLD_PRICE_CACHE_FILE);
    if ($contents === false) {
        return null;
    }

    $decoded = json_decode($contents, true);
    if (!is_array($decoded) || !isset($decoded['payload']) || !is_array($decoded['payload'])) {
        return null;
    }

    return $decoded;
}

function write_cache(array $payload): void
{
    ensure_cache_directory();
    @file_put_contents(
        GOLD_PRICE_CACHE_FILE,
        json_encode([
            'cachedAt' => time(),
            'payload' => $payload,
        ], JSON_UNESCAPED_SLASHES)
    );
}

function fresh_cache_payload(): ?array
{
    $cache = read_cache();
    if ($cache === null || !isset($cache['cachedAt']) || !is_numeric($cache['cachedAt'])) {
        return null;
    }

    if ((time() - (int) $cache['cachedAt']) > GOLD_PRICE_CACHE_TTL) {
        return null;
    }

    return $cache['payload'];
}

function stale_cache_payload(): ?array
{
    $cache = read_cache();
    if ($cache === null) {
        return null;
    }

    return $cache['payload'];
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
    $freshCache = fresh_cache_payload();
    if ($freshCache !== null) {
        send_json(200, $freshCache);
    }

    $now = new DateTimeImmutable('now', new DateTimeZone('Asia/Kolkata'));
    $today = $now->setTime(0, 0);

    $latest = latest_snapshot();

    $periodRanges = [
        '1W' => $today->sub(new DateInterval('P6D')),
        '1M' => $today->sub(new DateInterval('P1M')),
        '6M' => $today->sub(new DateInterval('P6M')),
        '1Y' => $today->sub(new DateInterval('P1Y')),
        '3Y' => $today->sub(new DateInterval('P3Y')),
        '5Y' => $today->sub(new DateInterval('P5Y')),
    ];

    $requiredDates = [$today->format('Y-m-d')];
    foreach ($periodRanges as $startDate) {
        foreach (sampled_dates($startDate, $today) as $sampleDate) {
            $requiredDates[] = $sampleDate;
        }
    }

    $historicalPrices = historical_price_cache(array_values(array_unique($requiredDates)));
    $todayKey = $today->format('Y-m-d');
    $historicalPrices[$todayKey] = $latest['perGram24k'];

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

    $periods = [];
    foreach ($periodRanges as $key => $startDate) {
        $periods[$key] = build_period_payload($key, $startDate, $today, $historicalPrices);
    }

    $payload = [
        'ok' => true,
        'source' => 'metalpriceapi',
        'base' => 'INR',
        'unit' => 'gram',
        'updatedAt' => $latest['updatedAt'],
        'purity' => $purity,
        'periods' => $periods,
    ];

    write_cache($payload);
    send_json(200, $payload);
} catch (Throwable $exception) {
    $staleCache = stale_cache_payload();
    if ($staleCache !== null) {
        $staleCache['cached'] = true;
        $staleCache['stale'] = true;
        $staleCache['warning'] = $exception->getMessage();
        send_json(200, $staleCache);
    }

    send_json(502, [
        'ok' => false,
        'errorCode' => $exception->getCode(),
        'message' => $exception->getMessage(),
    ]);
}
