/* Application */

var last = 0;

function getFormData(form) {
    return [].reduce.call(
        form.querySelectorAll('input, textarea'),
        (result, formElement) => {
            result[formElement.name] = formElement.value;
            return result;
        }, {}
    );
}

function updateStudentsList(studentsData) {
    const studentsHTML = studentsData.map(renderStudent).join('');

    [].forEach.call(
        document.querySelectorAll('.students__list'),
        (container) => {
            container.innerHTML = studentsHTML;
        }
    );
}

function delegate(containers, selector, event, handler) {
    [].forEach.call(containers, (container) => {
        container.addEventListener(event, function (e) {
            if (e.target.matches(selector)) {
                handler.apply(e.target, arguments);
            }
        });
    });
}

function onStudentAddClick(e) {
    e.preventDefault();

    getStudentData(this.closest('form'))
        .then((student) => {
            student.div_id = last++;
            document.getElementsByClassName('students__list')[0].innerHTML += renderStudent(student);
            return student;
        })
        .then(addStudent)
        .then((response) => {
            [].forEach.call(
                this.closest('form').querySelectorAll('input, textarea'),
                (x) => x.value = ''
            );
        });
}

function onStudentUpdateClick(e) {
    const studentContainer = this.closest('.student');
    const studentData = studentContainer.dataset.student;
    console.log('updating ', studentData);
    studentContainer.innerHTML = renderStudentForm(JSON.parse(studentData));
}

function onStudentSaveClick(e) {
    e.preventDefault();

    const studentContainer = this.closest('.student');
    const studentData = getFormData(this.closest('form'));

    getStudentData(this.closest('form'))
        .then((student) => {
            student.div_id = last++;
            const newStudentsContainer = document.createElement('div');
            newStudentsContainer.innerHTML = renderStudent(student);
            const newStudentContainer = newStudentsContainer.removeChild(newStudentsContainer.querySelector('.student'));
            const studentsContainer = studentContainer.parentElement;
            studentsContainer.insertBefore(newStudentContainer, studentContainer);
            studentsContainer.removeChild(studentContainer);
            return student;
        })
        .then(updateStudent)
        .catch((e) => {
            if (!(e instanceof ValidationError)) {
                console.error(e);
                alert('Что-то пошло не так!');
            }
        });
}

function renderStudent(student) {
    if (!!student.picSrc) {
        student.picture = student.picSrc;
    }
    let loaded = (student.id !== undefined);
    let div_id = (student.div_id !== undefined) ? `id=${student.div_id}` : ``;
    return `
        <div ${div_id} class="student" data-student='${JSON.stringify(student)}' data-loaded='${loaded}'>
            <div class="student__picture">
                <img src="${student.picture}">
            </div>
            <div class="student__info">
                <h2 class="student__name">${student.name}</h2>
                <p class="student__bio">${student.bio}</p>
                <button class="student__update-btn">Изменить</button>
            </div>
            <div class='status-indicator'></div>
        </div>
    `;
}

function renderStudentForm(student) {
    return `
        <form class="student__update-form student-form">
            <input type="hidden" name="id" value="${student.id}">
            <label class="student-form__field student-form__field-name">
                <span class="student-form__field-label">Имя</span><input type="text" name="name" value="${student.name}">
            </label>
            <label class="student-form__field student-form__field-picture">
                <span class="student-form__field-label">URL фотографии</span><input type="text" name="picture" value="${student.picture}">
            </label>
            <label class="student-form__field student-form__field-bio">
                <span class="student-form__field-label">Кратко о себе</span><textarea name="bio" rows="5" cols="40">${student.bio}</textarea>
            </label>
            <button class="student__save-btn">Сохранить</button>
        </form>
    `;
}

function getStudentData(form) {
    return new Promise((resolve, reject) => {
        [].forEach.call(form.querySelectorAll('.student-form__field'), (field) => {
            field.classList.remove('student-form__field_error');
        });

        const student = getFormData(form);
        const validationResult = validateStudent(student);

        if (validationResult === true) {
            resolve(student);
        } else {
            form.querySelector('.student-form__field-' + validationResult.prop)
                .classList.add('student-form__field_error');

            reject(validationResult);
        }
    });
}

function validateStudent(student) {
    try {
        validate(student, 'name', 'Не заполнено имя студента');
        validate(student, 'picture', 'Неправильный адрес фотографии студента');
        validate(student, 'bio', 'Не заполнена биография');
    } catch (e) {
        if (e instanceof ValidationError) {
            return e;
        }

        throw e;
    }

    return true;
}

function validate(obj, prop, msg) {
    if (obj.hasOwnProperty(prop) && validators[prop] && !validators[prop](obj[prop], obj)) {
        throw new ValidationError(prop, msg);
    }
}

const validators = {
    name: (value, obj) => {
        return Boolean(value);
    },
    picture: (value, obj) => {
        if (!value) return false;
        if (!/^https?:\/\//.test(value)) return false;
        return true;
    },
    bio: (value, obj) => {
        return Boolean(value);
    }
};

function ValidationError(prop, message) {
  this.name = 'ValidationError';
  this.prop = prop;
  this.message = message || 'Произошла ошибка валидации';
  this.stack = (new Error()).stack;
}
ValidationError.prototype = Object.create(Error.prototype);
ValidationError.prototype.constructor = ValidationError;

/* API accessors */

function json(response) { 
    return response.json(); 
}

function getStudents() {
    return fetch('/api/v1/students')
        .then(json)
        .catch((e) => {
            console.log(e);
        });
}

function addStudent(student) {
    return fetch('/api/v1/students', {
        method: 'post',
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        },
        body: JSON.stringify(student)
    }).then(json);
}

function updateStudent(student) {
    return fetch(`/api/v1/students/${student.id}`, {
        method: 'put',
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        },
        body: JSON.stringify(student)
    }).then(json);
}

document.addEventListener('DOMContentLoaded', (event) => {

    delegate(
        document.querySelectorAll('.students'),
        '.students__add-btn',
        'click',
        onStudentAddClick
    );

    delegate(
        document.querySelectorAll('.students'),
        '.student__update-btn',
        'click',
        onStudentUpdateClick
    );

    delegate(
        document.querySelectorAll('.students'),
        '.student__save-btn',
        'click',
        onStudentSaveClick
    );

    getStudents().then(updateStudentsList);
});
