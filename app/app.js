const DISABLED = {};
let LEGEND_GRAPH;
let INITIALIZED = false;
const RENDER = new dagreD3.render();
const SVG = d3.select('svg.chart');
const ROOT = SVG.select('g');
const TOOLTIP = d3.select('.tooltip');
const FILTER = d3.select('#filter');
let TRUNCATE_PATHS = true;
let HORIZONTAL = false;
let INTEGRATED_DLC = true;

const TYPE_INFO = {
    "building": { icon: "🏗️", name: "Building", fullname: "Building", description: "Avenger building" },
    "research": { icon: "🔬", name: "Research", fullname: "Research project", description: "Research project" },
    "proving": { icon: "🧪", name: "Proving Grounds", fullname: "Proving Grounds project" },
    "item": { icon: "🔫", name: "Item", fullname: "Engineering item" },
    "drop": { icon: "🫳", name: "Pickup", fullname: "Pickup from mission" },
    "mission": { icon: "🧭", name: "Mission", fullname: "Mission" },
    "enhancement": { icon: "✨", name: "Enhancement", fullname: "Game mechanic enhancement" },
    "region": { icon: "📡", name: "Region", fullname: "Scan unlocked on geoscape" },
    "skill": { icon: "🪖", name: "Skill", fullname: "GTS Skill" },
    "kill": { icon: "👽", name: "Kill", fullname: "Neutralize alien on mission" },
}
const TYPES = Object.keys(TYPE_INFO);

const DLC_INFO = {
    "wotc": { name: "War of the Chosen", abbr: "WotC", icon: "😈" },
    "ah": { name: "Alien Hunters", abbr: "AH", icon: "👽" },
    "slg": { name: "Shen's Last Gift", abbr: "SLG", icon: "🤖" },
    "tlp": { name: "Tactical Legacy Pack", abbr: "TLP", icon: "🪖" }
}
const DLC_ENABLED = Object.keys(DLC_INFO).reduce((obj, key) => ({ ...obj, [key]: true }), {});

const getDlcId = abbr => {
    for (const [key, dlc] of Object.entries(DLC_INFO)) {
        if (dlc.abbr == abbr) return key;
    }
}

function run() {
    LEGEND_GRAPH = legend();
    filter();
    updateTechTreeForDLC();
    chart();
    legendClicks();
    filterChange();
    tools();
    hierarchy();
}

function hierarchy() {
    XCOM_TECH_TREE.forEach(item => {
        if (item.parent) {
            item.parent.forEach(index => {
                if (XCOM_TECH_TREE[index]) {
                    XCOM_TECH_TREE[index].children = XCOM_TECH_TREE[index].children || [];
                    XCOM_TECH_TREE[index].children.push(item);
                }
            });
        }
    });
}

function updateHierarchy() {
    XCOM_TECH_TREE.forEach(item => 
        item.children && (item.children.length = 0)
    );
    hierarchy();
}

function updateTechTreeForDLC() {
    XCOM_TECH_TREE.forEach(item => {
        Object.entries(DLC_INFO).forEach(([key, dlc]) => {
            if (item[key]) {
                const dlcEnabled = !!DLC_ENABLED[key];
                Object.assign(item, item[key][dlcEnabled]);
            }
        })
        if (item.integrated) {
            Object.assign(item, item.integrated[INTEGRATED_DLC]);
        }
    });
}

function legend() {
    const g = new dagreD3.graphlib.Graph()
        .setGraph({
            rankdir: 'TB',
            nodesep: 20,
            ranksep: 20
        });


    TYPES.forEach((item, index) => {
        const typeInfo = TYPE_INFO[item];
        g.setNode(index, {
            label: `${ typeInfo.icon } ${ typeInfo.name }`,
            class: item,
            height: 20,
            paddingLeft: 14,
            paddingRight: 14,
            paddingTop: 0,
            paddingBottom: 4
        });
    });

    const svg = d3.select('svg.legend');
    const root = svg.select('g');

    RENDER(root, g);
    root.attr('transform', 'translate(' + [1.5, 1.5] + ')');
    svg.attr('height', g.graph().height + 3);
    svg.attr('width', g.graph().width + 3);

    return g.graph();
}

