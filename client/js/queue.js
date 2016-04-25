importScripts('/js/localforage.min.js');

/**
 * @param запрос из localforage в формате JSON
 * @returns Request Object для отправки на сервер
 */

function deserialize(request_data) {
    return new Request(request_data.url, {
        method: request_data.method,
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        },
        body: JSON.stringify(request_data.student)
    });
}

/**
 * @param Request Object, запрос добавления или изменения студента
 * @returns возвращает его в JSON для совместимости с localforage
 */

function serialize(request) {
    return request.json()
        .then((student) => {
            let url = '/api/v1/students';
            if (request.method === 'PUT') {
                url += `/${student.id}`;
            }
            return {
                url: url,
                student: student,
                method: request.method
            }
        });
}

/**
 * сообщает всем открытым клиентам (вкладкам или окнам браузера), что запрос о добавлениии
 * или изменении был выполнен успешно. Если это был запрос добавления, то report содержит
 * в том числе и выданный сервером id студента
 * 
 * @param содержит копию запроса и ответа в json
 */

function notifyCluent(report) {
    return clients.matchAll().then((clientList) => {
        clientList.forEach((client) => {
            client.postMessage(report);
        });
    });
}

class RequestQueue {
    
    constructor() {
    }
    
    /**
     * Инициализирует очередь, в localforage по ключу "queue" записывается пустой массив, если его не было
     * Инициализирует this.size - текущий размер очереди
     */
    
    init() {
        return localforage.getItem('queue')
            .then((queue) => {
                queue = queue || [];
                this.size = queue.length;
                return localforage.setItem('queue', queue);
            });
    }
    
    /**
     * @returns первый запрос в очереди
     */
    
    top() {
        return localforage.getItem('queue')
            .then((queue) => {
                return !queue ? null : queue[0];
            })
    }
    
    /**
     * @param Request Object, запрос о добавлении или изменении
     * @returns обещание, что запрос будет добавлен в очередь
     */
    
    push(request) {
        let serialized;
        serialize(request)
            .then((request_data) => {
                serialized = request_data;
                return localforage.getItem('queue');
            })
            .then((queue) => {
                queue.push(serialized);
                return localforage.setItem('queue', queue);
            })
            .then((queue) => {
                this.size = queue.length;
                if (this.size === 1) {
                    this.flush();
                }
            })
            .catch((err) => {
                console.log('Ошибка при добавлении запроса в очередь:', err);
            })
    }
    
    /**
     * Вызывается после успешного выполнения запроса, удаляет его из очереди
     * @returns обещание, что будет удален первый элемент очереди
     */
    
    pop() {
        return localforage.getItem('queue')
            .then((queue) => {
                queue.shift();
                this.size = queue.length;
                return localforage.setItem('queue', queue);
            })
    }
    
    /**
     * Последовательно выполняет запросы из очереди
     *  
     */
    
    flush() {
        if (this.size === 0) {
            return;
        }
        this.top()
            .then((request_data) => {
                return this.makeRequest(request_data);
            })
            .then(() => {
                return this.pop()
            })
            .then(() => {
                console.log('Выполнен 1 запрос из очереди');
                this.flush();
            })
            .catch((err) => {
                // Ошибка должна возникнуть в случае, если сервер был недоступен
                console.log("Запрос из очереди не выполнен, повтор через 0.5с, ошибка: ", err);
                return this.continueLater();
            })
    }
    
    /**
     * @param запрос из очереди
     * @returns обещание, что запрос будет выполнен успешно
     */
    
    makeRequest(request_data) {
        let request = deserialize(request_data);
        return this.tryToFetch(request)
            .then((response_data) => {
                return notifyCluent({
                    response: response_data,
                    request: request_data
                });
            });
    }
    
    /**
     * Непосредствено выполняет запрос из очереди
     * @param запрос, готовый к отправке на сервер
     * @returns обещание, что запрос будет выполнен успешно
     */
    
    tryToFetch(request) {
        if (!navigator.onLine) {
            return Promise.reject();
        }
        return fetch(request)
            .then((response) => response.json())
    }
    
    /**
     * Вызывает выполнение очереди через 0.5c
     */
    
    continueLater() {
        setTimeout(() => { this.flush(); }, 500);
    }
    
}