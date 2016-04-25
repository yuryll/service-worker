navigator.serviceWorker.addEventListener('message', (event) => {
    var report = event.data;
    var student_div_id = report.request.student.div_id;
    var student_id = report.response.id;
    var student_div = document.getElementById(student_div_id);
    if (student_div !== null) {
        student_div.dataset.loaded = true;
        let student = JSON.parse(student_div.dataset.student);
        student.id = student_id;
        student_div.dataset.student = JSON.stringify(student);
    }
    else {
        getStudents().then(updateStudentsList);
    }
});

document.addEventListener('online', () => {
    navigator.serviceWorker.postMessage('online');
})