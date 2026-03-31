const API_BASE = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5000';
const API_URL = `${API_BASE}/api/posts`;

let selectedFiles = [];

const imagesInput = document.getElementById("images");
const thumbs = document.getElementById("thumbs");
const dropZone = document.getElementById("dropZone");
const postsContainer = document.getElementById("posts");

let currentUser = null;

// --- Initialization ---
async function initAuth() {
    const cachedUser = localStorage.getItem('user');
    if (cachedUser) {
        currentUser = JSON.parse(cachedUser);
    }
    
    try {
        const authUrl = `${API_BASE}/api/auth/me`;
        const res = await fetch(authUrl, { credentials: 'include' });
        if (res.ok) {
            currentUser = await res.json();
            localStorage.setItem('user', JSON.stringify(currentUser));
        } else {
            currentUser = null;
            localStorage.removeItem('user');
        }
    } catch (e) {
        console.error('Auth error in community', e);
    }

    const postForm = document.getElementById("postForm");
    if (!currentUser) {
        postForm.style.display = "none";
        const msg = document.createElement("div");
        msg.innerHTML = `<p style="text-align:center; padding: 20px; background: rgba(255,255,255,0.1); border-radius: 8px;">Please <a href="../index.html" style="color:var(--glow);">login on the home page</a> to create a post.</p>`;
        postForm.parentNode.insertBefore(msg, postForm);
    } else {
        postForm.style.display = "block";
    }

    loadPosts();
}

initAuth();

// --- Event Listeners ---
dropZone.onclick = (e) => {
    if (e.target !== imagesInput) imagesInput.click();
}

imagesInput.onchange = () => handleFiles([...imagesInput.files]);

dropZone.addEventListener("dragover", e => {
    e.preventDefault();
    dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));

dropZone.addEventListener("drop", e => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    handleFiles([...e.dataTransfer.files]);
});

document.getElementById("clearBtn").onclick = resetForm;

document.getElementById("postForm").onsubmit = async (e) => {
    e.preventDefault();
    const text = document.getElementById("text").value.trim();
    if (!text) return;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerText;
    submitBtn.disabled = true;
    submitBtn.innerText = "Posting...";

    try {
        const fd = new FormData();
        fd.append("text", text);
        selectedFiles.forEach(f => fd.append("images", f));

        const res = await fetch(API_URL, {
            method: "POST",
            body: fd,
            credentials: 'include' // Important for sessions
        });

        if (res.status === 401) {
            alert("Login first");
            window.location.href = "../index.html?login=true";
            return;
        }

        if (!res.ok) throw new Error("Failed to create post");

        const newPost = await res.json();
        addPostToFeed(newPost, true); // Prepend
        resetForm();
    } catch (err) {
        alert("Error posting: " + err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = originalBtnText;
    }
};

// --- Functions ---

function handleFiles(files) {
    const validFiles = files.filter(f => f.type.startsWith("image/"));
    selectedFiles = [...selectedFiles, ...validFiles].slice(0, 4); // Max 4 images
    renderThumbs();
}

function renderThumbs() {
    thumbs.innerHTML = "";
    selectedFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = e => {
            const div = document.createElement("div");
            div.className = "thumb";
            div.innerHTML = `<img src="${e.target.result}">`;
            thumbs.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

function resetForm() {
    selectedFiles = [];
    renderThumbs();
    document.getElementById("postForm").reset();
}

async function loadPosts() {
    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("Failed to fetch");
        const posts = await res.json();
        postsContainer.innerHTML = ""; // Clear loading state
        posts.forEach(p => addPostToFeed(p));

        if (posts.length === 0) {
            postsContainer.innerHTML = `<div style="text-align:center;opacity:0.6;">No posts yet. Be the first!</div>`;
        }
    } catch (err) {
        postsContainer.innerHTML = `<div style="color:#ff6b6b;text-align:center;">Failed to load posts. Is the server running?</div>`;
    }
}

function addPostToFeed(post, prepend = false) {
    const div = document.createElement("div");
    div.className = "post";

    // Format Date
    const date = new Date(post.createdAt).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    // Images HTML
    let imagesHtml = "";
    if (post.images && post.images.length > 0) {
        const backendBaseUrl = API_BASE;
        imagesHtml = `<div class="post-images">
      ${post.images.map(url => {
          // Robust URL construction
          let fullUrl = url.startsWith('http') ? url : backendBaseUrl + (url.startsWith('/') ? '' : '/') + url;
          // Remove potential double slashes (except after http:)
          fullUrl = fullUrl.replace(/([^:]\/)\/+/g, "$1");
          return `<img src="${fullUrl}" loading="lazy" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1594322436404-5a0526db4d13?q=80&w=200&auto=format&fit=crop';this.style.opacity='0.5';this.title='Image no longer available on server';">`;
      }).join("")}
    </div>`;
    }

    div.innerHTML = `
    <div style="font-weight:bold; margin-bottom:5px; color:#1abc9c;">${escapeHtml(post.authorName || 'Anonymous')}</div>
    <p>${escapeHtml(post.text)}</p>
    ${imagesHtml}
    <div class="meta">
        <span>${date}</span>
        ${(currentUser && currentUser.id === post.author) ? `<button class="delete-btn" data-id="${post._id}">Delete</button>` : ''}
    </div>
  `;

    // Attach Events
    div.querySelectorAll('img').forEach(img => {
        img.onclick = () => openLightbox(img.src);
    });

    const deleteBtn = div.querySelector('.delete-btn');
    if (deleteBtn) {
        deleteBtn.onclick = () => deletePost(post._id, div);
    }

    if (prepend) {
        // Remove "No posts" message if it exists
        if (postsContainer.innerHTML.includes("No posts yet")) postsContainer.innerHTML = "";
        postsContainer.prepend(div);
    } else {
        postsContainer.appendChild(div);
    }
}

async function deletePost(id, element) {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
        const res = await fetch(`${API_URL}/${id}`, { 
            method: 'DELETE',
            credentials: 'include' // Important for sessions
        });
        if (res.status === 401) {
            alert("Session expired. Please login again.");
            window.location.href = "../index.html?login=true";
            return;
        }
        if (res.ok) {
            element.remove();
            if (postsContainer.children.length === 0) {
                postsContainer.innerHTML = `<div style="text-align:center;opacity:0.6;">No posts yet. Be the first!</div>`;
            }
        } else {
            alert("Failed to delete");
        }
    } catch (err) {
        alert("Error deleting: " + err.message);
    }
}

// Lightbox
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImg");

function openLightbox(src) {
    lightboxImg.src = src;
    lightbox.classList.add("active");
}

lightbox.onclick = () => lightbox.classList.remove("active");

// Utility
function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
