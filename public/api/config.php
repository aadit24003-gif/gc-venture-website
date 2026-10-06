<?php
/**
 * Server-side settings for the enquiry handler.
 * Keep these in sync with CONTACT in src/config/site.ts.
 * This file is not web-accessible (see api/.htaccess).
 */
return [
    // Who receives each form
    'recipients' => [
        'quote'   => ['support@gcventure.in'],
        'support' => ['support@gcventure.in'],
    ],
    // From address must be a mailbox on a domain your host is allowed to send for
    'from_email' => 'no-reply@itrentals.in',
    'from_name'  => 'IT Rental Solutions website',

    // Accept submissions only from these hosts (Origin / Referer check)
    'allowed_hosts' => ['itrentals.in', 'www.itrentals.in', 'localhost'],

    // Abuse protection: max submissions per IP in the window
    'rate_limit'        => 6,
    'rate_window_secs'  => 600,

    // Attachments (support form)
    'max_upload_bytes'  => 5 * 1024 * 1024,
    'allowed_mime'      => ['image/jpeg', 'image/png', 'application/pdf'],

    // Every submission is also appended here, so no lead is lost if email fails.
    // Directory is protected by api/data/.htaccess. Move outside public_html if your host allows.
    'log_file' => __DIR__ . '/data/enquiries.csv',
];