function chart() {
    const g = new dagreD3.graphlib.Graph()
        .setGraph({
            rankdir: HORIZONTAL ? 'TB' : 'LR',
            nodesep: 10,
            ranksep: 10
        });

    XCOM_TECH_TREE.forEach(function (item, index) {
        const radius = item.parent ? 11 : 0;

        if (!item.hide) {
            const disabled = TRUNCATE_PATHS && item.disable;

            g.setNode(index, {
                label: disabled ? '…' : `${ TYPE_INFO[item.type].icon } ${ item.title }`,
                class: item.type + (disabled ? ' disabled' : ''),
                height: 18,
                rx: radius,
                ry: radius,
                paddingLeft: 10,
                paddingRight: 10,
                paddingTop: 0,
                paddingBottom: 4
            });
        }
    });

    XCOM_TECH_TREE.forEach((item, index) => {
        if (item.parent) {
            item.parent.forEach(parent => {
                if (!XCOM_TECH_TREE[parent].hide && !XCOM_TECH_TREE[index].hide) {
                    g.setEdge(parent, index, {
                        lineInterpolate: 'basis'
                    });
                }
            });
        }
    });

    g.graph().transition = INITIALIZED 
        ? selection => selection.transition().duration(250)
        : null;

    RENDER(ROOT, g);
    ROOT.attr('transform', 'translate(' + [1.5, 1.5] + ')');
    SVG.transition().duration(INITIALIZED ? 250 : 0)
        .attr('height', ((g.graph().height > 0) ? g.graph().height : 0) + 3)
        .attr('width', ((g.graph().width > 0) ? g.graph().width : 0) + 3);

    INITIALIZED = true;

    tooltip();
}

function legendClicks() {
    const svg = d3.select('svg.legend');
    const nodes = svg.selectAll('.node');

    nodes.on('click', function (index) {
        const elem = d3.select(this);

        const type = TYPES[index];

        DISABLED[type] = !DISABLED[type];
        elem.classed('disabled', DISABLED[type]);
        delayedUpdate();
    });
}

function legendStatus() {
    const svg = d3.select('svg.legend');
    const nodes = svg.selectAll('.node');

    nodes.classed('disabled', index => 
        DISABLED[TYPES[index]]
    );
}

function filterChange() {
    FILTER.on('input', () => {
        delayedUpdate();
    });
}

function reset() {
    XCOM_TECH_TREE.forEach(item => {
        item.hide = false;
        item.disable = false;
    });
}

function delayedUpdate() {
    setTimeout(update, 20);
}

function update() {
    reset();
    hideTooltip();

    filter();
    updateTechTreeForDLC();
    chart();
}

function filter() {
    let filter = FILTER.node().value;

    filter = filter ? filter.toLowerCase() : null;

    XCOM_TECH_TREE.forEach(item => {
        item.hide = false;
        item.disable = DISABLED[item.type] 
            || (filter && !(item.title.toLowerCase().indexOf(filter) > -1))
            || (item.dlc && !DLC_ENABLED[getDlcId(item.dlc)]);
    });

    hide();
}

function isVisible(item) {
    if (item.hide) {
        return false;
    }

    if (item.children) {
        for (const child of item.children) {
            if (isVisible(child)) {
                return true;
            }
        }
    }
    return !item.disable;
}

function hide() {
    XCOM_TECH_TREE.forEach(item => {
        if (!item.hide) {
            if (!isVisible(item)) {
                item.hide = true;
            }
        }
    });
}

function getCostArray(item) {
    const t = {};

    if (item.cost) {
        const r = {};
        let k, i;
        let m = 0;

        for (i = 0; i < item.cost.length; i++) {
            for (k in item.cost[i]) {
                r[k] = r[k] || [];
                r[k][i] = item.cost[i][k];
                m = Math.max(m, i);
            }
        }


        m++;

        if (item.instantCost) {
            for (i = 0; i < item.instantCost.length; i++) {
                for (k in item.instantCost[i]) {
                    r[k] = r[k] || [];
                    r[k][i] += '/' + item.instantCost[i][k];
                }
            }
        }

        for (k in r) {
            for (i = 0; i < m; i++) {
                r[k][i] = r[k][i] !== undefined ? r[k][i] : '?';
            }

            t[k] = r[k];
        }
    }

    return t;
}

function getCostTable(item) {
    let text = '';

    if (item.cost) {
        text += '<table>';

        const r = getCostArray(item);

        for (const k in r) {
            text += '<tr>';
            text += '<th>' + k + '</th>';
            text += '<td>' + r[k].join('</td><td>') + '</td>';
            text += '</tr>';
        }

        text += '</table>';
    }

    return text;
}

function getSpecsTable(specs) {
    return `<hr>
    <table>
    ${ Object.keys(specs).map(key =>
        `<tr><th>${ key }</th><td>${ specs[key] }</td></td>`
    ).join("") }
    </table>`;
}

function hideTooltip() {
    TOOLTIP
        .style('opacity', 0)
        .style('left', 0 + 'px')
        .style('top', 0 + 'px');
}

