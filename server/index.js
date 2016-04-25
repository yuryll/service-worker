'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const students = require('./students')(path.join(__dirname, './data/students.json'));

const app = express();

app.set('json spaces', 4);
app.set('x-powered-by', false);
app.set('etag', getEtag);
app.use(express.static(path.join(__dirname, '../client')));
app.use(bodyParser.json());

app.get('/api/v1/students', (req, res) => {
    console.log('GET /api/v1/students')
    students.getAll().then((result) => res.json(result));
});

app.post('/api/v1/students', (req, res, next) => {
    const student = parseStudentFromRequest(req);
    console.log('POST /api/v1/students', student);
    students.add(student).then((result) => res.json(result));
});

app.put('/api/v1/students/:id', (req, res, next) => {
    const student = parseStudentFromRequest(req);
    const studentId = Number(req.params.id);
    console.log(`PUT /api/v1/students/${studentId}`, student);
    student.id = studentId;
    students.update(student).then((result) => res.json(result));
});

app.listen(8080, () => {
    console.log('Server listening on port 8080!');
});

function parseStudentFromRequest(req, res) {
    return {
        name: req.body.name,
        picSrc: req.body.picture,
        bio: req.body.bio
    };
}

function getEtag(body, encoding) {
    var operationalTable = [
        [0,   3,   1,   7,   5,   9,   8,   6,   4,   2],
        [7,   0,   9,   2,   1,   5,   4,   8,   6,   3],
        [4,   2,   0,   6,   8,   7,   1,   3,   5,   9],
        [1,   7,   5,   0,   9,   8,   3,   4,   2,   6],
        [6,   1,   2,   3,   0,   4,   5,   9,   7,   8],
        [3,   6,   7,   4,   2,   0,   9,   5,   8,   1],
        [5,   8,   6,   9,   7,   2,   0,   1,   3,   4],
        [8,   9,   4,   5,   3,   6,   2,   0,   1,   7],
        [9,   4,   3,   8,   6,   1,   7,   2,   0,   5],
        [2,   5,   8,   1,   4,   3,   6,   7,   9,   0]
    ];

    var response = body.toString();

    var etag = [
        response.substr(0, 5)
            .split('')
            .map((x) => x.charCodeAt(0))
            .join(''),
        '-',
        response
            .split('')
            .map((x) => x.charCodeAt(0))
            .join('')
            .split('')
            .reduce((a, x) => operationalTable[a][x], 0)
    ].join('');

    return etag;
}
