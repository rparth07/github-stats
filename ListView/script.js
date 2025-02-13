async function fetchContributors(owner, repo) {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=100`
  );
  if (!response.ok) {
    alert("Error fetching contributors.");
    return [];
  }
  return await response.json();
}

async function createTreemap(owner, repo) {
  const contributors = await fetchContributors(owner, repo);
  const treemapContainer = document.getElementById("listview");
  treemapContainer.innerHTML = "";

  contributors.forEach((contributor, index) => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <div class="align-items-center d-flex gap-4">
        <img src="${contributor.avatar_url}" alt="${contributor.login}" />
        <span>#${index + 1}</span>
      </div>
      <h5>${contributor.login}</h5>
      <p><strong>${contributor.contributions}</strong> contributions</p>
      <a href="${
        contributor.html_url
      }" target="_blank" class="btn btn-sm btn-primary">View Profile</a>
    `;
    treemapContainer.appendChild(card);
  });
}

createTreemap("CollaboraOnline", "online");