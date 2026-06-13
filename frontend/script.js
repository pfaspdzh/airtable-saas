let data = [];
let columns = [];
let activeFilters = {};

// 🚀 LOAD DATA
async function loadData() {
    const res = await fetch("const API_URL = "https://DEIN-BACKEND.onrender.com/data"; const res = await fetch(API_URL);
    data = await res.json();

    if (!data.length) return;

    columns = Object.keys(data[0]);

    buildFilters();
    render();
}

// 🔽 FILTER UI (NUR 1-4 BEI STUFEN)
function buildFilters() {
    const container = document.getElementById("filters");
    container.innerHTML = "";

    columns.forEach(col => {

        const valuesSet = new Set();

        data.forEach(row => {

            let val = String(row[col] ?? "").trim();

            // 🔥 Stufen speziell behandeln (nur 1-4 erlauben)
            if (col.toLowerCase() === "stufen") {
                val.split(/[;,]/).forEach(v => {
                    const clean = v.trim();
                    if (["1","2","3","4"].includes(clean)) {
                        valuesSet.add(clean);
                    }
                });
            } else {
                valuesSet.add(val);
            }
        });

        const values = Array.from(valuesSet).sort();

        const select = document.createElement("select");

        const defaultOpt = document.createElement("option");
        defaultOpt.text = "Filter " + col;
        defaultOpt.value = "";
        select.appendChild(defaultOpt);

        values.forEach(v => {
            const opt = document.createElement("option");
            opt.value = v;
            opt.text = v;
            select.appendChild(opt);
        });

        select.onchange = (e) => {
            if (e.target.value === "") {
                delete activeFilters[col];
            } else {
                activeFilters[col] = e.target.value;
            }
            render();
        };

        container.appendChild(select);
    });
}

// 🔍 FILTER + SEARCH
function render() {

    const search = document.getElementById("search").value.toLowerCase();

    const filtered = data.filter(row => {

        // FILTER
        for (let key in activeFilters) {

            const cell = String(row[key] ?? "");

            const list = cell
                .split(/[;,]/)
                .map(v => v.trim());

            if (!list.includes(activeFilters[key])) {
                return false;
            }
        }

        // SEARCH
        if (search) {
            if (!JSON.stringify(row).toLowerCase().includes(search)) {
                return false;
            }
        }

        return true;
    });

    drawTable(filtered);
}

// 📊 TABLE RENDER (FARBE + BADGES)
function drawTable(rows) {

    const thead = document.querySelector("#table thead");
    const tbody = document.querySelector("#table tbody");

    thead.innerHTML = "";
    tbody.innerHTML = "";

    if (!rows.length) return;

    const cols = Object.keys(rows[0]);

    let head = "<tr>";
    cols.forEach(c => head += `<th>${c}</th>`);
    head += "</tr>";
    thead.innerHTML = head;

    rows.forEach(r => {
        let tr = "<tr>";

        cols.forEach(c => {

            let val = String(r[c] ?? "").trim();
            let lower = val.toLowerCase();

            // 🔥 JA / NEIN farbig
            if (lower === "ja") {
                tr += `<td><span class="badge-yes">JA</span></td>`;
            }
            else if (lower === "nein") {
                tr += `<td><span class="badge-no">NEIN</span></td>`;
            }
            // 🔥 Zahlen (1-4)
            else if (["1","2","3","4"].includes(val)) {
                tr += `<td><span class="badge-number">${val}</span></td>`;
            }
            else {
                tr += `<td>${val}</td>`;
            }
        });

        tr += "</tr>";
        tbody.innerHTML += tr;
    });
}

// 🚀 START
loadData();