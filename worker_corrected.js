var CACHE_NAME = 'shri-2016-task3-1';

var urlsToCache = [
  '/',
  '/css/index.css',
  '/js/index.js',
  '/api/v1/students'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', function(event) {
    const requestURL = new URL(event.request.url);

    if (/^\/api\/v1/.test(requestURL.pathname)
        && (event.request.method !== 'GET' && event.request.method !== 'HEAD')) {
        return event.respondWith(
             fetch(event.request)
                .then((response) => {
                    let adding_response = response.clone();
                    return fetchAndPutToCache('api/v1/students')
                        .then((students_list) => response);
                })
        );
    }

    if (/^\/api\/v1/.test(requestURL.pathname)) {
        return event.respondWith(
            Promise.race([
                fetchAndPutToCache(event.request),
                getFromCache(event.request)
            ])
        );
    }

    return event.respondWith(
        getFromCache(event.request).catch(fetchAndPutToCache)
    );
});

function fetchAndPutToCache(request) {
    return fetch(request).then((response) => {
        const responseToCache = response.clone();
        return caches.open(CACHE_NAME)
            .then((cache) => {
                cache.put(request, responseToCache);
            })
            .then(() => response);
    })
    .catch(() => caches.match(request));
}

function getFromCache(request) {
    return caches.match(request)
        .then((response) => {
            if (response) {
                return response;
            }

            return Promise.reject(request);
        });
}
