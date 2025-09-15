const messagesEl = document.getElementById("messages");
const form = document.getElementById("composer");
const promptInput = document.getElementById("prompt");
const convListEl = document.querySelector(".conv-list");
const newChatBtn = document.querySelector(".new-chat");

const ICONS = {
  conv: "./public/src/Chat_fill.svg",
  rename: "./public/src/edit.svg",
  delete: "./public/src/Trash.svg",
  add: "./public/src/Add_round_fill.svg",
  done: "./public/src/Done_round.svg",
  close: "./public/src/Close_round.svg",
  collapse: "./public/src/Off.svg",
  logoFull: "./public/src/logo-full.svg"
};

const HF_MODEL = "google/gemma-2b"; 
const HF_API_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;
const HF_API_KEY = "";

async function callHF(prompt) {
  const res = await fetch(HF_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: { max_new_tokens: 200, temperature: 0.7, return_full_text: false },
      options: { wait_for_model: true, use_cache: true },
    }),
  });
  if (!res.ok) {
    throw new Error(`HF ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  if (Array.isArray(data) && data[0]?.generated_text) return data[0].generated_text.trim();
  if (data?.generated_text) return data.generated_text.trim();
  if (typeof data === "string") return data.trim();
  if (data?.error) throw new Error(data.error);
  return "(No response from model)";
}

const state = {
  conversations: [],
  currentConvId: null,
};

function loadState() {
  const saved = JSON.parse(localStorage.getItem("conversations") || "[]");
  if (saved.length) {
    state.conversations = saved;
    state.currentConvId = saved[0].id;
  } else {
    const id = Date.now().toString();
    state.conversations = [{ id, title: "New Chat", messages: [] }];
    state.currentConvId = id;
  }
}
function saveState() {
  localStorage.setItem("conversations", JSON.stringify(state.conversations));
}

function createConversation() {
  const id = Date.now().toString();
  state.conversations.unshift({ id, title: "New Chat", messages: [] });
  state.currentConvId = id;
  saveState();
  renderConversations();
  renderMessages();
}

function selectConversation(id) {
  state.currentConvId = id;
  renderConversations();
  renderMessages();
}

function deleteConversation(id) {
  if (!confirm("Delete this conversation?")) return;
  const idx = state.conversations.findIndex((c) => c.id === id);
  if (idx > -1) {
    state.conversations.splice(idx, 1);
    if (state.conversations.length) {
      state.currentConvId = state.conversations[0].id;
    } else {
      createConversation();
    }
    saveState();
    renderConversations();
    renderMessages();
  }
}

function startEditing(convId) {
  const conv = state.conversations.find(c => c.id === convId);
  conv.editing = true;
  renderConversations();
}
function confirmEdit(convId, newTitle) {
  const conv = state.conversations.find(c => c.id === convId);
  conv.title = newTitle.trim() || conv.title;
  delete conv.editing;
  saveState();
  renderConversations();
}
function cancelEdit(convId) {
  const conv = state.conversations.find(c => c.id === convId);
  delete conv.editing;
  renderConversations();
}

function renderConversations() {
  convListEl.innerHTML = "";
  state.conversations.forEach((conv) => {
    const row = document.createElement("li");
    row.className = "conv-row";

    const item = document.createElement("div");
    item.className = "conv-item";
    if (conv.id === state.currentConvId) item.setAttribute("aria-current", "true");
    if (conv.editing) item.classList.add("editing");

    const icon = document.createElement("img");
    icon.src = ICONS.conv;
    icon.alt = "";
    icon.className = "conv-icon";
    item.appendChild(icon);

    if (!conv.editing) {

      const span = document.createElement("span");
      span.className = "conv-title";
      span.textContent = conv.title;
      item.appendChild(span);

      
      const renameIcon = document.createElement("img");
      renameIcon.src = ICONS.rename;
      renameIcon.alt = "Rename";
      renameIcon.className = "action-icon";
      renameIcon.addEventListener("click", (e) => {
        e.stopPropagation();
        startEditing(conv.id);
      });
      item.appendChild(renameIcon);

      
      const deleteIcon = document.createElement("img");
      deleteIcon.src = ICONS.delete;
      deleteIcon.alt = "Delete";
      deleteIcon.className = "action-icon";
      deleteIcon.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteConversation(conv.id);
      });
      item.appendChild(deleteIcon);

      
      item.addEventListener("click", () => selectConversation(conv.id));
    } else {
      
      const input = document.createElement("input");
      input.className = "edit-input";
      input.type = "text";
      input.value = conv.title;
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          confirmEdit(conv.id, input.value);
        } else if (e.key === "Escape") {
          cancelEdit(conv.id);
        }
      });
      item.appendChild(input);

      const confirmBtn = document.createElement("button");
      confirmBtn.className = "confirm-btn";
      confirmBtn.type = "button";
      confirmBtn.innerHTML = `<img src="${ICONS.done}" alt="Done"/>`;
      confirmBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        confirmEdit(conv.id, input.value);
      });
      item.appendChild(confirmBtn);

      const cancelBtn = document.createElement("button");
      cancelBtn.className = "cancel-btn";
      cancelBtn.type = "button";
      cancelBtn.innerHTML = `<img src="${ICONS.close}" alt="Cancel"/>`;
      cancelBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        cancelEdit(conv.id);
      });
      item.appendChild(cancelBtn);
    }

    row.appendChild(item);
    convListEl.appendChild(row);
  });
}


function renderMessages() {
  const conv = state.conversations.find((c) => c.id === state.currentConvId);
  messagesEl.innerHTML = "";
  conv.messages.forEach((m) => {
    const li = document.createElement("li");
    li.className = `msg ${m.role}`;
    if (m.role === "ai") {
      const icon = document.createElement("img");
      icon.className = "msg-icon";
      icon.src = "./public/src/logo-small.svg";
      icon.alt = "";

      const bubble = document.createElement("div");
      bubble.className = "bubble";
      bubble.textContent = m.content;

      li.appendChild(icon);
      li.appendChild(bubble);
    } else {
      const bubble = document.createElement("div");
      bubble.className = "bubble";
      bubble.textContent = m.content;
      li.appendChild(bubble);
    }
    messagesEl.appendChild(li);
  });
  messagesEl.scrollTop = messagesEl.scrollHeight;
}


form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = promptInput.value.trim();
  if (!text) return;
  const conv = state.conversations.find((c) => c.id === state.currentConvId);

  conv.messages.push({ role: "user", content: text });
  if (conv.title === "New Chat" && conv.messages.length === 1) {
    conv.title = text.slice(0, 25) + (text.length > 25 ? "…" : "");
  }
  promptInput.value = "";
  renderMessages();
  renderConversations();
  saveState();

  const typingId = Symbol("typing");
  conv.messages.push({ role: "ai", content: "…", typingId });
  renderMessages();

  let reply;
  try {
    reply = await callHF(text);
  } catch (err) {
    console.warn("HF error:", err);
    reply = await localEcho(text);
  }

  const idx = conv.messages.findIndex((m) => m.typingId === typingId);
  if (idx !== -1) conv.messages.splice(idx, 1, { role: "ai", content: reply });
  renderMessages();
  saveState();
});


async function localEcho(input) {
  if (/movie|film/i.test(input)) return "My favorite movie is The Godfather Part II. What's yours?";
  if (/hello|hi|salut|holà|halo/i.test(input)) return "Heyyy! How can I help you today?";
  return `You said: "${input}". I’m a placeholder bot for now 🤖`;
}

newChatBtn.addEventListener("click", createConversation);
loadState();
renderConversations();
renderMessages();

if (window.innerWidth <= 600) {
  document.querySelector('.app').classList.add('collapsed');
}

function toggleSidebar() {
  document.querySelector('.app').classList.toggle('collapsed');
}

document.querySelector('.collapse-btn-open')?.addEventListener('click', toggleSidebar);
document.querySelector('.collapse-btn-closed')?.addEventListener('click', toggleSidebar);
