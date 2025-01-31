//----------------------------------------------------------------Part 1
// const gallery = document.getElementById('gallery');

// async function fetchContributors() {
//   const owner = document.getElementById('ownerInput').value.trim();
//   const repo = document.getElementById('repoInput').value.trim();

//   if (!owner || !repo) {
//     alert('Please enter both owner name and repository name.');
//     return;
//   }

//   // Clear existing grid
//   gallery.innerHTML = '';

//   try {
//     const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contributors`);
//     if (!response.ok) {
//       throw new Error(`Failed to fetch contributors: ${response.statusText}`);
//     }
//     const contributors = await response.json();

//     // Total number of cells in the 100x100 grid
//     const totalCells = 100 * 100;

//     // Calculate total contributions
//     const totalContributions = contributors.reduce((sum, c) => sum + c.contributions, 0);

//     // Distribute cells based on contributions
//     let cellCount = 0;
//     contributors.forEach(contributor => {
//       const contributorCells = Math.round((contributor.contributions / totalContributions) * totalCells);
//       for (let i = 0; i < contributorCells && cellCount < totalCells; i++) {
//         createCell(contributor);
//         cellCount++;
//       }
//     });

//     // Fill remaining cells with placeholders
//     while (cellCount < totalCells) {
//       createEmptyCell();
//       cellCount++;
//     }
//   } catch (error) {
//     console.error(error);
//     alert('Error fetching contributors. Make sure the owner/repo names are correct.');
//   }
// }

// // Create a cell with contributor data
// function createCell(contributor) {
//   const cell = document.createElement('div');
//   cell.className = 'cell';

//   const img = document.createElement('img');
//   img.src = contributor.avatar_url;
//   img.alt = contributor.login;

//   const tooltip = document.createElement('div');
//   tooltip.className = 'tooltip';
//   tooltip.textContent = contributor.login;

//   cell.appendChild(img);
//   cell.appendChild(tooltip);
//   gallery.appendChild(cell);
// }

// // Create an empty placeholder cell
// function createEmptyCell() {
//   const cell = document.createElement('div');
//   cell.className = 'cell';
//   gallery.appendChild(cell);
// }
//----------------------------------------------------------------Part 2
// document.addEventListener('DOMContentLoaded', async () => {
//     const matrix = document.getElementById('matrix');
  
//     // 1. Get dynamic grid size and repository details
//     const rows = 100;//parseInt(prompt("Enter the number of rows for the grid (e.g., 100):"), 10) || 100;
//     const cols = 100;//parseInt(prompt("Enter the number of columns for the grid (e.g., 100):"), 10) || 100;
//     const owner = 'parth-raiyani-tarktech';// prompt("Enter the repository owner (e.g., 'octocat'):");
//     const repo = 'train-reservation-system';//prompt("Enter the repository name (e.g., 'Hello-World'):");
  
//     const totalCells = rows * cols;
  
//     // 2. Update CSS grid dynamically based on rows and columns
//     matrix.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
//     matrix.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  
//     // 3. Fetch contributors from GitHub API
//     async function fetchContributors(owner, repo) {
//       const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contributors`);
//       if (!response.ok) {
//         alert("Error fetching contributors. Check the repository details.");
//         throw new Error("Failed to fetch contributors");
//       }
//       return await response.json();
//     }
  
//     // 4. Calculate proportional shares and cell sizes
//     function calculateCellDistribution(contributors, totalCells) {
//       const totalContributions = contributors.reduce((sum, c) => sum + c.contributions, 0);
//       return contributors.map(contributor => {
//         const share = contributor.contributions / totalContributions;
//         const cells = Math.floor(share * totalCells);
//         const width = Math.max(1, Math.floor(share * cols)); // Dynamic width based on cols
//         const height = Math.max(1, Math.floor(share * rows)); // Dynamic height based on rows
//         return { ...contributor, cells, width, height };
//       });
//     }
  
//     // 5. Render contributors dynamically
//     function renderContributors(contributors) {
//       contributors.forEach(contributor => {
//         const cell = document.createElement('div');
//         cell.classList.add('cell');
  
//         // Dynamic width and height spans
//         cell.style.gridColumn = `span ${contributor.width}`;
//         cell.style.gridRow = `span ${contributor.height}`;
  
//         // Avatar image
//         const avatar = document.createElement('div');
//         avatar.classList.add('avatar');
//         avatar.style.backgroundImage = `url(${contributor.avatar_url})`;
//         avatar.style.backgroundSize = 'cover';
//         avatar.style.width = '100%';
//         avatar.style.height = '100%';
  
//         // GitHub handle
//         const handle = document.createElement('div');
//         handle.classList.add('handle');
//         handle.innerText = `@${contributor.login}`;
//         handle.style.position = 'absolute';
//         handle.style.bottom = '5px';
//         handle.style.left = '5px';
//         handle.style.color = 'white';
//         handle.style.fontSize = '10px';
//         handle.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
//         handle.style.padding = '2px 4px';
  
