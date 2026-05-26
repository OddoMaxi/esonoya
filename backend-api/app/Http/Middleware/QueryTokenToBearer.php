<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class QueryTokenToBearer
{
    public function handle(Request $request, Closure $next): mixed
    {
        if (!$request->bearerToken() && $request->query('token')) {
            $request->headers->set('Authorization', 'Bearer ' . $request->query('token'));
        }

        return $next($request);
    }
}
