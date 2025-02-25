async function fetchContributors(owner, repo) {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=100`
  );
  if (!response.ok) {
    alert("Error fetching contributors.");
    throw new Error("Failed to fetch contributors");
  }
  return await response.json();
}

function scaleContributions(data) {
  const maxContribution = d3.max(data, (d) => d.value);
  const minContribution = d3.min(data, (d) => d.value);

  const scale = d3
    .scaleSqrt()
    .domain([minContribution, maxContribution])
    .range([10, 100]);

  return data.map((d) => ({
    ...d,
    scaledValue: scale(d.value),
  }));
}

function closeCard() {
  const profileContainer = document.querySelector(".profile-container");
  profileContainer.classList.add("d-none");

  const backgroundSeparator = document.querySelector(
    ".background-separator"
  );
  backgroundSeparator.classList.add("d-none");

  const urlParams = new URLSearchParams(window.location.search);
  urlParams.delete("contributor");
  const newUrl = window.location.pathname + "?" + urlParams.toString();
  history.pushState(null, "", newUrl);
}

const Factor = 2 / 3; // Scale factor for treemap tiles

async function createTreemap(owner, repo) {
  const contributors = await fetchContributors(owner, repo);

  const topContributors = contributors
    .slice(0, 100)
    .map((contributor) => ({
      name: contributor.login,
      value: contributor.contributions,
      avatar: contributor.avatar_url,
      contributions: contributor.contributions,
    }));

  const scaledData = scaleContributions(topContributors);

  const width = window.innerWidth;
  const height = window.innerHeight;

  const treemap = d3.treemap().size([width, height]).padding(2);

  const root = d3
    .hierarchy({ children: scaledData })
    .sum((d) => d.scaledValue);

  treemap(root);

  const treemapContainer = document.querySelector("#treemap");
  treemapContainer.style.width = "70vw";
  treemapContainer.style.height = "100vh";
  treemapContainer.innerHTML = "";

  root.leaves().forEach((d) => {
    const tile = document.createElement("div");
    tile.classList.add("tile");
    tile.style.left = `${d.x0 * Factor}px`;
    tile.style.top = `${d.y0 * Factor}px`;
    tile.style.width = `${(d.x1 - d.x0) * Factor}px`;
    tile.style.height = `${(d.y1 - d.y0) * Factor}px`;

    const img = document.createElement("img");
    img.src = d.data.avatar;
    tile.appendChild(img);

    tile.addEventListener("mouseenter", (event) => {
      const tooltip = document.querySelector("#tooltip");
      tooltip.style.visibility = "visible";
      tooltip.textContent = `@${d.data.name}: ${d.data.contributions} contributions`;
      tooltip.style.left = `${event.pageX}px`;
      tooltip.style.top = `${event.pageY}px`;

      tile.classList.add("active");
    });

    tile.addEventListener("mouseleave", () => {
      document.querySelector("#tooltip").style.visibility = "hidden";
      tile.classList.remove("active");
    });

    tile.addEventListener("click", () => {
      displayCard(d.data);
    });

    treemapContainer.appendChild(tile);
  });

  const urlParams = new URLSearchParams(window.location.search);
  urlParams.set("repo-owner", owner);
  urlParams.set("repo-name", repo);
  let contributorName = urlParams.get("contributor");
  if (contributorName) {
    const contributor = topContributors.find((c) => c.name === contributorName);
    displayCard(contributor);
  }
  const newUrl = window.location.pathname + "?" + urlParams.toString();
  history.pushState(null, "", newUrl);

  window.addEventListener("resize", () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    treemap.size([width, height]);

    treemap(root); // Recompute treemap layout on resize

    const tiles = treemapContainer.querySelectorAll(".tile");
    tiles.forEach((tile, i) => {
      const d = root.leaves()[i];
      tile.style.left = `${d.x0 * Factor}px`;
      tile.style.top = `${d.y0 * Factor}px`;
      tile.style.width = `${(d.x1 - d.x0) * Factor}px`;
      tile.style.height = `${(d.y1 - d.y0) * Factor}px`;

      const img = tile.querySelector("img");
      img.style.width = `${(d.x1 - d.x0) * Factor}px`;
      img.style.height = `${(d.y1 - d.y0) * Factor}px`;
    });

    // Update tooltip position on resize
    const tooltip = document.querySelector("#tooltip");
    tooltip.style.left = `${Math.min(
      window.innerWidth - tooltip.clientWidth,
      parseInt(tooltip.style.left) || 0
    )}px`;
    tooltip.style.top = `${Math.min(
      window.innerHeight - tooltip.clientHeight,
      parseInt(tooltip.style.top) || 0
    )}px`;
  });
}

function displayCard(contributor) {
  const profileContainer = document.querySelector(".profile-container");
  profileContainer.classList.remove("d-none");

  const backgroundSeparator = document.querySelector(
    ".background-separator"
  );
  backgroundSeparator.classList.remove("d-none");

  const card = profileContainer.querySelector(".card");
  const img = card.querySelector("img");
  img.src = contributor.avatar;

  const title = card.querySelector(".card-title");
  title.textContent = contributor.name;

  const text = card.querySelector(".card-text");
  text.textContent = `@${contributor.name}: ${contributor.contributions} contributions`;

  const btn = card.querySelector(".btn");
  btn.textContent = "View on GitHub";
  btn.href = `https://github.com/${contributor.name}`;

  const urlParams = new URLSearchParams(window.location.search);
  urlParams.set("contributor", contributor.name);
  const newUrl = window.location.pathname + "?" + urlParams.toString();
  history.pushState(null, "", newUrl);
}

function getScaleFactor(width, minSize, maxSize) {
  const minScale = 1.2;
  const maxScale = 2.0;

  return (
    maxScale -
    ((width - minSize) / (maxSize - minSize)) * (maxScale - minScale)
  );
}

function computeMinMaxSize() {
  const tileElements = document.querySelectorAll(".tile");
  if (tileElements.length === 0) return { minSize: 10, maxSize: 100 };

  let minSize = Infinity;
  let maxSize = -Infinity;

  tileElements.forEach((tile) => {
    const width = tile.offsetWidth;
    if (width < minSize) minSize = width;
    if (width > maxSize) maxSize = width;
  });

  return { minSize, maxSize };
}

function applyHoverEffect() {
  const { minSize, maxSize } = computeMinMaxSize();

  document.querySelectorAll(".tile").forEach((tile) => {
    const width = tile.offsetWidth;
    const scaleFactor = getScaleFactor(width, minSize, maxSize);

    tile.addEventListener("mouseenter", () => {
      tile.style.transform = `scale(${scaleFactor})`;
      tile.style.zIndex = "9";
    });

    tile.addEventListener("mouseleave", () => {
      tile.style.transform = "scale(1)";
      tile.style.zIndex = "1";
    });
  });
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

function findStats(selectedRepo) {
  createTreemap(selectedRepo.orgName, selectedRepo.name);
}

function clearInput() {
  const searchInput = document.getElementById("repoSearch");
  searchInput.value = "";
  suggestionDropdown.style.display = "none";
  const xMarkIcons = document.getElementsByClassName("fa-xmark");
  if (xMarkIcons.length > 0) xMarkIcons[0].classList.add("d-none");
}

document.addEventListener("DOMContentLoaded", function () {
  const urlParams = new URLSearchParams(window.location.search);
  if(urlParams.has("repo-owner") && urlParams.has("repo-name")) {
    createTreemap(urlParams.get("repo-owner"), urlParams.get("repo-name"));
  } else {
    createTreemap("microsoft", "vscode");
  }
  setTimeout(applyHoverEffect, 500);

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