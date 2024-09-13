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
    "item": { icon: "🔫", name: "Item", fullname: "Item" },
    "drop": { icon: "🫳", name: "Pickup", fullname: "Pickup from mission" },
    "mission": { icon: "🧭", name: "Mission", fullname: "Mission" },
    "enhancement": { icon: "✨", name: "Enhancement", fullname: "Game abilities/enhancement" },
    "region": { icon: "📡", name: "Region", fullname: "Scan revealed on geoscape" },
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

function getSpecsTable(specs) {
    return (`
        <table>
        ${ Object.keys(specs).map(key =>
            `<tr><th>${ key }:</th><td>${ specs[key] }</td></td>`
        ).join("") }
        </table>
    `);
}

function getCostTable(cost) {
    return (`
        <table>
            <tr><th>Cost:</th><td>${ cost.replace(/, /g, "<br>") }</td></tr>
        </table>
    `);
}

function getBuildingTable(item) {
    if (!item.power && !item.upkeep) return "";
    return (`
       <table>
        ${ item.power ? `<tr><th>Power:</th><td>⚡️ ${ item.power }</td></tr>` : "" }
        ${ item.upkeep ? `<tr><th>Upkeep:</th><td>${ item.upkeep }</td></tr>` : "" }
       </table> 
    `);
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

            TOOLTIP
                .attr("class", `tooltip ${ item.type }`)
                .html(`<b>${ item.title }</b>
                    <br>
                    <i>${ type.icon } ${ type.fullname } </i>
                    ${ dlc ? `<i>${ dlc.icon } ${ dlc.name } DLC</i>` : "" }
                    <small>
                    ${ item.specs ? `<hr>${ getSpecsTable(item.specs) }` : "" }
                    ${ item.required 
                        ? `<hr><table><tr><th>Required:</th><td>${ item.required }</td></tr></table>` 
                        : "" }
                    ${ item.costTable  ? `<hr>${ item.costTable }` : ""}
                    ${ item.cost ? `<hr>${ getCostTable(item.cost) }` : "" }
                    ${ item.type == "building" ? getBuildingTable(item) : "" }
                    ${ item.parent 
                        ?  `<hr><table><tr><th>Prerequisites:</th><td>${ 
                                item.parent.map(index => getItemTitle(XCOM_TECH_TREE[index])).join("") 
                            }</td></tr></table>` 
                        : "" }
                    ${ item.children 
                        ?  `<hr><table><tr><th>Unlocks:</th><td>${ 
                                item.children.map(child => getItemTitle(child)).join("") 
                            }</td></tr></table>` 
                        : "" }
                    <small><em>&lt;Click to filter, Double-click to open Wiki&gt;</em></small>
                    </small>`)
                .style("opacity", 1)
                .style("left", `${ d3.event.pageX + 28 }px`)
                .style("top", `${ d3.event.pageY }px`);
        })
        .on("mouseout", hideTooltip)
        .on("dblclick", index => {
            const item = XCOM_TECH_TREE[index];
            window.open(`https://duckduckgo.com/?q=%5C${ encodeURIComponent(`xcom.fandom.com ${ item.title }`) }&l=1`);
        });
}

function getItemTitle(item) {
    return `<span class="tag ${ item.type }">${ TYPE_INFO[item.type].icon } ${ item.title }</span>`;
}

function getCsv() {
    const headers = ["id", "title", "type"];

    const rows = XCOM_TECH_TREE
        .map(getRowValues)
        .map(encodeCsvValues);
    
    return [
        headers.join(","),
        ...rows
    ].join("\n");

    function getRowValues(item) {
       return Object.entries(item).reduce((row, [key, value]) => {
            setValueInRow(row, key, value, key);
            return row;
        }, []);
    }

    function setValueInRow(row, key, value, column) {
        switch (key) {
            // Create variant columns for WotC and Integrated DLC
            case "wotc":
            case "integrated":
                value.true && Object.keys(value.true).forEach(k => {
                    setValueInRow(row, k, value.true[k], `${ k } (${ key })`)
                });
                value.false && Object.keys(value.false).forEach(k => {
                    setValueInRow(row, k, value.false[k], k)
                });
                break;

            // Ignored
            case "children":
            case "hide":
            case "disable":
                break;

            // Populate column data in row
            default:
                if (!headers.includes(column)) headers.push(column);
                const colIndex = headers.indexOf(column);

                if (row[colIndex]) return; // DLC overrides take precedent

                switch (key) {
                    case "parent":
                        // Expand parent ids into names
                        row[colIndex] = value.map(index => XCOM_TECH_TREE[index].title).join(", ");
                        break
                    case "specs":
                        // Convert object into "key: value" list
                        row[colIndex] = Object.entries(value).map(([k, v]) => `${ k }: ${ v }`).join(", ");
                        break;
                    default:
                        row[colIndex] = value;
                        break;
                }
                break;
        }
    }
}

function encodeCsvValues(values) {
    return values.map(encodeCsvValue).join(",");
}

function encodeCsvValue(value) {
    // Per https://www.ietf.org/rfc/rfc4180.txt
    return `"${ String(value).replace(/"/g, `""`) }"`
}

function getJson() {
    const cleaned = XCOM_TECH_TREE.map(
        ({ hide, disable, children, ...cleaned }) => {
            Object.keys({ 
                ...cleaned.wotc && { ...cleaned.wotc.true, ...cleaned.wotc.false },
                ...cleaned.integrated && { ...cleaned.integrated.true, ...cleaned.integrated.false },
            }).forEach(key => {
                delete cleaned[key];
            });
            return cleaned;
        }
    );
    return JSON.stringify(cleaned, null, "  ");
}

function tools() {

    d3.select('#save-svg')
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


    d3.select('#save-csv')
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


    d3.select('#save-json')
        .on('click', () => {
            const source = getJson();
            const url = window.URL.createObjectURL(new Blob([source], {'type': 'application/json'}));
            const a = document.getElementById('download');
            a.setAttribute('href', url);
            a.setAttribute('download', 'xcom2-tech-tree.json');
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
