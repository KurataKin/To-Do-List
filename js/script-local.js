document.addEventListener('DOMContentLoaded', () => {
    const addTaskForm = document.getElementById('addTaskForm');
    const taskList = document.getElementById('taskList');
    const completedTaskList = document.getElementById('completedTaskList');
    const editTaskModal = new bootstrap.Modal(document.getElementById('editTaskModal'));
    const editTaskForm = document.getElementById('editTaskForm');
    const saveEditTaskBtn = document.getElementById('saveEditTask');

    // Load tasks from localStorage or initialize an empty array
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    // Function to save tasks to localStorage
    const saveTasks = () => {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    };

    // Function to format date to DD/MM/YYYY
    const formatDate = (dateString) => {
        if (!dateString || dateString.startsWith('0000-00-00')) return '';
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    // Function to render tasks on the page
    const renderTasks = () => {
        taskList.innerHTML = '';
        completedTaskList.innerHTML = '';

        tasks.forEach(task => {
            const taskItem = document.createElement('div');
            taskItem.classList.add('list-group-item');
            if (task.completed) {
                taskItem.classList.add('completed');
            }

            let priorityClass = '';
            switch (task.priority) {
                case 'High': priorityClass = 'priority-high'; break;
                case 'Medium': priorityClass = 'priority-medium'; break;
                case 'Low': priorityClass = 'priority-low'; break;
            }

            const isCompleted = task.completed;
            const strikethroughClass = isCompleted ? 'strikethrough-red' : '';

            const progressHTML = !isCompleted ? `
                <div class="d-flex align-items-center px-3" style="flex-basis: 250px;">
                    <input type="range" class="form-range me-2" id="progress_${task.id}" min="0" max="100" value="${task.progress}" data-task-id="${task.id}" title="ความคืบหน้า: ${task.progress}%">
                    <span style="color: white; font-size: 0.9em; width: 45px;" id="progress-label-${task.id}">${task.progress}%</span>
                </div>
            ` : '<div class="px-3" style="flex-basis: 250px;"></div>';

            const actionsHTML = `
                <div class="task-actions">
                    ${!isCompleted ? `<button class="btn btn-sm btn-info edit-btn" data-task-id="${task.id}" title="แก้ไข"><i class="fas fa-edit"></i></button>` : ''}
                    <button class="btn btn-sm btn-danger delete-btn" data-task-id="${task.id}" title="ลบ"><i class="fas fa-trash-alt"></i></button>
                </div>
            `;

            taskItem.innerHTML = `
                <div class="d-flex w-100 align-items-center">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" value="" id="taskCheck_${task.id}" ${isCompleted ? 'checked' : ''} data-task-id="${task.id}">
                    </div>
                    <div class="flex-grow-1 mx-2">
                        <label class="form-check-label" for="taskCheck_${task.id}" style="cursor:pointer;">
                            <span class="task-name ${strikethroughClass}">${task.name}</span>
                        </label>
                        ${task.description ? `<p class="task-description mb-0 ${strikethroughClass}">${task.description}</p>` : ''}
                        <div class="task-meta">
                            <span class="${priorityClass}">ความสำคัญ: ${task.priority}</span>
                            ${task.dueDate && !task.dueDate.startsWith('0000-00-00') ? ` | กำหนดส่ง: ${formatDate(task.dueDate)}` : ''}
                            | สร้างเมื่อ: ${formatDate(task.createdAt)}
                        </div>
                    </div>
                    ${progressHTML}
                    ${actionsHTML}
                </div>
            `;

            if (task.completed) {
                completedTaskList.appendChild(taskItem);
            } else {
                taskList.appendChild(taskItem);
            }
        });
    };

    // Add Task Form Submission
    addTaskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const taskName = document.getElementById('taskName').value;
        const taskDescription = document.getElementById('taskDescription').value;
        const priority = document.getElementById('priority').value;
        const dueDate = document.getElementById('dueDate').value;

        const newTask = {
            id: Date.now(), // Simple unique ID
            name: taskName,
            description: taskDescription,
            priority: priority,
            dueDate: dueDate,
            createdAt: new Date().toISOString(),
            progress: 0,
            completed: false
        };

        tasks.push(newTask);
        saveTasks();
        renderTasks();
        addTaskForm.reset();
    });

    // Live update for progress label
    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('form-range')) {
            const taskId = e.target.dataset.taskId;
            const progressValue = e.target.value;
            const progressLabel = document.getElementById(`progress-label-${taskId}`);
            if (progressLabel) {
                progressLabel.textContent = `${progressValue}%`;
            }
        }
    });

    // Save progress on change
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('form-range')) {
            const taskId = parseInt(e.target.dataset.taskId);
            const progress = parseInt(e.target.value);
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                task.progress = progress;
                if (progress === 100) {
                    task.completed = true;
                }
                saveTasks();
                renderTasks();
            }
        }
    });

    // Event delegation for task actions
    document.addEventListener('click', (e) => {
        const target = e.target;

        // Toggle Task Completion
        if (target.classList.contains('form-check-input')) {
            const taskId = parseInt(target.dataset.taskId);
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                task.completed = target.checked;
                if(task.completed) {
                    task.progress = 100;
                }
                saveTasks();
                renderTasks();
            }
        }

        // Edit Task Button
        if (target.closest('.edit-btn')) {
            const taskId = parseInt(target.closest('.edit-btn').dataset.taskId);
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                document.getElementById('editTaskId').value = task.id;
                document.getElementById('editTaskName').value = task.name;
                document.getElementById('editTaskDescription').value = task.description || '';
                document.getElementById('editPriority').value = task.priority;
                // For flatpickr, you need to set the date on the instance if you want to show it
                const editDueDateInstance = document.querySelector("#editDueDate")._flatpickr;
                editDueDateInstance.setDate(task.dueDate);
                editTaskModal.show();
            }
        }

        // Delete Task Button
        if (target.closest('.delete-btn')) {
            const taskId = parseInt(target.closest('.delete-btn').dataset.taskId);
            if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบงานนี้?')) {
                tasks = tasks.filter(t => t.id !== taskId);
                saveTasks();
                renderTasks();
            }
        }
    });

    // Save Edited Task
    saveEditTaskBtn.addEventListener('click', () => {
        const taskId = parseInt(document.getElementById('editTaskId').value);
        const task = tasks.find(t => t.id === taskId);

        if (task) {
            task.name = document.getElementById('editTaskName').value;
            task.description = document.getElementById('editTaskDescription').value;
            task.priority = document.getElementById('editPriority').value;
            task.dueDate = document.getElementById('editDueDate').value;
            saveTasks();
            renderTasks();
            editTaskModal.hide();
        }
    });

    // Initial render of tasks
    renderTasks();
});
