let allData = [];
let filteredData = [];
let currentPage = 1;
const itemsPerPage = 30;
let currentSort = { column: 'h5index', order: 'desc' };

document.addEventListener('DOMContentLoaded', function() {
    loadData();
    setupEventListeners();
    setupMobileMenu();
});

function setupMobileMenu() {
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    navToggle.addEventListener('click', function() {
        this.classList.toggle('active');
        navMenu.classList.toggle('active');
    });
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function() {
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });
    
    document.addEventListener('click', function(e) {
        if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
        }
    });
}

function setupEventListeners() {
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });

    document.getElementById('search').addEventListener('input', filterData);
    document.getElementById('year-filter').addEventListener('change', filterData);
    document.getElementById('sbc-filter').addEventListener('change', filterData);
    document.getElementById('clear-filters').addEventListener('click', clearFilters);

    document.getElementById('prev-page').addEventListener('click', () => changePage(-1));
    document.getElementById('next-page').addEventListener('click', () => changePage(1));

    const sortableHeaders = document.querySelectorAll('th[data-sort]');
    sortableHeaders.forEach(header => {
        header.addEventListener('click', function() {
            sortTable(this.dataset.sort);
        });
    });

    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

function switchTab(tabName) {
    const tabs = document.querySelectorAll('.tab-content');
    const buttons = document.querySelectorAll('.tab-button');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    buttons.forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabName).classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    if (tabName === 'estatisticas') {
        updateStatistics();
    }
}

async function loadData() {
    try {
        const response = await fetch('out/website-2025-sbc.csv');
        const text = await response.text();
        
        allData = parseCSV(text);
        filteredData = [...allData];
        
        populateSBCFilter();
        updateStatistics();
        renderTable();
        
        document.getElementById('loading').style.display = 'none';
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('loading').innerHTML = 'Error loading data. Please reload the page.';
    }
}

function parseCSV(text) {
    const lines = text.split('\n');
    const headers = lines[0].split(',');
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        
        const values = parseCSVLine(lines[i]);
        const row = {};
        
        headers.forEach((header, index) => {
            const cleanHeader = header.trim().replace(/"/g, '');
            row[cleanHeader] = values[index] ? values[index].trim().replace(/"/g, '') : '';
        });
        
        data.push({
            conference: row['Conference'] || '',
            acronym: row['Acronym'] || '',
            year: row['Year'] || '',
            category: row['Topic'] || '',
            paperCount: parseInt(row['Papers(5Y)']) || 0,
            totalCitations: parseInt(row['Citations(5Y)']) || 0,
            h5index: parseInt(row['h5']) || 0,
            h5source: row['h5_source'] || '',
            sbcClass: row['SBC_Class'] || '',
            googleScholarId: row['Google_Scholar_ID'] || '',
            dblpId: row['DBLP_ID'] || ''
        });
    }
    
    return data.sort((a, b) => b.h5index - a.h5index);
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current);
    return result;
}


function populateSBCFilter() {
    const sbcSelect = document.getElementById('sbc-filter');
    if (!sbcSelect) return;
    
    sbcSelect.innerHTML = `
        <option value="">All</option>
        <option value="Top10">Top 10</option>
        <option value="Top20">Top 20</option>
        <option value="Geral">General</option>
        <option value="none">Not Classified</option>
    `;
}


function filterData() {
    const searchTerm = document.getElementById('search').value.toLowerCase();
    const yearFilter = document.getElementById('year-filter').value;
    const sbcFilter = document.getElementById('sbc-filter')?.value;
    
    filteredData = allData.filter(item => {
        const matchSearch = item.conference.toLowerCase().includes(searchTerm) || 
                           item.acronym.toLowerCase().includes(searchTerm);
        const matchYear = !yearFilter || item.year === yearFilter;
        const matchSBC = !sbcFilter || 
                        (sbcFilter === 'none' ? !item.sbcClass : item.sbcClass === sbcFilter);
        
        return matchSearch && matchYear && matchSBC;
    });
    
    currentPage = 1;
    renderTable();
}

function clearFilters() {
    document.getElementById('search').value = '';
    document.getElementById('year-filter').value = '';
    const sbcFilter = document.getElementById('sbc-filter');
    if (sbcFilter) sbcFilter.value = '';
    
    filteredData = [...allData];
    currentPage = 1;
    renderTable();
}