function tooltip() {
    d3.selectAll("svg.chart .node")
        .on("click", index => {
            const item = XCOM_TECH_TREE[index];
            FILTER.node().value = item.title;

            if (DISABLED[item.type]) {
                DISABLED[item.type] = false;
                setTimeout(legendStatus, 10);
            }

            delayedUpdate();
        })
        .on("mousemove", index => {
            const item = XCOM_TECH_TREE[index];
            const type = TYPE_INFO[item.type];
            const dlc = item.dlc && DLC_INFO[getDlcId(item.dlc)];

            item.costTable = item.costTable || getCostTable(item);

            TOOLTIP
                .attr("class", `tooltip ${ item.type }`)
                .html(`<b>${ item.title }</b>
                    <br>
                    <i>${ type.icon } ${ type.fullname } </i>
                    ${ dlc ? `<i>${ dlc.icon } ${ dlc.name } DLC</i>` : "" }
                    ${ item.specs ? getSpecsTable(item.specs) : "" }
                    ${ item.required 
                        ? `<hr>
                            <table><tr><th>Required</th><td>${ item.required }</td></tr></table>` 
                        : "" }
                    ${ item.costTable  ? `<hr><small>${ item.costTable }</small>` : ""}`)
                .style("opacity", 1)
                .style("left", `${ d3.event.pageX + 28 }px`)
                .style("top", `${ d3.event.pageY }px`);
        })
        .on("mouseout", hideTooltip);
}

function getCsv() {
    const header = ['Id', 'Title', 'Type', 'Parent', 'Required',
        'Supplies', 'Intel', 'Upkeep', 'Power', 'Elerium', 'Elerium Core', 'Alloy', 'Engineer', 'Scientist', 'Corpse'];

    const rows = [header];

    XCOM_TECH_TREE.forEach(function (item, index) {
        const row = [];

        row.push(index);
        row.push(item.title);
        row.push(item.type);
        row.push(item.parent ? item.parent.join(', ') : '');
        row.push(item.required ? item.required : '');

        const a = getCostArray(item);

        for (const k in a) {
            const index = header.indexOf(k);

            if (index < 0) {
                index = header.length;
                header.push(k);
            }

            row[index] = a[k].join(', ');
        }

        rows.push('"' + row.join('","') + '"');
    });

    rows[0] = header.join(',');

    return rows.join('\n');
}

function tools() {

    d3.select('#save')
        .on('click', () => {
            const source = getSource(document.querySelectorAll('svg.chart')[0], getStyles(document));
            source[0] = source[0].replace(/dy="1em"/gi, 'dy="14"');
            const url = window.URL.createObjectURL(new Blob(source, {'type': 'text/xml'}));
            const a = document.getElementById('download');
            a.setAttribute('href', url);
            a.setAttribute('download', 'xcom2-tech-tree.svg');
            a.style['display'] = 'none';
            a.click();

            setTimeout(() => 
                window.URL.revokeObjectURL(url)
            , 10);
        });


    d3.select('#export')
        .on('click', () => {
            const source = getCsv();
            const url = window.URL.createObjectURL(new Blob([source], {'type': 'text/csv'}));
            const a = document.getElementById('download');
            a.setAttribute('href', url);
            a.setAttribute('download', 'xcom2-tech-tree.csv');
            a.style['display'] = 'none';
            a.click();

            setTimeout(() =>
                window.URL.revokeObjectURL(url)
            , 10);
        });

    d3.select('#horizontal')
        .on('click', () => {
            HORIZONTAL = !HORIZONTAL;
            delayedUpdate();
        });

    d3.select('#shortcuts')
        .on('click', () => {
            TRUNCATE_PATHS = !TRUNCATE_PATHS;
            delayedUpdate();
        });
    
    d3.select("#all")
        .on("click", () => {
            TYPES.forEach(type => (DISABLED[type] = false));
            d3.select('svg.legend').selectAll(".node").classed('disabled', false);
            delayedUpdate();
        });

    d3.select("#none")
        .on("click", () => {
            TYPES.forEach(type => (DISABLED[type] = true));
            d3.select('svg.legend').selectAll(".node").classed('disabled', true);
            delayedUpdate();
        });
    
    d3.select("#dlc-wotc")
        .on("click", () => {
            DLC_ENABLED["wotc"] = !DLC_ENABLED["wotc"];
            INTEGRATED_DLC = DLC_ENABLED["wotc"] && d3.select("#dlc-integrated").property("checked");
            console.log("INTEGRATED DLC", INTEGRATED_DLC)
            d3.select("#integrated-dlc").classed("hide", !DLC_ENABLED["wotc"]);
            delayedUpdate();
        });

    d3.select("#dlc-ah")
        .on("click", () => {
            DLC_ENABLED["ah"] = !DLC_ENABLED["ah"];
            delayedUpdate();
        });

    d3.select("#dlc-slg")
        .on("click", () => {
            DLC_ENABLED["slg"] = !DLC_ENABLED["slg"];
            delayedUpdate();
        });

    d3.select("#dlc-tlp")
        .on("click", () => {
            DLC_ENABLED["tlp"] = !DLC_ENABLED["tlp"];
            delayedUpdate();
        });

    d3.select("#dlc-integrated")
        .on("click", () => {
            INTEGRATED_DLC = !INTEGRATED_DLC;
            updateTechTreeForDLC();
            updateHierarchy();
            delayedUpdate();
        });
}