//         // Append to cell
//         cell.style.position = 'relative';
//         cell.appendChild(avatar);
//         cell.appendChild(handle);
//         matrix.appendChild(cell);
//       });
//     }
  
//     // Main Execution
//     try {
//       const contributors = await fetchContributors(owner, repo);
//       const distributedContributors = calculateCellDistribution(contributors, totalCells);
//       renderContributors(distributedContributors);
//     } catch (error) {
//       console.error(error);
//     }
//   });
  
//----------------------------------------------------------------Part 3
// document.addEventListener('DOMContentLoaded', async () => {
//     const grid = document.getElementById('grid');
  
//     // Grid dimensions
//     const gridCols = 100; // Total columns
//     const gridRows = 100; // Total rows
//     const totalPixels = gridCols * gridRows;
  
//     const owner = 'microsoft';//prompt("Enter the repository owner (e.g., 'octocat'):");
//     const repo = 'vscode';//prompt("Enter the repository name (e.g., 'Hello-World'):");
  
//     // Fetch contributors from GitHub API
//     async function fetchContributors(owner, repo) {
//       const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contributors`);
//       if (!response.ok) {
//         alert("Error fetching contributors. Check the repository details.");
//         throw new Error("Failed to fetch contributors");
//       }
//       return await response.json();
//     }
  
//     // Calculate block sizes for contributors
//     function calculateBlocks(contributors) {
//       const totalContributions = contributors.reduce((sum, c) => sum + c.contributions, 0);
  
//       return contributors.map(contributor => {
//         const share = contributor.contributions / totalContributions;
//         const pixelCount = Math.max(1, Math.floor(share * totalPixels)); // At least 1 pixel
//         const blockSize = Math.max(1, Math.floor(Math.sqrt(pixelCount))); // Square block size
//         return { ...contributor, blockSize };
//       });
//     }
  
//     // Place blocks in the grid
//     function placeBlocks(contributors) {
//       const placed = [];
//       const occupied = new Array(gridRows).fill(null).map(() => new Array(gridCols).fill(false));
  
//       function canPlace(x, y, size) {
//         for (let i = 0; i < size; i++) {
//           for (let j = 0; j < size; j++) {
//             if (x + i >= gridRows || y + j >= gridCols || occupied[x + i][y + j]) {
//               return false;
//             }
//           }
//         }
//         return true;
//       }
  
//       function markOccupied(x, y, size) {
//         for (let i = 0; i < size; i++) {
//           for (let j = 0; j < size; j++) {
//             occupied[x + i][y + j] = true;
//           }
//         }
//       }
  
//       contributors.sort((a, b) => b.blockSize - a.blockSize); // Largest contributors first
  
//       contributors.forEach(contributor => {
//         let placedBlock = false;
//         let size = contributor.blockSize;
  
//         // Try to place with original size or shrink to fit
//         while (size >= 1 && !placedBlock) {
//           for (let x = 0; x < gridRows - size + 1; x++) {
//             for (let y = 0; y < gridCols - size + 1; y++) {
//               if (canPlace(x, y, size)) {
//                 markOccupied(x, y, size);
//                 placed.push({ ...contributor, x, y, size });
//                 placedBlock = true;
//                 return;
//               }
//             }
//           }
//           size--; // Reduce size if it cannot fit
//         }
  
//         // Guarantee at least a 1x1 placement
//         if (!placedBlock) {
//           for (let x = 0; x < gridRows; x++) {
//             for (let y = 0; y < gridCols; y++) {
//               if (!occupied[x][y]) {
//                 markOccupied(x, y, 1);
//                 placed.push({ ...contributor, x, y, size: 1 });
//                 return;
//               }
//             }
//           }
//         }
//       });
  
//       return placed;
//     }
  
//     // Render contributors on the grid
//     function renderBlocks(placedBlocks) {
//       placedBlocks.forEach(block => {
//         const cell = document.createElement('div');
//         cell.classList.add('block');
//         cell.style.gridColumn = `span ${block.size}`;
//         cell.style.gridRow = `span ${block.size}`;
//         cell.style.backgroundImage = `url(${block.avatar_url})`;
  
//         // GitHub handle overlay
//         const handle = document.createElement('div');
//         handle.classList.add('handle');
//         handle.textContent = `@${block.login}`;
//         cell.appendChild(handle);
  
//         grid.appendChild(cell);
//       });
//     }
  
//     // Main execution
//     try {
//       const contributors = await fetchContributors(owner, repo);
//       const blocks = calculateBlocks(contributors);
//       const placedBlocks = placeBlocks(blocks);
//       renderBlocks(placedBlocks);
//     } catch (error) {
//       console.error(error);
//     }
//   });
  
