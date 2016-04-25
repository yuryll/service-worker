'use strict';

const find = require('lodash').find;
const fs = require('fs');

module.exports = function (storagePath) {
    const storage = require(storagePath);

    return {
        getAll: noFlushStorage(getAll.bind(this, storage)),
        add: flushStorage(storagePath, storage, add.bind(this, storage)),
        update: flushStorage(storagePath, storage, update.bind(this, storage))
    };
};

function add(storage, student) {
    const id = storage.length + 1;
    student = Object.assign({}, student, {id: id});
    storage.push(student);
    return student;
};

function getAll(storage) {
	return storage;
};

function update(storage, student) {
    const result = find(storage, (x) => x.id === student.id);

    if (!result) {
        throw new Error(`Student with id ${student.id} not found!`);
    }

    return Object.assign(result, student);
};

function flushStorage(storagePath, storageObject, fn) {
    return function () {
        let result = fn.apply(this, arguments);
        return new Promise((resolve, reject) => {
            fs.writeFile(storagePath, JSON.stringify(storageObject, null, 4), (err) => {
                if (err) return reject(err);
                resolve(result);
            });
        });
    }
}

function noFlushStorage(fn) {
    return function () {
        let result = fn.apply(this, arguments);
        return Promise.resolve(result);
    };
}
