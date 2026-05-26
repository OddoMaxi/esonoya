<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/server-ip', function () {
    $ip = file_get_contents('https://api.ipify.org');
    return response()->json(['outbound_ip' => $ip]);
});
