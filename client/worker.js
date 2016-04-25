var CACHE_NAME = 'shri-2016-task3-1';

var urlsToCache = [
  '/',
  '/api/v1/students',
  '/css/index.css',
  '/js/index.js',
  '/js/sync.js',
  '/pix/loading.png',
  '/pix/done.png'
];

importScripts('/js/queue.js');

var Queue = new RequestQueue();

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                return Queue.init();
            })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});


self.addEventListener('fetch', function(event) {
    const requestURL = new URL(event.request.url);

    if (/^\/api\/v1/.test(requestURL.pathname)
        && (event.request.method !== 'GET' && event.request.method !== 'HEAD')) {
        var myBlob = new Blob([JSON.stringify({})]);
        var fake_response = new Response(myBlob,{"status": 200});
        let clone = event.request.clone();
        event.respondWith(fake_response);
        Queue.push(clone);
        return;
    }

    if (/^\/api\/v1/.test(requestURL.pathname)) {
        return event.respondWith(
            Promise.race([
                fetchAndPutToCache(event.request).then(completeData),
                getFromCache(event.request).then(completeData)
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

/**
 * Дополняет список студентами из очереди (они еще не добавлены на сервер, поэтому не могли появиться в кэшэ)
 * @param кэшированный или настоящий ответ сервера со списком студентов
 */

function completeData(response) {
    let cur_data;
    return response.json()
        .then((response_data) => {
            cur_data = response_data;
            return localforage.getItem('queue');
        })
        .then((queue) => {
            queue.forEach((request_data) => {
                if (request_data.method === 'POST') {
                    cur_data.push(request_data.student);
                }
            });
            let blob = new Blob([JSON.stringify(cur_data)]);
            let full_response = new Response(blob, {status: 200});
            return full_response;
        });
}
