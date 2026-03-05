const API_BASE_URL = window.CONFIG.API_BASE_URL;
fetch(`${API_BASE_URL}/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: websiteText })
})
    .then(res => res.json())
    .then(data => {
        document.getElementById("output").innerHTML = data;
    })


