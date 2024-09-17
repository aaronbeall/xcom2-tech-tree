# XCOM 2 Tech Tree

Based on the excellent [XCOM 2 Tech Tree project from darosh](https://darosh.github.io/xcom2-tech-tree/). Updated to add all DLC content (War of the Chosen, Alien Hunters, Shen's Last Gift, and Tactical Legacy Pack).

[Live version](https://aaronbeall.github.io/xcom2-tech-tree/).

## Data

The data was orignally pulled from an [XML project](https://github.com/mstum/xcom2) that no longer exists, here the data is manually maintained in `xcom-tech-tree.min.js`. 

Data has been collected from a combination of the original forked project's data, [XCOM2 Fandom Wiki](https://xcom.fandom.com/wiki/XCOM_2), and other sources online. There were conflicts and some obvious errors in virtually all sources, what's here is a best attempt to merge them most accurately. Please report any errors, or even better save and modify the JSON data with corrections, and submit an issue.

## Development

### Install

```
npm install
```

### Publish

```
npm run pubish
```

### Deprecated

All the `gulp` and `bower` related stuff is no longer used.

### Todo

- [x] Sticky header
- [x] Complete all the resource costs, rework the difficulty breakdown to get rid of useless repeats and ?
- [ ] Hover a node to highlight its neighbor connections
- [x] Tooltip should say its prerequisites and unlocks (prev and next neighbors)
- [x] Tooltip should say what soldier class weapons belong to
- [ ] Show tooltip descriptions on legend items
- [x] Show DLC source on tooltips
- [ ] Fix Save SVG action
- [ ] Cleanup dead dev stuff
- [x] Handle Lost & Abandoned impact
- [ ] Re-sort data so it groups a little nicer?
- [x] Hide removed WotcC GTS skills when WotC is selected
- [x] Provide link to wiki for more details
- [x] Option to show successors on filtering
- [ ] Dark mode
- [x] Search details, not just title
- [ ] Add LW2 content 😳
- [ ] Some addition tooltip stuff: staffing, weapon abilities, building abilities
- [ ] Highlight search matches in text