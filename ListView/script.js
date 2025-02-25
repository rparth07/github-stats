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
    card.className = `card ${contributor.login}`;

    card.innerHTML = `
      <i class="share-icon fa-regular fa-clipboard" onclick="shareProfile('${contributor.login}', this)"></i>
      <div class="align-items-center d-flex gap-4">
        <img src="${contributor.avatar_url}" alt="${contributor.login}" />
        <a href="#${index + 1}"></a>
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

  const urlParams = new URLSearchParams(window.location.search);
  urlParams.set("repo-owner", owner);
  urlParams.set("repo-name", repo);
  let contributorName = urlParams.get("contributor");
  if(contributorName === "" || contributorName === "null" || contributorName === "undefined") {
    urlParams.delete("contributor");
    contributorName = null;
  }

  if (contributorName) {
    const contributor = contributors.find((c) => c.login === contributorName);
    console.log(contributor);
    if (contributor)
      highlightContributor(contributor);
  }
  const newUrl = window.location.pathname + "?" + urlParams.toString();
  history.pushState(null, "", newUrl);
}

function highlightContributor(contributor) {
  const contributorNameClass = `.${contributor.login}`;
  const card = document.querySelector(contributorNameClass);
  if (card) {
    card.classList.add("highlight");
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function shareProfile(contributorName, icon) {
  if(icon.classList.contains("fa-regular")) {
    icon.classList.remove("fa-regular");
    icon.classList.add("fa-solid");
  }
  const urlParams = new URLSearchParams(window.location.search);
  urlParams.set("contributor", contributorName);
  const newUrl = window.location.pathname + "?" + urlParams.toString();
  history.pushState(null, "", newUrl);
  navigator.clipboard.writeText(window.location.href);

  setTimeout(() => {
    icon.classList.remove("fa-solid");
    icon.classList.add("fa-regular");
  }, 2000);
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


document.addEventListener("click", function (event) {
  const urlParams = new URLSearchParams(window.location.search);
  urlParams.delete("contributor");
  const newUrl = window.location.pathname + "?" + urlParams.toString();
  history.pushState(null, "", newUrl);

  const card = document.querySelector(".card.highlight");
  if (card) {
    card.classList.remove("highlight");
  }
});