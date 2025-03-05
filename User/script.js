import findContributions from "gh-contributions-finder";
import "./style.css";

async function fetchContributions(username) {
  try {
    const result = await findContributions(username, {
      shouldCreateFile: false, // Adjust based on your needs
      shouldCopyToClipboard: false, // Adjust based on your needs
      outputFile: "", // Adjust based on your needs
    });

    if (!result) {
      alert("Error fetching contributions.");
      throw new Error("Failed to fetch contributions.");
    }

    // Use the result directly, without calling `json()`
    console.log("Repository links:", result);
    return result; // You can return the result to use it elsewhere
  } catch (error) {
    console.error("Error:", error);
  }
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

  const backgroundSeparator = document.querySelector(".background-separator");
  backgroundSeparator.classList.add("d-none");

  const urlParams = new URLSearchParams(window.location.search);
  urlParams.delete("org");
  urlParams.delete("repository");
  const newUrl = window.location.pathname + "?" + urlParams.toString();
  history.pushState(null, "", newUrl);
}

const Factor = 2 / 3; // Scale factor for treemap tiles

async function createTreemap(username) {
  const contributions = await fetchContributions(username);

  const generateAvatarUrl = (repoName) => {
    return `https://robohash.org/${repoName}?size=200x200&set=set1`;
  };

  const parseContributions = (url) => {
    const urlPattern = /^https:\/\/github\.com\/([^/]+)\/([^/]+)$/;
    const match = url.match(urlPattern);

    if (match) {
      const [, org, repo] = match;
      return {
        org: org,
        repository: repo,
        url: url,
        avatar: generateAvatarUrl(repo),
        contributions: 0, //findContributions(username, org, repo),
      };
    } else {
      // Handle invalid URL format gracefully
      console.error(`Invalid URL: ${url}`);
      return null;
    }
  };

  console.log(contributions);
  const parsedContributions = contributions
    .map(parseContributions)
    .filter((item) => item !== null);

  const scaledData = scaleContributions(parsedContributions);

  const width = window.innerWidth;
  const height = window.innerHeight;

  const treemap = d3.treemap().size([width, height]).padding(2);

  const root = d3.hierarchy({ children: scaledData }).sum((d) => d.scaledValue);

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
      tooltip.textContent = `@${d.data.org}: ${d.data.repository}: ${d.data.contributions} contributions`; //TODO
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
  urlParams.set("username", username);
  let org = urlParams.get("org");
  let repository = urlParams.get("repository");
  if (org && repository) {
    const contribution = parsedContributions.find(
      (c) => c.org === org && c.repository === repository
    );
    displayCard(contribution);
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

function displayCard(contribution) {
  const profileContainer = document.querySelector(".profile-container");
  profileContainer.classList.remove("d-none");

  const backgroundSeparator = document.querySelector(".background-separator");
  backgroundSeparator.classList.remove("d-none");

  const card = profileContainer.querySelector(".card");
  const img = card.querySelector("img");
  img.src = contribution.avatar;

  const title = card.querySelector(".card-title");
  title.textContent = contribution.repository;

  const text = card.querySelector(".card-text");
  text.textContent = `@${contribution.org}: ${contribution.repository}: ${contribution.contributions} contributions`; //TODO

  const btn = card.querySelector(".btn");
  btn.textContent = "View on GitHub";
  btn.href = contribution.url;

  const urlParams = new URLSearchParams(window.location.search);
  urlParams.set("org", contribution.org);
  urlParams.set("repository", contribution.repository);
  const newUrl = window.location.pathname + "?" + urlParams.toString();
  history.pushState(null, "", newUrl);
}

function getScaleFactor(width, minSize, maxSize) {
  const minScale = 1.2;
  const maxScale = 2.0;

  return (
    maxScale - ((width - minSize) / (maxSize - minSize)) * (maxScale - minScale)
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

async function fetchUserSuggestions(query) {
  const url = `https://api.github.com/search/users?q=${query}&per_page=10`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const suggestions = data.items.map((item) => ({
      name: item.login,
    }));

    displaySuggestions(suggestions);
  } catch (error) {
    console.error("Error fetching users:", error);
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
    suggestionDiv.textContent = `${suggestion.name}`;

    suggestionDiv.addEventListener("click", () => {
      suggestionDropdown.style.display = "none";
      findStats(suggestion);

      const repositoryTitle = document.querySelector(".user-title");
      repositoryTitle.textContent = suggestion.name;
    });
    suggestionDropdown.appendChild(suggestionDiv);
  });

  suggestionDropdown.style.display = "block";
}

function findStats(selectedUser) {
  createTreemap(selectedUser.login);
}

function clearInput() {
  const searchInput = document.getElementById("userSearch");
  searchInput.value = "";
  suggestionDropdown.style.display = "none";
  const xMarkIcons = document.getElementsByClassName("fa-xmark");
  if (xMarkIcons.length > 0) xMarkIcons[0].classList.add("d-none");
}

document.addEventListener("DOMContentLoaded", function () {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("username")) {
    createTreemap(urlParams.get("username"));
  } else {
    createTreemap("rparth07");
  }
  setTimeout(applyHoverEffect, 500);

  let debounceTimeout;

  const searchInput = document.getElementById("userSearch");
  const suggestionDropdown = document.getElementById("suggestionDropdown");

  searchInput.addEventListener("input", function (event) {
    clearTimeout(debounceTimeout);
    const xMarkIcons = document.getElementsByClassName("fa-xmark");
    if (xMarkIcons.length > 0) xMarkIcons[0].classList.remove("d-none");
    debounceTimeout = setTimeout(() => {
      const query = event.target.value;
      if (query.length > 0) {
        fetchUserSuggestions(query);
      } else {
        suggestionDropdown.style.display = "none";
      }
    }, 500);
  });
});
