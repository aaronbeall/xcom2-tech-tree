var gulp = require('gulp');

gulp.task('data', function (done) {
    var fs = require('fs');
    var xml2js = require('xml2js');
    var parser = new xml2js.Parser({trim: true, mergeAttrs: true, explicitArray: false});

    fs.readFile('bower_components/XCom2TechTree/index.xml', function (err, data) {
        parser.parseString(data, function (err, result) {
            var optimized = optimizeItems(result);
            fs.writeFile('app/xcom-tech-tree.min.js',
                'var XCOM_TECH_TREE = ' + JSON.stringify(optimized, null, 0) + ';', done);
        });
    });
});

function optimizeItems(result) {
    var items = result.tree.items.item;
    var nameId = {};

    removeOrphans(items);

    items.forEach(function (i, index) {
        // remove "children" working attr
        delete i.children;

        // remove "title" HTML
        i.title = i.title.replace(/<br\/>/gi, ' ');

        // remove ending "(r)" from "title"
        i.title = i.title.replace(/ \(r\)$/gi, '');

        // humanize "title", sample "T5_M2_BroadcastTheTruth"
        i.title = i.title.replace(/.*_.*_(.*)/gi, '$1');
        i.title = i.title.replace(/([a-z])([A-Z])/g, '$1 $2');

        // remove ending bracketed note from "title"
        i.title = i.title.replace(/ \(.*\)/gi, '');

        // remove "name"
        nameId[i.name] = index;
        delete i.name;

        // fix "type" singular form
        i.type = i.type.replace(/s$/gi, '');

        // optimize "cost"
        if (i.cost) {
            var cost = [];

            i.cost.forEach(function (ci) {
                cost[ci.difficulty] = optimizeCostItems(ci.costItem[0] ? ci.costItem : [ci.costItem]);
            });

            i.cost = cost;

            var instantCost = optimizeInstantCost(cost);

            if (instantCost) {
                i.instantCost = instantCost;
            }
        }
    });

    // replace "parent" name with id
    items.forEach(function (i) {
        if (i.parent) {
            var parents = typeof i.parent === 'string' ? [i.parent] : i.parent;

            parents.forEach(function (p, i) {
                parents[i] = nameId[parents[i]];
            });

            i.parent = parents;
        }

    });

    return items;
}

function getItemId(items, title) {
    for (var i = 0; i < items.length; i++) {
        if (items[i].title === title) {
            return i;
        }
    }
}

function optimizeCostItems(costItems) {
    var obj = {};

    costItems.forEach(function (i) {
        var v = parseInt(i.value);

        obj[i.type] = (v.toString() === i.value) ? v : i.value;
    });

    return obj;
}

function optimizeInstantCost(costs) {
    var instantCost = [];

    costs.forEach(function (cost, difficulty) {
        for (var key in cost) {
            // sample: "1 (6 for Instant)"
            var rx = /(\d+) \((\d+) for Instant\)/gi;
            var match = rx.exec(cost[key]);

            if (match) {
                costs[difficulty][key] = parseInt(match[1]);
                instantCost[difficulty] = instantCost[difficulty] || {};
                instantCost[difficulty][key] = parseInt(match[2]);
            }
        }
    });

    return instantCost.length ? instantCost : null;
}

function removeOrphans(items) {
    items.forEach(function (i) {
        if (i.parent) {
            var parents = typeof i.parent === 'string' ? [i.parent] : i.parent;

            parents.forEach(function (parent) {
                var obj = getParent(items, parent);

                if (obj) {
                    obj.children = true;
                }
            });
        }
    });

    for (var i = 0; i < items.length; i++) {
        if (!items[i].children && !items[i].parent) {
            items.splice(i, 1);
            i--;
        }
    }
}

function getParent(items, parent) {
    for (var i = 0; i < items.length; i++) {
        if (items[i].name === parent) {
            return items[i];
        }
    }
}
