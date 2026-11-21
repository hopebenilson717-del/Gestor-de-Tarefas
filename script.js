const STORAGE_KEY = "taskflow_tasks_v1";
let tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
let activeFilter = "all";
let editingId = null;

const $ = (selector) => document.querySelector(selector);
const taskList = $("#taskList");
const modal = $("#modal");
const form = $("#taskForm");

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
}

function formatDate(date) {
  if (!date) return "";
  return new Date(`${date}T00:00:00`).toLocaleDateString("pt-PT", {
    day: "2-digit", month: "short", year: "numeric"
  });
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2300);
}

function render() {
  const completed = tasks.filter(task => task.completed).length;
  const pending = tasks.length - completed;
  $("#totalCount").textContent = tasks.length;
  $("#pendingCount").textContent = pending;
  $("#completedCount").textContent = completed;
  $("#navAll").textContent = tasks.length;
  $("#navPending").textContent = pending;
  $("#navCompleted").textContent = completed;

  const query = $("#searchInput").value.trim().toLowerCase();
  let visible = tasks.filter(task => {
    const matchesFilter = activeFilter === "all" ||
      (activeFilter === "pending" && !task.completed) ||
      (activeFilter === "completed" && task.completed);
    const matchesSearch = `${task.title} ${task.description}`.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });

  const sort = $("#sortSelect").value;
  visible.sort((a, b) => {
    if (sort === "oldest") return a.createdAt - b.createdAt;
    if (sort === "due") return (a.due || "9999").localeCompare(b.due || "9999");
    return b.createdAt - a.createdAt;
  });

  taskList.innerHTML = visible.map(task => {
    const dueDate = task.due ? formatDate(task.due) : "Sem data limite";
    const overdue = task.due && task.due < new Date().toISOString().slice(0, 10) && !task.completed;
    const priority = { high: "Alta", normal: "Normal", low: "Baixa" }[task.priority];
    return `
      <article class="task-item ${task.completed ? "is-done" : ""}">
        <button class="check-btn ${task.completed ? "done" : ""}" data-action="toggle" data-id="${task.id}" aria-label="Alterar conclusão">${task.completed ? "✓" : ""}</button>
        <div class="task-info">
          <p class="task-title">${escapeHTML(task.title)}</p>
          ${task.description ? `<p class="task-description">${escapeHTML(task.description)}</p>` : ""}
        </div>
        <div class="task-meta"><span class="badge ${task.priority}">${priority}</span><span class="due ${overdue ? "overdue" : ""}">${overdue ? "Atrasada · " : ""}${dueDate}</span></div>
        <div class="task-actions">
          <button class="icon-btn" data-action="edit" data-id="${task.id}" aria-label="Editar tarefa" title="Editar">✎</button>
          <button class="icon-btn" data-action="delete" data-id="${task.id}" aria-label="Eliminar tarefa" title="Eliminar">⌫</button>
        </div>
      </article>`;
  }).join("");

  $("#emptyState").classList.toggle("hidden", visible.length !== 0);
  taskList.classList.toggle("hidden", visible.length === 0);
  document.querySelectorAll("[data-filter]").forEach(button => {
    button.classList.toggle("selected", button.dataset.filter === activeFilter);
    if (button.classList.contains("nav-item")) button.classList.toggle("active", button.dataset.filter === activeFilter);
  });
}

function openModal(task = null) {
  editingId = task ? task.id : null;
  $("#modalTitle").textContent = task ? "Editar tarefa" : "Nova tarefa";
  $("#saveBtn").textContent = task ? "Guardar alterações" : "Guardar tarefa";
  $("#taskTitle").value = task?.title || "";
  $("#taskDescription").value = task?.description || "";
  $("#taskPriority").value = task?.priority || "normal";
  $("#taskDue").value = task?.due || "";
  modal.classList.remove("hidden");
  setTimeout(() => $("#taskTitle").focus(), 50);
}

function closeModal() {
  modal.classList.add("hidden");
  form.reset();
  editingId = null;
}

form.addEventListener("submit", event => {
  event.preventDefault();
  const title = $("#taskTitle").value.trim();
  if (!title) return;
  const data = {
    title,
    description: $("#taskDescription").value.trim(),
    priority: $("#taskPriority").value,
    due: $("#taskDue").value
  };
  if (editingId !== null) {
    tasks = tasks.map(task => task.id === editingId ? { ...task, ...data } : task);
    showToast("Tarefa actualizada com sucesso.");
  } else {
    tasks.unshift({ id: Date.now(), ...data, completed: false, createdAt: Date.now() });
    showToast("Nova tarefa adicionada.");
  }
  saveTasks();
  closeModal();
  render();
});

taskList.addEventListener("click", event => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const id = Number(button.dataset.id);
  const action = button.dataset.action;
  const task = tasks.find(item => item.id === id);
  if (!task) return;

  if (action === "toggle") {
    task.completed = !task.completed;
    showToast(task.completed ? "Tarefa concluída. Muito bem!" : "Tarefa voltou para por fazer.");
  } else if (action === "edit") {
    openModal(task);
    return;
  } else if (action === "delete") {
    if (!confirm(`Queres mesmo eliminar "${task.title}"?`)) return;
    tasks = tasks.filter(item => item.id !== id);
    showToast("Tarefa eliminada.");
  }
  saveTasks();
  render();
});

document.querySelectorAll("[data-filter]").forEach(button => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    render();
  });
});

$("#openFormBtn").addEventListener("click", () => openModal());
$("#emptyAddBtn").addEventListener("click", () => openModal());
$("#closeModal").addEventListener("click", closeModal);
$("#cancelBtn").addEventListener("click", closeModal);
modal.addEventListener("click", event => { if (event.target === modal) closeModal(); });
$("#searchInput").addEventListener("input", render);
$("#sortSelect").addEventListener("change", render);

$("#todayLabel").textContent = new Date().toLocaleDateString("pt-PT", {
  weekday: "long", day: "numeric", month: "long"
}).toUpperCase();

render();
