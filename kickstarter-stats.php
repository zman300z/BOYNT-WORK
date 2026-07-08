<?php
/* ===========================================================================
   BOYNT — Kickstarter live stats relay  (kickstarter-stats.php)
   ---------------------------------------------------------------------------
   The Kickstarter page's progress bar asks this file for campaign numbers.
   It fetches Kickstarter's public stats feed for our campaign, caches it for
   5 minutes (so heavy traffic never hammers Kickstarter), and returns clean
   JSON: { pledged, goal, backers_count, state }.

   Upload into the SAME folder as index.html. No configuration needed.
   If Kickstarter blocks server fetches, the site's bar simply stays hidden.
   =========================================================================== */

header('Content-Type: application/json');
header('Cache-Control: no-store');

$CAMPAIGN   = 'https://www.kickstarter.com/projects/boynt/boynt-floating-sunglasses/stats.json?v=1';
$cacheFile  = __DIR__ . '/ks-stats-cache.json';
$ttlSeconds = 300;

// Serve fresh-enough cache without touching Kickstarter.
if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < $ttlSeconds) {
  readfile($cacheFile);
  exit;
}

$ch = curl_init($CAMPAIGN);
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_MAXREDIRS      => 3,
  CURLOPT_TIMEOUT        => 10,
  CURLOPT_USERAGENT      => 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  CURLOPT_HTTPHEADER     => ['Accept: application/json'],
]);
$res  = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$out = null;
if ($res !== false && $code < 400) {
  $start = strpos($res, '{');                 // tolerate any junk before the JSON
  $data  = $start === false ? null : json_decode(substr($res, $start), true);
  $p     = isset($data['project']) ? $data['project'] : null;
  if ($p && isset($p['pledged'], $p['goal']) && (float)$p['goal'] > 0) {
    $out = json_encode([
      'pledged'       => (float)$p['pledged'],
      'goal'          => (float)$p['goal'],
      'backers_count' => isset($p['backers_count']) ? (int)$p['backers_count'] : 0,
      'state'         => isset($p['state']) ? $p['state'] : 'live',
      'fetched_at'    => date('c'),
    ]);
  }
}

if ($out) {
  @file_put_contents($cacheFile, $out);
  echo $out;
} elseif (file_exists($cacheFile)) {
  readfile($cacheFile);                       // stale numbers beat no numbers
} else {
  http_response_code(502);
  echo json_encode(['error' => 'stats unavailable']);
}