function sortTable(column) {
    if (currentSort.column === column) {
        currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.order = 'desc';
    }
    
    filteredData.sort((a, b) => {
        let aVal, bVal;
        
        switch(column) {
            case 'conference':
                aVal = a.conference.toLowerCase();
                bVal = b.conference.toLowerCase();
                break;
            case 'acronym':
                aVal = a.acronym.toLowerCase();
                bVal = b.acronym.toLowerCase();
                break;
            case 'year':
                aVal = a.year;
                bVal = b.year;
                break;
            case 'h5index':
                aVal = a.h5index;
                bVal = b.h5index;
                break;
            case 'h5source':
                aVal = a.h5source;
                bVal = b.h5source;
                break;
            case 'citations':
                aVal = a.totalCitations;
                bVal = b.totalCitations;
                break;
            case 'papers':
                aVal = a.paperCount;
                bVal = b.paperCount;
                break;
            case 'category':
                aVal = a.category.toLowerCase();
                bVal = b.category.toLowerCase();
                break;
            case 'sbcClass':
                const sbcOrder = {'Top10': 3, 'Top20': 2, 'Geral': 1, '': 0};
                aVal = sbcOrder[a.sbcClass] || 0;
                bVal = sbcOrder[b.sbcClass] || 0;
                break;
            case 'links':
                aVal = (a.googleScholarId ? 1 : 0) + (a.dblpId ? 1 : 0);
                bVal = (b.googleScholarId ? 1 : 0) + (b.dblpId ? 1 : 0);
                break;
            default:
                return 0;
        }
        
        if (currentSort.order === 'asc') {
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
            return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
    });
    
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('table-body');
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);
    
    tbody.innerHTML = '';
    
    if (pageData.length === 0) {
        document.getElementById('no-results').style.display = 'block';
        document.querySelector('.pagination').style.display = 'none';
        return;
    }
    
    document.getElementById('no-results').style.display = 'none';
    document.querySelector('.pagination').style.display = 'flex';
    
    pageData.forEach(item => {
        const row = document.createElement('tr');
        
        const sbcDisplayName = item.sbcClass === 'Geral' ? 'General' : item.sbcClass;
        const sbcBadge = item.sbcClass ? 
            `<span class="badge ${item.sbcClass.toLowerCase()}">${sbcDisplayName}</span>` : '-';
        
        const h5Link = item.googleScholarId ? 
            `<a href="https://scholar.google.com/citations?hl=en&view_op=list_hcore&venue=${item.googleScholarId}.2025" target="_blank" title="View on Google Scholar">${item.h5index}</a>` : 
            item.h5index;
        
        const acronymLink = item.dblpId ? 
            `<a href="https://dblp.org/db/conf/${item.dblpId}/" target="_blank" title="View on DBLP">${item.acronym}</a>` : 
            item.acronym;
        
        const links = [];
        if (item.googleScholarId) {
            links.push(`<a href="https://scholar.google.com/citations?hl=en&view_op=list_hcore&venue=${item.googleScholarId}.2025" target="_blank" title="Google Scholar"><i class="fas fa-graduation-cap"></i></a>`);
        }
        if (item.dblpId) {
            links.push(`<a href="https://dblp.org/db/conf/${item.dblpId}/" target="_blank" title="DBLP"><i class="fas fa-database"></i></a>`);
        }
        const linksHtml = links.length > 0 ? links.join(' ') : '-';
        
        row.innerHTML = `
            <td>${item.conference}</td>
            <td><strong>${acronymLink}</strong></td>
            <td>${item.year}</td>
            <td><strong>${h5Link}</strong></td>
            <td>${item.h5source}</td>
            <td>${sbcBadge}</td>
            <td>${item.totalCitations === 0 ? '' : item.totalCitations.toLocaleString('en-US')}</td>
            <td>${item.paperCount === 0 ? '' : item.paperCount}</td>
            <td>${linksHtml}</td>
        `;
        tbody.appendChild(row);
    });
    
    updatePagination();
}

function updatePagination() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    
    document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages} (${filteredData.length} conferences)`;
    
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage === totalPages;
}

function changePage(direction) {
    currentPage += direction;
    renderTable();
}

function updateStatistics() {
    const validH5Data = allData.filter(item => item.h5index > 0);
    
    const totalConferences = allData.length;
    const avgH5Index = validH5Data.length > 0 
        ? Math.round(validH5Data.reduce((acc, item) => acc + item.h5index, 0) / validH5Data.length)
        : 0;
    
    const sortedH5 = validH5Data.map(item => item.h5index).sort((a, b) => a - b);
    const medianH5Index = sortedH5.length > 0
        ? sortedH5[Math.floor(sortedH5.length / 2)]
        : 0;
    
    document.getElementById('total-conferences').textContent = totalConferences;
    document.getElementById('avg-h5index').textContent = avgH5Index;
    document.getElementById('median-h5index').textContent = medianH5Index;
    
    drawH5Histogram();
}

function drawH5Histogram() {
    const ctx = document.getElementById('h5-histogram').getContext('2d');
    
    const ranges = [
        { label: '0-25', min: 0, max: 25 },
        { label: '26-50', min: 26, max: 50 },
        { label: '51-75', min: 51, max: 75 },
        { label: '76-100', min: 76, max: 100 },
        { label: '100+', min: 101, max: Infinity }
    ];
    
    const counts = ranges.map(range => 
        allData.filter(item => item.h5index >= range.min && item.h5index <= range.max).length
    );
    
    if (window.h5Chart) {
        window.h5Chart.destroy();
    }
    
    window.h5Chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ranges.map(r => r.label),
            datasets: [{
                label: 'Number of Conferences',
                data: counts,
                backgroundColor: '#5c9ccc',
                borderColor: '#4a7fa5',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y + ' conferences';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: Math.max(...counts) + 50,
                    ticks: {
                        stepSize: 100
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function showDetails(encodedItem) {
    const item = JSON.parse(decodeURIComponent(encodedItem));
    alert(`Conference: ${item.conference}\nH5-Index: ${item.h5index}`);
}