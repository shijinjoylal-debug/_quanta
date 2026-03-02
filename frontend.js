fetch("/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: websiteText })
})
    .then(res => res.json())
    .then(data => {
        document.getElementById("output").innerHTML = data;
    })


