document.addEventListener('DOMContentLoaded', () => {
    const addTaskForm = document.getElementById('addTaskForm');
    const taskList = document.getElementById('taskList');
    const completedTaskList = document.getElementById('completedTaskList');
    const editTaskModal = new bootstrap.Modal(document.getElementById('editTaskModal'));
    const editTaskForm = document.getElementById('editTaskForm');
    const saveEditTaskBtn = document.getElementById('saveEditTask');

    // Function to format date to DD/MM/YYYY
    const formatDate = (dateString) => {
        if (!dateString || dateString.startsWith('0000-00-00')) return '';
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    // Function to fetch and display tasks
    const fetchTasks = async () => {
        try {
            const response = await fetch('get_tasks.php');
            const tasks = await response.json();

            taskList.innerHTML = '';
            completedTaskList.innerHTML = '';

            tasks.forEach(task => {
                const taskItem = document.createElement('div');
                taskItem.classList.add('list-group-item'); // Removed flex classes to allow block layout
                
                if (task.completed == 1) {
                    taskItem.classList.add('completed');
                }

                let priorityClass = '';
                switch (task.priority) {
                    case 'High':
                        priorityClass = 'priority-high';
                        break;
                    case 'Medium':
                        priorityClass = 'priority-medium';
                        break;
                    case 'Low':
                        priorityClass = 'priority-low';
                        break;
                }

                // HTML for progress bar, action buttons, and strikethrough class are now all conditional on the task being incomplete.
                const isCompleted = task.completed == 1;

                const progressHTML = !isCompleted ? `
                    <div class="d-flex align-items-center px-3" style="flex-basis: 250px;">
                        <input type="range" class="form-range me-2" id="progress_${task.task_ID}" min="0" max="100" value="${task.progress}" data-task-id="${task.task_ID}" title="ความคืบหน้า: ${task.progress}%">
                        <span style="color: white; font-size: 0.9em; width: 45px;" id="progress-label-${task.task_ID}">${task.progress}%</span>
                    </div>
                ` : '<div class="px-3" style="flex-basis: 250px;"></div>'; // Spacer to keep alignment

                const actionsHTML = `
                    <div class="task-actions">
                        ${!isCompleted ? `
                            <button class="btn btn-sm btn-info edit-btn" data-task-id="${task.task_ID}" title="แก้ไข">
                                <i class="fas fa-edit"></i>
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-danger delete-btn" data-task-id="${task.task_ID}" title="ลบ">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;

                const strikethroughClass = isCompleted ? 'strikethrough-red' : '';

                taskItem.innerHTML = `
                    <div class="d-flex w-100 align-items-center">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" value="" id="taskCheck_${task.task_ID}" ${isCompleted ? 'checked' : ''} data-task-id="${task.task_ID}">
                        </div>
                        <div class="flex-grow-1 mx-2">
                            <label class="form-check-label" for="taskCheck_${task.task_ID}" style="cursor:pointer;">
                                <span class="task-name ${strikethroughClass}">${task.task_Name}</span>
                            </label>
                            ${task.task_Description ? `<p class="task-description mb-0 ${strikethroughClass}">${task.task_Description}</p>` : ''}
                            <div class="task-meta">
                                <span class="${priorityClass}">ความสำคัญ: ${task.priority}</span>
                                ${task.due_date && !task.due_date.startsWith('0000-00-00') ? ` | กำหนดส่ง: ${formatDate(task.due_date)}` : ''}
                                | สร้างเมื่อ: ${formatDate(task.created_at)}
                            </div>
                        </div>
                        ${progressHTML}
                        ${actionsHTML}
                    </div>
                `;

                if (task.completed == 1) {
                    completedTaskList.appendChild(taskItem);
                } else {
                    taskList.appendChild(taskItem);
                }
            });

        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    };

    // Add Task Form Submission
    addTaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(addTaskForm);

        try {
            const response = await fetch('add_task.php', {
                method: 'POST',
                body: formData,
            });
            const result = await response.json();

            if (result.success) {
                addTaskForm.reset();
                fetchTasks(); // Refresh the list
            } else {
                alert('Error: ' + result.message);
            }
        } catch (error) {
            console.error('Error adding task:', error);
            alert('An error occurred while adding the task.');
        }
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

    // Save progress on change (when mouse is released)
    document.addEventListener('change', async (e) => {
        // Progress Slider Change
        if (e.target.classList.contains('form-range')) {
            const taskId = e.target.dataset.taskId;
            const progress = e.target.value;

            try {
                const formData = new FormData();
                formData.append('taskId', taskId);
                formData.append('progress', progress);

                const response = await fetch('update_task.php', {
                    method: 'POST',
                    body: formData,
                });
                const result = await response.json();

                if (result.success) {
                    // If progress is 100 or was 100, the task moves list, so a full refresh is best
                    const taskItem = e.target.closest('.list-group-item');
                    const wasCompleted = taskItem.classList.contains('completed');
                    if (progress == 100 || (progress < 100 && wasCompleted)) {
                        fetchTasks();
                    }
                } else {
                    alert('Error updating progress: ' + result.message);
                }
            } catch (error) {
                console.error('Error updating task progress:', error);
                alert('An error occurred while updating task progress.');
            }
        }
    });

    // Event delegation for task actions (checkbox, edit, delete)
    document.addEventListener('click', async (e) => {
        // Toggle Task Completion
        if (e.target.classList.contains('form-check-input')) {
            const taskId = e.target.dataset.taskId;
            const completed = e.target.checked ? 1 : 0;

            try {
                const formData = new FormData();
                formData.append('taskId', taskId);
                formData.append('completed', completed);

                const response = await fetch('update_task.php', {
                    method: 'POST',
                    body: formData,
                });
                const result = await response.json();

                if (result.success) {
                    fetchTasks(); // Refresh the list to move task and update progress
                } else {
                    alert('Error updating status: ' + result.message);
                    e.target.checked = !e.target.checked; // Revert checkbox state
                }
            } catch (error) {
                console.error('Error updating task status:', error);
                alert('An error occurred while updating task status.');
                e.target.checked = !e.target.checked; // Revert checkbox state
            }
        }

        // Edit Task Button
        if (e.target.closest('.edit-btn')) {
            const taskId = e.target.closest('.edit-btn').dataset.taskId;
            try {
                const response = await fetch(`edit_task.php?id=${taskId}`);
                const result = await response.json();

                if (result.success && result.task) {
                    document.getElementById('editTaskId').value = result.task.task_ID;
                    document.getElementById('editTaskName').value = result.task.task_Name;
                    document.getElementById('editTaskDescription').value = result.task.task_Description || '';
                    document.getElementById('editPriority').value = result.task.priority;
                    document.getElementById('editDueDate').value = result.task.due_date || '';
                    editTaskModal.show();
                } else {
                    alert('Error fetching task for edit: ' + result.message);
                }
            } catch (error) {
                console.error('Error fetching task for edit:', error);
                alert('An error occurred while fetching task for edit.');
            }
        }

        // Delete Task Button
        if (e.target.closest('.delete-btn')) {
            const taskId = e.target.closest('.delete-btn').dataset.taskId;
            if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบงานนี้?')) {
                try {
                    const formData = new FormData();
                    formData.append('taskId', taskId);

                    const response = await fetch('delete_task.php', {
                        method: 'POST',
                        body: formData,
                    });
                    const result = await response.json();

                    if (result.success) {
                        fetchTasks(); // Refresh the list
                    } else {
                        alert('Error deleting task: ' + result.message);
                    }
                } catch (error) {
                    console.error('Error deleting task:', error);
                    alert('An error occurred while deleting the task.');
                }
            }
        }
    });

    // Save Edited Task
    saveEditTaskBtn.addEventListener('click', async () => {
        const formData = new FormData(editTaskForm);
        const taskId = document.getElementById('editTaskId').value;
        formData.append('taskId', taskId); // Ensure taskId is included

        try {
            const response = await fetch('update_task.php', {
                method: 'POST',
                body: formData,
            });
            const result = await response.json();

            if (result.success) {
                editTaskModal.hide();
                fetchTasks(); // Refresh the list
            } else {
                alert('Error saving changes: ' + result.message);
            }
        } catch (error) {
            console.error('Error saving changes:', error);
            alert('An error occurred while saving changes.');
        }
    });

    // Initial fetch of tasks when the page loads
    fetchTasks();
});