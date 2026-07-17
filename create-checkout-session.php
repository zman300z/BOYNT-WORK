<?php
/* ===========================================================================
   BOYNT — Stripe Checkout endpoint  (create-checkout-session.php)
   ---------------------------------------------------------------------------
   WHAT IT DOES
     The cart's "Checkout" button sends the items here. This file creates a
     secure Stripe Checkout Session and returns its URL, then the browser
     redirects the customer to Stripe's hosted, PCI-compliant payment page.

   HOW TO TURN IT ON  (see STRIPE_SETUP.md for the friendly version)
     Do NOT put your secret key in this file — this file is tracked in git
     and gets replaced on every deploy. Instead, create ONE extra file named
     stripe-config.php in this same folder on the server:

         <?php
         $STRIPE_SECRET_KEY = 'sk_live_YOUR_REAL_KEY';

     That file is never in git and never touched by deploys.
   No Composer / no SDK needed — it talks to Stripe directly.
   =========================================================================== */

// ---- 1. KEY & URLS ----------------------------------------------------------
// Placeholder only. The real key comes from stripe-config.php (see above).
$STRIPE_SECRET_KEY = 'sk_test_REPLACE_WITH_YOUR_SECRET_KEY';

$SUCCESS_URL = 'https://boynt.com/?checkout=success';
$CANCEL_URL  = 'https://boynt.com/?checkout=cancel';

// Load the real key (and optional URL overrides) from the untracked config.
$__cfg = __DIR__ . '/stripe-config.php';
if (file_exists($__cfg)) { require $__cfg; }

// ---- 2. PRICE LIST (the source of truth) -----------------------------------
// Prices are set HERE on the server, in dollars. The browser cannot change
// them — this is what stops anyone editing a price before they pay.
// If you change a price on the site, change it here too.
$PRICES = [
  'The Classics — Matte Black'    => 25,
  'The Classics — Ocean Blue'     => 28,
  'The Classics — Driftwood Sand' => 30,
  'The Drifters — Matte Black'    => 30,
  'The Drifters — Seafoam'        => 32,
  'The Drifters — Storm Grey'     => 35,
  'The Currents — Matte Black'     => 35,
  'The Currents — Deep Ocean Blue' => 38,
  'The Currents — Driftwood Sand'  => 40,
];

// ---------------------------------------------------------------------------
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'Method not allowed']);
  exit;
}

$body  = json_decode(file_get_contents('php://input'), true);
$items = isset($body['items']) ? $body['items'] : [];
if (!is_array($items) || count($items) === 0) {
  http_response_code(400);
  echo json_encode(['error' => 'Your cart is empty']);
  exit;
}

// Build the Stripe request using SERVER-side prices only.
$params = [
  'mode'        => 'payment',
  'success_url' => $SUCCESS_URL,
  'cancel_url'  => $CANCEL_URL,
  'shipping_address_collection' => ['allowed_countries' => ['US', 'CA']],
];

$i = 0;
foreach ($items as $item) {
  $name = isset($item['name']) ? trim($item['name']) : '';
  $qty  = isset($item['qty']) ? max(1, intval($item['qty'])) : 1;

  if (!isset($PRICES[$name])) {
    http_response_code(400);
    echo json_encode(['error' => 'Unknown item: ' . $name]);
    exit;
  }

  $cents = intval(round($PRICES[$name] * 100));
  $params["line_items[$i][quantity]"] = $qty;
  $params["line_items[$i][price_data][currency]"] = 'usd';
  $params["line_items[$i][price_data][unit_amount]"] = $cents;
  $params["line_items[$i][price_data][product_data][name]"] = $name;
  if (!empty($item['image'])) {
    $params["line_items[$i][price_data][product_data][images][0]"] = $item['image'];
  }
  $i++;
}

// Call the Stripe API.
$ch = curl_init('https://api.stripe.com/v1/checkout/sessions');
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST           => true,
  CURLOPT_USERPWD        => $STRIPE_SECRET_KEY . ':',
  CURLOPT_POSTFIELDS     => http_build_query($params),
]);
$response = curl_exec($ch);
$status   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

if ($response === false) {
  http_response_code(502);
  echo json_encode(['error' => 'Could not reach Stripe: ' . $curlErr]);
  exit;
}

$data = json_decode($response, true);
if ($status >= 400) {
  http_response_code($status);
  echo json_encode(['error' => isset($data['error']['message']) ? $data['error']['message'] : 'Stripe error']);
  exit;
}

echo json_encode(['url' => $data['url']]);
