let allData = [];
let filteredData = [];
let currentPage = 1;
const itemsPerPage = 20;
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
    document.getElementById('field-filter').addEventListener('change', filterData);
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
        drawChart();
    }
}

async function loadData() {
    try {
        const response = await fetch('out/website-2025.csv');
        const text = await response.text();
        
        allData = parseCSV(text);
        filteredData = [...allData];
        
        populateCategoryFilter();
        updateStatistics();
        renderTable();
        
        document.getElementById('loading').style.display = 'none';
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        document.getElementById('loading').innerHTML = 'Erro ao carregar dados. Por favor, recarregue a página.';
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
            //organization: row['Organization'] || '',
            conference: row['Conference'] || '',
            acronym: row['Acronym'] || '',
            year: row['Year'] || '',
            //publisher: row['Publisher'] || '',
            //proceedings: row['Proceedings'] || '',
            //isbnIssn: row['ISBN/ISSN'] || '',
            category: row['Topic'] || '',
            //subcategory: row['Subcategory'] || '',
            paperCount: parseInt(row['Papers(5Y)']) || 0,
            totalCitations: parseInt(row['Citations(5Y)']) || 0,
            h5index: row['h5'] || ''
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


function populateCategoryFilter() {
    const categories = [...new Set(allData.map(item => item.category))].sort();
    const select = document.getElementById('field-filter');
    
    select.innerHTML = '<option value="">Todas</option>';
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    });
}

function filterData() {
    const searchTerm = document.getElementById('search').value.toLowerCase();
    const yearFilter = document.getElementById('year-filter').value;
    const categoryFilter = document.getElementById('field-filter').value;
    
    filteredData = allData.filter(item => {
        const matchSearch = item.conference.toLowerCase().includes(searchTerm) || 
                           item.acronym.toLowerCase().includes(searchTerm);
                           // ||
                           //item.organization.toLowerCase().includes(searchTerm);
        const matchYear = !yearFilter || item.year === yearFilter;
        const matchCategory = !categoryFilter || item.category === categoryFilter;
        
        return matchSearch && matchYear && matchCategory;
    });
    
    currentPage = 1;
    renderTable();
}

function clearFilters() {
    document.getElementById('search').value = '';
    document.getElementById('year-filter').value = '';
    document.getElementById('field-filter').value = '';
    
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
        
        switch (column) {
            case 'conference':
                aVal = a.conference.toLowerCase();
                bVal = b.conference.toLowerCase();
                break;
            case 'acronym':
                aVal = a.acronym.toLowerCase();
                bVal = b.acronym.toLowerCase();
                break;
            //case 'organization':
            //    aVal = a.organization.toLowerCase();
            //    bVal = b.organization.toLowerCase();
            //    break;    
            case 'year':
                aVal = parseInt(a.year) || 0;
                bVal = parseInt(b.year) || 0;
                break;
            case 'h5index':
                aVal = a.h5index;
                bVal = b.h5index;
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
        row.innerHTML = `
            <td>${item.conference}</td>
            <td><strong>${item.acronym}</strong></td>
            <td>${item.year}</td>
            <td><strong>${item.h5index}</strong></td>
            <td>${item.totalCitations.toLocaleString('pt-BR')}</td>
            <td>${item.paperCount}</td>
            <td>${item.category}</td>
            <td><button class="btn-detail" onclick="showDetails('${encodeURIComponent(JSON.stringify(item))}')">View</button></td>
        `;
        tbody.appendChild(row);
    });
    
    updatePagination();
}

function updatePagination() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages}`;
    
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage === totalPages;
}

function changePage(direction) {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    currentPage = Math.max(1, Math.min(currentPage + direction, totalPages));
    renderTable();
}

function showDetails(encodedItem) {
    const item = JSON.parse(decodeURIComponent(encodedItem));
    // alert(`Organization: ${item.organization}\nConference: ${item.conference}\nAcronym: ${item.acronym}\nYear: ${item.year}\nPublisher: ${item.publisher}\nProceedings: ${item.proceedings}\nISBN/ISSN: ${item.isbnIssn}\nCategory: ${item.category}\nSubcategory: ${item.subcategory}\nH5-Index: ${item.h5index}\nTotal Citations: ${item.totalCitations}\nTotal Papers: ${item.paperCount}`);
    alert(`Conference: ${item.conference}\nAcronym: ${item.acronym}\nYear: ${item.year}\nCategory: ${item.category}\nH5-Index: ${item.h5index}\nTotal Citations: ${item.totalCitations}\nTotal Papers: ${item.paperCount}`);
}

function updateStatistics() {
    const totalConferences = allData.length;
    const totalPapers = allData.reduce((sum, item) => sum + item.paperCount, 0);
    const totalCitations = allData.reduce((sum, item) => sum + item.totalCitations, 0);
    const avgH5Index = (allData.reduce((sum, item) => sum + item.h5index, 0) / totalConferences).toFixed(1);
    
    document.getElementById('total-conferences').textContent = totalConferences.toLocaleString('pt-BR');
    document.getElementById('total-papers').textContent = totalPapers.toLocaleString('pt-BR');
    document.getElementById('total-citations').textContent = totalCitations.toLocaleString('pt-BR');
    document.getElementById('avg-h5index').textContent = avgH5Index;
}

function drawChart() {
    const ctx = document.getElementById('h5-chart');
    if (!ctx) return;
    
    const categoryData = {};
    allData.forEach(item => {
        const category = item.category || 'Outros';
        if (!categoryData[category]) {
            categoryData[category] = { count: 0, h5sum: 0, citationsSum: 0 };
        }
        categoryData[category].count++;
        categoryData[category].h5sum += item.h5index;
        categoryData[category].citationsSum += item.totalCitations;
    });
    
    const categories = Object.keys(categoryData).sort();
    const avgH5ByCategory = categories.map(cat => (categoryData[cat].h5sum / categoryData[cat].count).toFixed(1));
    const totalCitationsByCategory = categories.map(cat => categoryData[cat].citationsSum);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categories,
            datasets: [{
                label: 'H5-Index Médio',
                data: avgH5ByCategory,
                backgroundColor: 'rgba(92, 156, 204, 0.6)',
                borderColor: 'rgba(92, 156, 204, 1)',
                borderWidth: 1,
                yAxisID: 'y'
            }, {
                label: 'Total de Citações',
                data: totalCitationsByCategory,
                type: 'line',
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderWidth: 2,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'H5-Index e Citações por Categoria'
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'H5-Index Médio'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Total de Citações'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}