//----------------------------------------------------------------Part 4document.addEventListener("DOMContentLoaded", async () => {
    document.addEventListener("DOMContentLoaded", async () => {
        const grid = document.getElementById("grid");
      
        const gridWidth = 100; // Total grid width in pixels
        const gridHeight = 100; // Total grid height in pixels
        const totalArea = gridWidth * gridHeight;
      
        const owner = 'microsoft';//prompt("Enter the repository owner (e.g., 'microsoft'):");
        const repo = 'vscode';//prompt("Enter the repository name (e.g., 'vscode'):");
      
        // Fetch contributors from GitHub API
        async function fetchContributors(owner, repo) {
          const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contributors?per_page=100&?page=1`);
          if (!response.ok) {
            alert("Error fetching contributors. Check the repository details.");
            throw new Error("Failed to fetch contributors");
          }
          return await response.json();
        }
      
        // Treemap calculation with split logic
        function calculateTreemap(contributors) {console.log("contributors",contributors);
          const totalContributions = contributors.reduce((sum, c) => sum + c.contributions, 0);
          const scaledAreas = contributors.map((c) => ({
            ...c,
            area: (c.contributions / totalContributions) * totalArea,
          }));
      
          const treemap = [];
          let x = 0,
            y = 0,
            remainingWidth = gridWidth,
            remainingHeight = gridHeight;
      
          // Recursive split function
          function splitArea(items, width, height, xOffset, yOffset) {
            if (!items.length) return;
      
            const totalItemArea = items.reduce((sum, item) => sum + item.area, 0);
      
            let runningSum = 0;
            const splitIndex = items.findIndex((item) => {
              runningSum += item.area;
              return runningSum / totalItemArea >= 0.5; // Split point
            });
      
            const firstHalf = items.slice(0, splitIndex + 1);
            const secondHalf = items.slice(splitIndex + 1);
      
            const isHorizontalSplit = width >= height;
      
            if (isHorizontalSplit) {
              const splitWidth = Math.floor((firstHalf.reduce((sum, item) => sum + item.area, 0) / totalItemArea) * width);
      
              // Add first half
              treemap.push(...firstHalf.map((item) => ({
                ...item,
                x: xOffset,
                y: yOffset,
                width: splitWidth,
                height,
              })));
      
              // Recursively split second half
              splitArea(secondHalf, width - splitWidth, height, xOffset + splitWidth, yOffset);
            } else {
              const splitHeight = Math.floor((firstHalf.reduce((sum, item) => sum + item.area, 0) / totalItemArea) * height);
      
              // Add first half
              treemap.push(...firstHalf.map((item) => ({
                ...item,
                x: xOffset,
                y: yOffset,
                width,
                height: splitHeight,
              })));
      
              // Recursively split second half
              splitArea(secondHalf, width, height - splitHeight, xOffset, yOffset + splitHeight);
            }
          }
        console.log("scaledAreas",scaledAreas);
          splitArea(scaledAreas, remainingWidth, remainingHeight, x, y);
      
          return treemap;
        }
      
        // Render the grid
        function renderGrid(treemap) {
          grid.style.width = `${gridWidth}px`;
          grid.style.height = `${gridHeight}px`;
      
          treemap.forEach((contributor) => {
            const cell = document.createElement("div");
            cell.classList.add("block");
            cell.style.left = `${contributor.x}px`;
            cell.style.top = `${contributor.y}px`;
            cell.style.width = `${contributor.width}px`;
            cell.style.height = `${contributor.height}px`;
            cell.style.backgroundImage = `url(${contributor.avatar_url})`;
            cell.style.backgroundSize = "cover";
            cell.style.border = "1px solid #ccc";
      
            const overlay = document.createElement("div");
            overlay.classList.add("overlay");
            overlay.textContent = `@${contributor.login}`;
            cell.appendChild(overlay);
      
            grid.appendChild(cell);
          });
        }
      
        // Main Execution
        try {
          const contributors = await fetchContributors(owner, repo);console.log(contributors);
          const treemap = calculateTreemap(contributors);
          renderGrid(treemap);
        } catch (error) {
          console.error(error);
        }
      });
      
    //   async function fetchAllContributors(owner, repo) {
    //     let contributors = [];
    //     let page = 1;
    //     let hasMorePages = true;
    
    //     while (hasMorePages) {
    //         const url = `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=100&page=${page}`;
            
    //         try {
    //             // Fetch the contributors for the current page
    //             const response = await fetch(url);
    //             const data = await response.json();
    
    //             // Add the current page of contributors to the list
    //             contributors = [...contributors, ...data];
    
    //             // Check if there are more pages (pagination via `Link` header)
    //             const linkHeader = response.headers.get('Link');
    //             if (linkHeader && linkHeader.includes('rel="next"')) {
    //                 page++; // Move to the next page
    //             } else {
    //                 hasMorePages = false; // No more pages
    //             }
    //         } catch (error) {
    //             console.error('Error fetching contributors:', error);
    //             hasMorePages = false;
    //         }
    //     }
    
    //     return contributors;
    // }
    
    // // Example usage:
    // fetchAllContributors('microsoft', 'vscode')
    //     .then(contributors => {
    //         console.log(contributors);
    //     })
    //     .catch(error => {
    //         console.error('Error:', error);
    //     });