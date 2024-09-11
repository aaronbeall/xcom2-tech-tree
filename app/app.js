const DISABLED = {};
let LEGEND_GRAPH;
let INITIALIZED = false;
const RENDER = new dagreD3.render();
const SVG = d3.select('svg.chart');
const ROOT = SVG.select('g');
const TOOLTIP = d3.select('.tooltip');
const FILTER = d3.select('#filter');
let SHORTCUTS = true;
let HORIZONTAL = false;

const TYPE_INFO = {
    "building": { icon: "🏗️", name: "Building", description: "Avenger building" },
    "research": { icon: "🔬", name: "Research", description: "Researcg project" },
    "proving": { icon: "🧪", name: "Proving Grounds", description: "Proving Grounds project" },
    "item": { icon: "🔫", name: "Item", description: "Engineering item (weapon, utility, armor, etc)" },
    "drop": { icon: "🫳", name: "Drop", description: "Drop picked up in a mission" },
    "mission": { icon: "🧭", name: "Mission", description: "Mission" },
    "enhancement": { icon: "✨", name: "Enhancement", description: "Game mechanic enhancement" },
    "region": { icon: "📡", name: "Region", description: "Region unlocked on geoscape" },
    "skill": { icon: "🪖", name: "Skill", description: "GTS Skill" },
    "kill": { icon: "👽", name: "Kill", description: "Alien nuetralized during a mission" },
}
const TYPES = Object.keys(TYPE_INFO);

function run() {
    LEGEND_GRAPH = legend();
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
            const disabled = SHORTCUTS && item.disable;

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

    let filter = FILTER.node().value;

    filter = filter ? filter.toLowerCase() : null;

    XCOM_TECH_TREE.forEach(item => {
        item.hide = false;
        item.disable = DISABLED[item.type] || (filter && !(item.title.toLowerCase().indexOf(filter) > -1));
    });

    hide();
    chart();
}

function isVisible(item) {
    if (item.hide) {
        return false;
    }

    if (!item.children) {
        return !item.disable;
    }

    for (let i = 0; i < item.children.length; i++) {
        const child = item.children[i];

        if (isVisible(child)) {
            return true;
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

        for (let k in r) {
            text += '<tr>';
            text += '<th>' + k + '</th>';
            text += '<td>' + r[k].join('</td><td>') + '</td>';
            text += '</tr>';
        }

        text += '</table>';
    }

    return text;
}

function hideTooltip() {
    TOOLTIP
        .style('opacity', 0)
        .style('left', 0 + 'px')
        .style('top', 0 + 'px');
}

function tooltip() {
    d3.selectAll('svg.chart .node')
        .on('click', index => {
            const item = XCOM_TECH_TREE[index];
            FILTER.node().value = item.title;

            if (DISABLED[item.type]) {
                DISABLED[item.type] = false;
                setTimeout(legendStatus, 10);
            }

            delayedUpdate();
        })
        .on('mousemove', index => {
            const item = XCOM_TECH_TREE[index];

            item.table = item.table || getCostTable(item);

            TOOLTIP
                .attr('class', 'tooltip ' + item.type)
                .html('<b>' + item.title + '</b>' +
                    '<br>' +
                    '<i>' + TYPE_INFO[item.type].name + '</i>' +
                    (item.required ? '<hr>' +
                    '<table><tr><th>Required</th><td>' + item.required + '</td></tr></table>' : '') +
                    (item.table ? '<hr>' : '') +
                    item.table)
                .style('opacity', 1)
                .style('left', (d3.event.pageX + 28) + 'px')
                .style('top', (d3.event.pageY) + 'px');
        })
        .on('mouseout', hideTooltip);
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

        for (let k in a) {
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
            SHORTCUTS = !SHORTCUTS;
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
}
