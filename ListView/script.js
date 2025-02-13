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

async function fetchRepoSuggestions(query) {
  const url = `https://api.github.com/search/repositories?q=${query}&per_page=10`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const suggestions = data.items.map((item) => ({
      name: item.name,
      orgName: item.owner.login,
    }));

    displaySuggestions(suggestions);
  } catch (error) {
    console.error("Error fetching repositories:", error);
  }
}


async function createListView(owner, repo) {
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

function findStats(selectedRepo) {
  createListView(selectedRepo.orgName, selectedRepo.name);
}

function displaySuggestions(suggestions) {
  suggestionDropdown.innerHTML = "";

  if (suggestions.length === 0) {
    suggestionDropdown.style.display = "none";
    return;
  }

  suggestions.forEach((suggestion) => {
    const suggestionDiv = document.createElement("div");
    const subtext = document.createElement("sub");
    subtext.textContent = ` by ${suggestion.orgName}`.toUpperCase();

    suggestionDiv.textContent = `${suggestion.name}`;
    suggestionDiv.appendChild(subtext);

    suggestionDiv.addEventListener("click", () => {
      suggestionDropdown.style.display = "none";
      findStats(suggestion);

      const repositoryTitle = document.querySelector(".repository-title");
      repositoryTitle.textContent = `${suggestion.orgName}/${suggestion.name}`;
    });
    suggestionDropdown.appendChild(suggestionDiv);
  });

  suggestionDropdown.style.display = "block";
}

function clearInput() {
  const searchInput = document.getElementById("repoSearch");
  searchInput.value = "";
  suggestionDropdown.style.display = "none";
  const xMarkIcons = document.getElementsByClassName("fa-xmark");
  if (xMarkIcons.length > 0) xMarkIcons[0].classList.add("d-none");
}

document.addEventListener("DOMContentLoaded", function () {
  createListView("microsoft", "vscode");

  let debounceTimeout;

  const searchInput = document.getElementById("repoSearch");
  const suggestionDropdown = document.getElementById("suggestionDropdown");

  searchInput.addEventListener("input", function (event) {
    clearTimeout(debounceTimeout);
    const xMarkIcons = document.getElementsByClassName("fa-xmark");
    if (xMarkIcons.length > 0) xMarkIcons[0].classList.remove("d-none");
    debounceTimeout = setTimeout(() => {
      const query = event.target.value;
      if (query.length > 0) {
        fetchRepoSuggestions(query);
      } else {
        suggestionDropdown.style.display = "none";
      }
    }, 500);
  })
});