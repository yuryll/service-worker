
# **Задание 3**

-----
###Исправление ошибок

После того, как я запустил приложение, в консоли браузера появилось сообщение об ошибке установки service worker из-за синтаксической ошибки.
>**Uncaught SyntaxError: missing ) after argument list**

----------
Вот те строки с ошибкой:

        return event.respondWith(
        getFromCache(event.request).catch(fetchAndPutToCache);
    );
**Если удалить точку с запятой, то SW сможет запуститься**.
Далее, если снова запустить приложение, то появляются ошибки, что 2 файла не найдены (те, которые SW пытался добавить в кэш). Попытки указывать файлы относительно корневой директории или относительно SW ни к чему не привели, и я решил почитать на MDN об использовании service worker. В одной из начальных статей я заметил, что SW может делать запросы только в пределах своего location, и рекомендуется хранить его в корневой папке проекта. 
**После перемещения в корневую папку и изменения путей**, SW заработал, но появились новые ошибки. Я решил начать с простого: разобраться, почему картинка не грузится. Расставил точки останова и стал выполнять SW по шагам, чтобы понять, что происходит, когда поступает запрос. Так как картинка -- это не запрос к API, то когда браузер запрашивает картинку, всегда выполняются следующие строки:

        return event.respondWith(
        getFromCache(event.request).catch(fetchAndPutToCache);
    );
В которых в начале была синтаксическая ошибка. 
Так как при установке изображения не были добавлены в кэш, в результате выполнения `getFromCache(event.request)` будет возвращен `Promise.reject()`, и так как он не передает в `catch` никакой ошибки, функция 	`fetchAndPutToCache` будет вызвана без аргументов, и запрос не будет выполнен.
Самый короткий способ это исправить - в функции `getFromCache` написать `return Promise.reject(request)` вместо `return Promise.reject()`. Тогда когда нужный запрос не будет найден в кэшэ, она будет поднимать исключение, передавая в `catch()` не ошибку, а исходный запрос, и `fetchAndPutToCache` выполнится корректно.
Можно было также написать 

        return event.respondWith(
        getFromCache(event.request).catch(() => fetchAndPutToCache(event.request));
    );
Теперь ошибки в консоли будут появляться только после первой перезагрузки страницы, а именно: ошибка `GET` при запросе `api/v1/students`. Далее я перечитал код service-worker, и посмотрел описание функции `Promice.race()`. Так как она возвращает первый выполненный или прерванный Promice, она может всегда возвращать `getFromCache(event.request)`, который будет возвращать `Promice.reject()`  при первом запросе к списку студентов, так как он еще не сохранен в кэшэ. Можно просто **добавить его в кэш при установке service worker** (так же, как и файлы index.js, index.css).
После этого остается единственная проблема -- при добавлении студента он не показывается до обновления страницы.  Почитав index.js я понял, что после добавления студента список обновляется, и `Promice.race()` возвращает еще не обновленный список из кэша.
После добавления студента можно всегда обновлять список, и тогда этой проблемы не будет. Таким образом, нужно **заменить этот код**:

        if (/^\/api\/v1/.test(requestURL.pathname)
        && (event.request.method !== 'GET' && event.request.method !== 'HEAD')) {
        return event.respondWith(fetch(event.request));
    }

**на этот**


    if (/^\/api\/v1/.test(requestURL.pathname)
        && (event.request.method !== 'GET' && event.request.method !== 'HEAD')) {
        return event.respondWith(
             fetch(event.request)
                .then((response) => {
                    return fetchAndPutToCache('api/v1/students')
                        .then((students_list) => response);
                })
        );
    }

который после добавления обновляет список, и после этого возвращает ответ сервера на предыдущий запрос (добавления студента). 

Реализация дополнительного задания подходит под все требования основного, но для удобства, **`worker_corrected.js`** - код, после всех исправлений, приведенных выше

------------------------------------------------------

#**Дополнительное задание**

-----------

Для реализации дополнительного задания я внес небольшие изменения в index.js:  теперь после добавления студента он выводится без ожидания ответа сервера. 

Реализован класс очереди, в которой хранятся запросы, пока сервер недоступен, и которые последовательно выполняются когда появляется соединение. Для хранения запросов используется localforage, так как localStorage нельзя использовать в service worker из-за синхронности.

В интерфейс добавлен статус загрузки, который показывает, записан ли студент на сервере, или находится в очереди:

![enter image description here](http://cs630619.vk.me/v630619575/27a7a/mNYeKkh0YKA.jpg)


Когда добавляется новый студент, index.js выводит div с ним (на картинке слева), присваивая div уникальный id = x, и отправляя вместе с ним запрос к service worker.

Когда в service worker приходит запрос, он добавляет его в очередь. Когда очередь дойдет до этого запроса и он успешно выполнится, SW отправит всем клиентам (окнам или вкладкам) сообщение о том, что этот студент добавлен (которому соответствует div с id = x), и все клиенты изменят статус этого студента на "загружен" (справа на картинке). 

Так же в сообщении содержится id студента, который ему присвоил сервер. Так как очередь хранится в localforage, студенты, которые были добавлены в оффлайне не пропадут после закрытия окна или браузера. 
При запросе списка студентов, функция `completeData(response)` внутри service worker дополняет список студентов из кэша или с сервера студентами, которые находятся в очереди.

-----
####**Файлы**:
`js/queue.js` - класс очереди

`worker.js` - внесены изменения, а так же добавлена функция `completeData(response)` 

`js/sync.js` - ловит сообщения от SW и меняет статус студента на "загружен"

**Установка:**
git clone, npm intall, npm start.

